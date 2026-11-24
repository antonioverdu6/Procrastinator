import json
import re
from typing import Any, Dict, List

from ..lib.json_utils import extract_json_block
from ..lib.llm_client import query_llm
from ..lib.task_normalizer import (
    VALID_DIFFICULTIES,
    VALID_PRIORITIES,
    normalize_proposed_tasks,
    normalize_subtasks,
)
from ..scheduler import get_settings
from .local_planner import (
    build_local_roadmap,
    build_local_task_edits,
    extract_project_meta_from_text,
    looks_like_project_breakdown_request,
    parse_capacity_command,
)
from .task_ai_service import breakdown_task_into_subtasks


def _build_llm_context_payload(context: Dict[str, Any], velocity: float) -> str:
    projects = context.get('projects', [])
    today_tasks = context.get('todayTasks', [])
    backlog_tasks = context.get('backlogTasks', [])
    daily_plan = context.get('dailyPlan', {})
    recent_messages = context.get('recentMessages', [])

    compact_projects = [
        {"id": p["id"], "name": p["name"], "description": (p.get("description") or "")[:120]}
        for p in projects[:12]
    ]
    compact_today = [
        {
            "id": t["id"],
            "projectId": t["projectId"],
            "epic": t.get("epic", "General"),
            "title": t["title"],
            "status": t["status"],
            "priority": t["priority"],
            "estimatedMinutes": t["estimatedMinutes"],
            "subtasksDone": len([s for s in t.get("subtasks", []) if s.get("done")]),
            "subtasksTotal": len(t.get("subtasks", [])),
        }
        for t in today_tasks[:12]
    ]
    compact_backlog = [
        {
            "id": t["id"],
            "projectId": t["projectId"],
            "epic": t.get("epic", "General"),
            "title": t["title"],
            "description": (t.get("description") or "")[:90],
            "priority": t["priority"],
            "estimatedMinutes": t["estimatedMinutes"],
            "subtasks": [s.get("title") for s in (t.get("subtasks") or [])[:5]],
        }
        for t in backlog_tasks[:30]
    ]
    history_snippet = [
        {"role": m["role"], "content": m["content"][:220]}
        for m in recent_messages[-6:]
    ]

    return (
        f"- Capacidad hoy: {daily_plan.get('totalCapacityMinutes', 150)} min | Velocidad histórica: {velocity}x\n"
        f"- Proyectos activos: {json.dumps(compact_projects, ensure_ascii=False)}\n"
        f"- Tareas de hoy: {json.dumps(compact_today, ensure_ascii=False)}\n"
        f"- Backlog pendiente: {json.dumps(compact_backlog, ensure_ascii=False)}\n"
        f"- Últimos mensajes: {json.dumps(history_snippet, ensure_ascii=False)}"
    )


COPILOT_SYSTEM_PROMPT = """Eres el Project Manager Técnico y Copiloto Anti-Procrastinación de la app Procrastinator.
Tienes control real sobre la planificación del usuario (como Jira / Azure DevOps pero en micro-bloques de 25-50 min).

Responde SIEMPRE con un único objeto JSON válido con esta estructura exacta (puedes dejar null o [] los campos opcionales que no apliquen):
{
  "reply": "Tu respuesta en español, directa, técnica, clara y motivadora.",
  "intent": "chat | adjust_capacity | propose_project | add_tasks | edit_tasks | breakdown_task",
  "capacityAdjustment": null,
  "tasksToCreate": [],
  "tasksToUpdate": [],
  "tasksToDelete": [],
  "projectUpdates": [],
  "subtasksToAttach": null,
  "planProposal": null,
  "suggestedActions": [
    {"label": "Texto corto del botón", "command": "Mensaje que enviará si pulsa el botón"}
  ]
}

CUÁNDO USAR CADA ACCIÓN:
1. Si el usuario describe un proyecto nuevo, app, plataforma o pide desglosar un proyecto:
   - "intent": "propose_project" y rellena "planProposal" con projectName, projectDescription, targetHours, scope y tasks (8 a 18 tareas agrupadas por epic con 3-4 subtasks cada una).
2. Si pide añadir tareas a un proyecto YA EXISTENTE en projects:
   - "intent": "add_tasks" y rellena "tasksToCreate" con projectId, epic, title, description, estimatedMinutes, priority, difficulty, subtasks.
3. Si pide EDITAR, CAMBIAR DE TECNOLOGÍA, REESCRIBIR o ELIMINAR tareas YA EXISTENTES en todayTasks o backlogTasks:
   - "intent": "edit_tasks".
   - Usa "tasksToUpdate": [{"id": "task-...", "title": "...", "description": "...", "epic": "...", "estimatedMinutes": 40, "priority": "...", "subtasks": [{"title": "..."}]}] (incluye solo los campos que cambian, siempre con el "id" real).
   - Usa "tasksToDelete": ["task-..."] solo si pide quitar tareas obsoletas.
   - Usa "projectUpdates": [{"id": "proj-...", "description": "..."}] si cambia el stack/enfoque del proyecto.
4. Si pide desglosar una tarea YA EXISTENTE en todayTasks o backlogTasks:
   - "intent": "breakdown_task" y rellena "subtasksToAttach": {"taskId": "...", "subtasks": [{"title": "..."}]}.
5. Si pide cambiar tiempo disponible hoy ("+1h", "solo tengo 2h"):
   - "intent": "adjust_capacity" y rellena "capacityAdjustment": {"deltaMinutes": 60, "isAbsolute": false, "note": "..."}.
6. Si es duda técnica, bloqueo o "¿por dónde empiezo?":
   - "intent": "chat", cita tareas reales y da pasos accionables."""


def _parse_llm_copilot_response(
    data: Dict[str, Any],
    msg_text: str,
    projects: List[Dict[str, Any]],
    all_tasks: List[Dict[str, Any]],
    cap_cmd,
    velocity: float,
) -> Dict[str, Any]:
    cap_adj = data.get("capacityAdjustment")
    if not cap_adj and cap_cmd:
        cap_adj = {"deltaMinutes": cap_cmd[0], "isAbsolute": cap_cmd[1], "note": cap_cmd[2]}

    plan_prop = data.get("planProposal")
    if isinstance(plan_prop, dict) and plan_prop.get("tasks"):
        norm_tasks = normalize_proposed_tasks(plan_prop.get("tasks", []), velocity)
        calc_hours = max(1.0, round(sum(t["estimatedMinutes"] for t in norm_tasks) / 60, 1))
        plan_prop = {
            "projectName": str(plan_prop.get("projectName") or "Nuevo Proyecto"),
            "projectDescription": str(plan_prop.get("projectDescription") or msg_text),
            "targetHours": calc_hours,
            "scope": str(plan_prop.get("scope") or "standard"),
            "tasks": norm_tasks,
            "applied": False,
            "createdProjectId": None,
        }
    else:
        plan_prop = None

    tasks_to_create = []
    valid_proj_ids = {p["id"] for p in projects}
    default_proj_id = projects[0]["id"] if projects else None
    for item in (data.get("tasksToCreate") or []):
        if not isinstance(item, dict) or not item.get("title"):
            continue
        pid = item.get("projectId") if item.get("projectId") in valid_proj_ids else default_proj_id
        if not pid:
            continue
        norm = normalize_proposed_tasks([item], velocity)[0]
        norm["projectId"] = pid
        tasks_to_create.append(norm)

    subtasks_attach = data.get("subtasksToAttach")
    if isinstance(subtasks_attach, dict) and subtasks_attach.get("taskId") and subtasks_attach.get("subtasks"):
        subtasks_attach = {
            "taskId": str(subtasks_attach["taskId"]),
            "subtasks": normalize_subtasks(subtasks_attach["subtasks"], prefix=f"{subtasks_attach['taskId']}-sub"),
        }
    else:
        subtasks_attach = None

    valid_task_ids = {t["id"] for t in all_tasks}
    tasks_to_update = []
    for item in (data.get("tasksToUpdate") or []):
        if not isinstance(item, dict) or item.get("id") not in valid_task_ids:
            continue
        upd: Dict[str, Any] = {"id": str(item["id"])}
        if item.get("title"):
            upd["title"] = str(item["title"]).strip()
        if "description" in item and item["description"] is not None:
            upd["description"] = str(item["description"]).strip()
        if item.get("epic"):
            upd["epic"] = str(item["epic"]).strip()
        if item.get("estimatedMinutes") is not None:
            try:
                upd["estimatedMinutes"] = max(15, min(120, int(item["estimatedMinutes"])))
            except Exception:
                pass
        if isinstance(item.get("priority"), str) and item["priority"].lower() in VALID_PRIORITIES:
            upd["priority"] = item["priority"].lower()
        if isinstance(item.get("difficulty"), str) and item["difficulty"].lower() in VALID_DIFFICULTIES:
            upd["difficulty"] = item["difficulty"].lower()
        if isinstance(item.get("subtasks"), list):
            upd["subtasks"] = normalize_subtasks(item["subtasks"], prefix=f"{upd['id']}-sub")
        if len(upd) > 1:
            tasks_to_update.append(upd)

    tasks_to_delete = [
        str(tid) for tid in (data.get("tasksToDelete") or [])
        if str(tid) in valid_task_ids
    ]

    project_updates = [
        {"id": str(pu["id"]), "description": str(pu["description"])}
        for pu in (data.get("projectUpdates") or [])
        if isinstance(pu, dict) and pu.get("id") in valid_proj_ids and pu.get("description") is not None
    ]

    suggested = [
        {"label": str(s["label"]), "command": str(s["command"])}
        for s in (data.get("suggestedActions") or [])[:4]
        if isinstance(s, dict) and s.get("label") and s.get("command")
    ]

    return {
        "content": str(data["reply"]),
        "capacityAdjustment": cap_adj,
        "tasksToCreate": tasks_to_create,
        "tasksToUpdate": tasks_to_update,
        "tasksToDelete": tasks_to_delete,
        "projectUpdates": project_updates,
        "subtasksToAttach": subtasks_attach,
        "planProposal": plan_prop,
        "suggestedActions": suggested,
    }


async def handle_copilot_chat(
    msg_text: str,
    context: Dict[str, Any],
    velocity: float = 1.0,
) -> Dict[str, Any]:
    """Orquesta al Copiloto PM con capacidades de planificación, desglose y ajuste de jornada."""
    lower = msg_text.lower()
    projects = context.get('projects', [])
    today_tasks = context.get('todayTasks', [])
    backlog_tasks = context.get('backlogTasks', [])
    all_tasks = context.get('allTasks', today_tasks + backlog_tasks)
    daily_plan = context.get('dailyPlan', {})

    cap_cmd = parse_capacity_command(lower)

    settings = get_settings()
    if settings.get('apiKey', '').strip():
        try:
            ctx_block = _build_llm_context_payload(context, velocity)
            note = f'\nNota: el parser detectó posible ajuste de capacidad: {cap_cmd[2]}' if cap_cmd else ''
            user_prompt = f"Contexto actual del desarrollador:\n{ctx_block}\n\nMensaje actual del usuario:\n\"{msg_text}\"{note}"
            raw = await query_llm(user_prompt, COPILOT_SYSTEM_PROMPT, max_tokens=4096)
            data = extract_json_block(raw, expect_array=False)
            if isinstance(data, dict) and data.get("reply"):
                return _parse_llm_copilot_response(data, msg_text, projects, all_tasks, cap_cmd, velocity)
        except Exception:
            pass

    # Fallback local determinístico
    if cap_cmd:
        return {
            "content": f"⚡ {cap_cmd[2]}. He recalculado tu cola de hoy con prioridad en tus tareas clave para mantener el foco sin agobios.",
            "capacityAdjustment": {"deltaMinutes": cap_cmd[0], "isAbsolute": cap_cmd[1], "note": cap_cmd[2]},
            "tasksToCreate": [],
            "tasksToUpdate": [],
            "tasksToDelete": [],
            "projectUpdates": [],
            "subtasksToAttach": None,
            "planProposal": None,
            "suggestedActions": [
                {"label": "¿Por dónde empiezo?", "command": "¿Cuál es mi tarea prioritaria de hoy?"},
                {"label": "Planificar proyecto", "command": "Quiero crear un nuevo proyecto de API REST con React"},
            ],
        }

    local_edits = build_local_task_edits(msg_text, projects, all_tasks)
    if local_edits:
        return {
            "content": local_edits["content"],
            "capacityAdjustment": None,
            "tasksToCreate": [],
            "tasksToUpdate": local_edits["tasksToUpdate"],
            "tasksToDelete": local_edits["tasksToDelete"],
            "projectUpdates": local_edits["projectUpdates"],
            "subtasksToAttach": None,
            "planProposal": None,
            "suggestedActions": [
                {"label": "¿Qué tengo hoy?", "command": "¿Cuál es mi tarea prioritaria de hoy?"},
            ],
        }

    if looks_like_project_breakdown_request(msg_text):
        proj_name, target_hours, scope = extract_project_meta_from_text(msg_text)
        proposed = build_local_roadmap(proj_name, msg_text, target_hours, velocity, scope)
        epics_count = len({t['epic'] for t in proposed})
        total_mins = sum(t['estimatedMinutes'] for t in proposed)
        calc_hours = max(1.0, round(total_mins / 60, 1))
        return {
            "content": (
                f"He desglosado **{proj_name}** al estilo Jira en **{epics_count} épicas/módulos** y **{len(proposed)} tareas** "
                f"(meta calculada por el PM: **{calc_hours}h**, con subtareas incluidas en cada ticket).\n\n"
                f"Revisa la propuesta debajo: puedes crear el proyecto y volcar todo al backlog en un clic, o abrirlo en el **Planificador** para editar cada módulo."
            ),
            "capacityAdjustment": None,
            "tasksToCreate": [],
            "subtasksToAttach": None,
            "planProposal": {
                "projectName": proj_name,
                "projectDescription": msg_text,
                "targetHours": calc_hours,
                "scope": scope,
                "tasks": proposed,
                "applied": False,
                "createdProjectId": None,
            },
            "suggestedActions": [],
        }

    if any(k in lower for k in ['añade tarea', 'crea tarea', 'crear tarea', 'añade una tarea', 'agrega tarea']) and projects:
        target_proj = next((p for p in projects if p['name'].lower() in lower), projects[0])
        clean_title = re.sub(
            r'^.*?(?:añade|crea|crear|agrega)\s+(?:una\s+)?tarea\s*(?:de|para|:)?\s*',
            '',
            msg_text,
            flags=re.IGNORECASE,
        ).strip() or "Nueva tarea desde Copiloto"
        subtasks = normalize_subtasks([
            f"Definir entradas y casos base para {clean_title}",
            "Implementar módulo principal",
            "Probar y verificar funcionamiento",
        ], prefix="chat-sub")
        return {
            "content": f"📋 He creado la tarea **\"{clean_title}\"** en **{target_proj['name']}** con 3 subtareas listas para ejecutar.",
            "capacityAdjustment": None,
            "tasksToCreate": [{
                "projectId": target_proj["id"],
                "epic": "Backlog Rápido",
                "title": clean_title[0].upper() + clean_title[1:],
                "description": "Creada desde Copiloto PM.",
                "estimatedMinutes": 40,
                "priority": "high",
                "difficulty": "medium",
                "subtasks": subtasks,
            }],
            "subtasksToAttach": None,
            "planProposal": None,
            "suggestedActions": [{"label": "¿Qué tengo hoy?", "command": "¿Cuál es mi tarea prioritaria de hoy?"}],
        }

    if any(k in lower for k in ['empiezo', 'foco', 'prioritaria', 'hoy', 'tengo pendiente', 'desglosa la tarea', 'qué hago', 'que hago']):
        pending_today = [t for t in today_tasks if t['status'] != 'completed']
        if pending_today:
            top = next((t for t in pending_today if t['status'] == 'in_progress'), pending_today[0])
            subs = top.get('subtasks') or []
            if not subs and any(k in lower for k in ['desglosa', 'pasos', 'qué hago', 'que hago']):
                proj = next((p for p in projects if p['id'] == top['projectId']), None)
                gen_subs = await breakdown_task_into_subtasks(top, proj)
                steps_txt = "\n".join([f"  - {s['title']}" for s in gen_subs])
                return {
                    "content": f"🎯 Tu prioridad ahora es **\"{top['title']}\"** ({top['estimatedMinutes']} min, módulo *{top.get('epic', 'General')}*).\n\nHe guardado su desglose paso a paso:\n{steps_txt}",
                    "capacityAdjustment": None,
                    "tasksToCreate": [],
                    "subtasksToAttach": {"taskId": top["id"], "subtasks": gen_subs},
                    "planProposal": None,
                    "suggestedActions": [{"label": "+1h extra hoy", "command": "Tengo 1 hora extra hoy"}],
                }
            subs_info = (
                f" Tiene **{len(subs)} subtareas** definidas."
                if subs
                else " Pulsa **'¿Qué tengo que hacer?'** en el cronómetro o dime *'desglosa la tarea'*."
            )
            return {
                "content": (
                    f"🚀 Empieza por **\"{top['title']}\"** ({top['estimatedMinutes']} min, prioridad **{top['priority']}**, épica *{top.get('epic', 'General')}*)."
                    f"{subs_info}\n\nTienes {len(pending_today)} tareas en la cola de hoy (capacidad total: {daily_plan.get('totalCapacityMinutes', 150)}m)."
                ),
                "capacityAdjustment": None,
                "tasksToCreate": [],
                "subtasksToAttach": None,
                "planProposal": None,
                "suggestedActions": [
                    {"label": "Desglosar esta tarea", "command": "Desglosa la tarea prioritaria de hoy en subtareas"},
                    {"label": "+1h extra hoy", "command": "Tengo 1 hora extra hoy"},
                ],
            }
        if backlog_tasks:
            top_b = backlog_tasks[0]
            return {
                "content": f"No tienes tareas pendientes hoy, pero en tu backlog espera **\"{top_b['title']}\"** ({top_b['estimatedMinutes']}m). Puedes añadir +1h extra para traerla a hoy o contarme un nuevo proyecto para desglosarlo.",
                "capacityAdjustment": None,
                "tasksToCreate": [],
                "subtasksToAttach": None,
                "planProposal": None,
                "suggestedActions": [
                    {"label": "Traer tareas (+1h)", "command": "Tengo 1 hora extra hoy"},
                    {"label": "Planificar proyecto", "command": "Desglósame una app de gestión de gastos con FastAPI y React"},
                ],
            }

    return {
        "content": (
            "Soy tu **Project Manager Copiloto**. Ahora puedo hacer 4 cosas por ti:\n"
            "1. **Desglosar un proyecto completo** por Épicas y subtareas (ej: *\"Desglósame un SaaS de reservas con React y FastAPI de 20h\"*).\n"
            "2. **Añadir tareas** a un proyecto existente (ej: *\"Añade tarea de exportar PDF\"*).\n"
            "3. **Desglosar tu tarea activa** en pasos concretos (*\"Desglosa la tarea de hoy\"*).\n"
            "4. **Ajustar tu jornada** (*\"+1h extra\"*, *\"Hoy solo tengo 90 minutos\"*)."
        ),
        "capacityAdjustment": None,
        "tasksToCreate": [],
        "subtasksToAttach": None,
        "planProposal": None,
        "suggestedActions": [
            {"label": "¿Por dónde empiezo?", "command": "¿Cuál es mi tarea prioritaria de hoy?"},
            {"label": "Ejemplo de proyecto", "command": "Desglósame una plataforma de reservas con pagos Stripe, auth y panel admin (20h)"},
        ],
    }
