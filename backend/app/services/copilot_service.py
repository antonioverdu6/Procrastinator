import json
import re
from typing import Any, Dict, List

from ..lib.json_utils import extract_json_block
from ..lib.llm_client import query_llm
from ..lib.repo_reader import fetch_repo_context
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


def _build_llm_context_payload(
    msg_text: str,
    context: Dict[str, Any],
    velocity: float,
    repo_summary: str = '',
) -> str:
    lower = msg_text.lower()
    projects = context.get('projects', [])
    today_tasks = context.get('todayTasks', [])
    backlog_tasks = context.get('backlogTasks', [])
    all_tasks = context.get('allTasks', today_tasks + backlog_tasks)
    daily_plan = context.get('dailyPlan', {})
    recent_messages = context.get('recentMessages', [])

    is_new_project_req = looks_like_project_breakdown_request(msg_text)
    needs_subtasks = any(k in lower for k in ('cambia', 'edita', 'migra', 'sustituye', 'subtarea', 'desglosa', 'quita', 'elimina'))

    proj_lines = []
    for p in projects[:10]:
        p_tasks = [t for t in all_tasks if t.get('projectId') == p['id']]
        done_c = len([t for t in p_tasks if t.get('status') == 'completed'])
        epics = ",".join(sorted({t.get('epic') or 'General' for t in p_tasks})[:8])
        desc = (p.get('description') or '')[:180]
        proj_lines.append(f"{p['id']}|{p['name']}|{done_c}/{len(p_tasks)}|epics:{epics}|{desc}")

    lines = [
        f"Capacidad:{daily_plan.get('totalCapacityMinutes', 150)}m | Velocidad:{velocity}x",
        "PROYECTOS(id|nombre|hechas|epics|desc):\n" + ("\n".join(proj_lines) or "ninguno"),
    ]

    if not is_new_project_req:
        today_lines = [
            f"{t['id']}|{t['projectId']}|{t.get('epic','General')}|{t['status']}|{t['priority']}|{t['estimatedMinutes']}m|{t['title']}"
            for t in today_tasks[:8]
        ]
        backlog_lines = []
        for t in backlog_tasks[:18]:
            sub_str = f"|subs:[{','.join(s.get('title','') for s in (t.get('subtasks') or [])[:3])}]" if needs_subtasks else ""
            backlog_lines.append(
                f"{t['id']}|{t['projectId']}|{t.get('epic','General')}|{t['priority']}|{t['estimatedMinutes']}m|{t['title']}{sub_str}"
            )
        lines.append("HOY:\n" + ("\n".join(today_lines) or "vacio"))
        lines.append("BACKLOG:\n" + ("\n".join(backlog_lines) or "vacio"))

    hist_lines = [f"{m['role']}:{m['content'][:140]}" for m in recent_messages[-4:]]
    if hist_lines:
        lines.append("HISTORIAL:\n" + "\n".join(hist_lines))
    if repo_summary:
        lines.append(f"REPO: {repo_summary}")

    return "\n".join(lines)


COPILOT_SYSTEM_PROMPT = """Eres el PM Técnico Copiloto de Procrastinator (bloques 25-50m estilo Jira).
Responde SOLO JSON válido:
{"reply":"respuesta en español","intent":"chat|adjust_capacity|propose_project|add_tasks|edit_tasks|breakdown_task","capacityAdjustment":null,"tasksToCreate":[],"tasksToUpdate":[],"tasksToDelete":[],"projectUpdates":[],"subtasksToAttach":null,"planProposal":null,"suggestedActions":[{"label":"botón","command":"mensaje"}]}
Reglas:
- Proyecto nuevo -> intent:"propose_project", planProposal:{projectName,projectDescription,targetHours,scope,tasks:[{id,epic,title,description,estimatedMinutes,priority,difficulty,subtasks:[{title}]}]} (8-16 tareas).
- Añadir a proyecto existente -> intent:"add_tasks", tasksToCreate:[{projectId,epic,title,description,estimatedMinutes,priority,difficulty,subtasks}].
- Editar/migrar/borrar existentes -> intent:"edit_tasks", tasksToUpdate:[{id,...campos}], tasksToDelete:[id], projectUpdates:[{id,description}].
- Desglosar tarea -> intent:"breakdown_task", subtasksToAttach:{taskId,subtasks:[{title}]}.
- Cambiar tiempo hoy -> intent:"adjust_capacity", capacityAdjustment:{deltaMinutes,isAbsolute,note}.
- Dudas/resumen proyecto -> intent:"chat", cita datos reales."""


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


def _looks_like_project_overview_question(lower: str) -> bool:
    triggers = [
        'de qué va', 'de que va', 'qué es mi proyecto', 'que es mi proyecto',
        'explícame mi proyecto', 'explicame mi proyecto', 'explícame el proyecto',
        'explicame el proyecto', 'qué proyectos', 'que proyectos', 'mis proyectos',
        'resumen del proyecto', 'resume el proyecto', 'resume mi proyecto',
        'estado del proyecto', 'qué módulos tiene', 'que modulos tiene',
        'cuántas tareas', 'cuantas tareas', 'sobre mi proyecto',
        'what my project is about', 'about my project', 'project summary', 'my projects',
    ]
    return any(t in lower for t in triggers)


async def _build_local_project_overview(
    msg_text: str,
    projects: List[Dict[str, Any]],
    all_tasks: List[Dict[str, Any]],
    github_token: str = '',
) -> Dict[str, Any]:
    if not projects:
        return {
            "content": "Todavía no tienes ningún proyecto creado. Dime qué quieres construir (o usa **Proyectos & Backlog → Nuevo Proyecto**) y lo desglosamos por épicas y subtareas.",
            "suggestedActions": [
                {"label": "Planificar proyecto", "command": "Desglósame una app web de gestión con FastAPI y React"}
            ],
        }

    lower = msg_text.lower()
    mentioned = [p for p in projects if p['name'].lower() in lower]
    targets = mentioned if mentioned else projects[:3]

    sections: List[str] = []
    for proj in targets:
        p_tasks = [t for t in all_tasks if t.get('projectId') == proj['id']]
        done_count = len([t for t in p_tasks if t.get('status') == 'completed'])
        pending = [t for t in p_tasks if t.get('status') != 'completed']
        est_hours = round(sum(t.get('estimatedMinutes', 0) for t in p_tasks) / 60, 1)
        epics = sorted({t.get('epic') or 'General' for t in p_tasks})

        lines = [f"📁 **{proj['name']}** ({done_count}/{len(p_tasks)} tareas hechas, ~{est_hours}h totales):"]
        if proj.get('description'):
            lines.append(f"• Descripción: {proj['description']}")
        if epics:
            lines.append(f"• Épicas / Módulos: {', '.join(epics)}")
        if pending:
            top_titles = ", ".join(f"*{t['title']}*" for t in pending[:4])
            lines.append(f"• Próximas tareas pendientes: {top_titles}" + (f" (y {len(pending) - 4} más)" if len(pending) > 4 else ""))

        if proj.get('repoUrl'):
            repo_ctx = await fetch_repo_context(proj['repoUrl'], query_text=msg_text, github_token=github_token)
            if repo_ctx.get('connected'):
                lang = repo_ctx.get('language') or 'código'
                sample = ", ".join(f"`{f}`" for f in repo_ctx.get('treePreview', [])[:6])
                lines.append(f"• Repo vinculado (`{repo_ctx.get('repoLabel')}`, {lang}, {repo_ctx.get('filesCount')} archivos): {sample}")

        sections.append("\n".join(lines))

    if len(projects) > len(targets) and not mentioned:
        sections.append(f"*Tienes {len(projects)} proyectos en total. Puedes preguntarme por el nombre de cualquiera en concreto.*")

    return {
        "content": "\n\n".join(sections),
        "suggestedActions": [
            {"label": "¿Por dónde empiezo?", "command": "¿Cuál es mi tarea prioritaria de hoy?"},
            {"label": "+1h extra hoy", "command": "Tengo 1 hora extra hoy"},
        ],
    }


async def handle_copilot_chat(
    msg_text: str,
    context: Dict[str, Any],
    velocity: float = 1.0,
) -> Dict[str, Any]:
    """Orquesta al Copiloto PM con capacidades de planificación, edición, desglose y ajuste de jornada."""
    lower = msg_text.lower()
    projects = context.get('projects', [])
    today_tasks = context.get('todayTasks', [])
    backlog_tasks = context.get('backlogTasks', [])
    all_tasks = context.get('allTasks', today_tasks + backlog_tasks)
    daily_plan = context.get('dailyPlan', {})

    cap_cmd = parse_capacity_command(lower)

    # Ahorro 100% de tokens en comandos puros y cortos de ajuste de jornada ("+1h extra", "Solo 1h hoy")
    if cap_cmd and len(msg_text.strip()) <= 45:
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
                {"label": "Planificar proyecto", "command": "Desglósame un nuevo proyecto de API REST con React"},
            ],
        }

    settings = get_settings()
    github_token = settings.get('githubToken', '')

    if settings.get('apiKey', '').strip():
        try:
            repo_summary = ''
            target_for_repo = next((p for p in projects if p['name'].lower() in lower), None)
            if not target_for_repo and _looks_like_project_overview_question(lower):
                target_for_repo = next((p for p in projects if p.get('repoUrl')), None)
            if target_for_repo and target_for_repo.get('repoUrl'):
                repo_ctx = await fetch_repo_context(
                    target_for_repo['repoUrl'],
                    query_text=msg_text,
                    github_token=github_token,
                )
                if repo_ctx.get('connected'):
                    repo_summary = (
                        f"{repo_ctx.get('repoLabel')} ({repo_ctx.get('filesCount')} arch): "
                        + ", ".join(repo_ctx.get('treePreview', [])[:25])
                    )

            ctx_block = _build_llm_context_payload(msg_text, context, velocity, repo_summary=repo_summary)
            note = f'\nAjuste detectado: {cap_cmd[2]}' if cap_cmd else ''
            lang = settings.get('language', 'es')
            lang_rule = '\nIdioma obligatorio de respuesta ("reply"): English.' if lang == 'en' else '\nIdioma obligatorio de respuesta ("reply"): Español.'
            user_prompt = f"{ctx_block}\nMensaje:\"{msg_text}\"{note}{lang_rule}"
            max_out = 2400 if looks_like_project_breakdown_request(msg_text) else 1200
            raw = await query_llm(user_prompt, COPILOT_SYSTEM_PROMPT, max_tokens=max_out, json_mode=True)
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

    if _looks_like_project_overview_question(lower):
        overview = await _build_local_project_overview(msg_text, projects, all_tasks, github_token=github_token)
        return {
            "content": overview["content"],
            "capacityAdjustment": None,
            "tasksToCreate": [],
            "tasksToUpdate": [],
            "tasksToDelete": [],
            "projectUpdates": [],
            "subtasksToAttach": None,
            "planProposal": None,
            "suggestedActions": overview["suggestedActions"],
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
            "Soy tu **Project Manager Copiloto**. Ahora puedo hacer 6 cosas por ti:\n"
            "1. **Resumir tus proyectos y su estado** (ej: *\"¿De qué va mi proyecto?\"*).\n"
            "2. **Desglosar un proyecto completo** por Épicas y subtareas (ej: *\"Desglósame un SaaS de reservas con React y FastAPI\"*).\n"
            "3. **Editar o migrar tareas ya creadas** (ej: *\"Cambia Prisma por SQLAlchemy\"* o *\"Elimina las tareas de Stripe\"*).\n"
            "4. **Añadir tareas** a un proyecto existente (ej: *\"Añade tarea de exportar PDF\"*).\n"
            "5. **Desglosar tu tarea activa** en pasos concretos (*\"Desglosa la tarea de hoy\"*).\n"
            "6. **Ajustar tu jornada** (*\"+1h extra\"*, *\"Hoy solo tengo 90 minutos\"*)."
        ),
        "capacityAdjustment": None,
        "tasksToCreate": [],
        "tasksToUpdate": [],
        "tasksToDelete": [],
        "projectUpdates": [],
        "subtasksToAttach": None,
        "planProposal": None,
        "suggestedActions": [
            {"label": "¿De qué va mi proyecto?", "command": "Dime de qué va mi proyecto"},
            {"label": "¿Por dónde empiezo?", "command": "¿Cuál es mi tarea prioritaria de hoy?"},
            {"label": "Ejemplo de proyecto", "command": "Desglósame una plataforma de reservas con pagos Stripe, auth y panel admin"},
        ],
    }
