import json
from typing import Any, Dict, List, Optional

from ..lib.db_helpers import get_project_tasks_summary
from ..lib.json_utils import extract_json_block
from ..lib.llm_client import query_llm
from ..lib.repo_reader import fetch_repo_context
from ..lib.task_normalizer import VALID_PRIORITIES, normalize_subtasks
from ..scheduler import get_settings


def _build_project_and_repo_context_block(
    task: Dict[str, Any],
    project: Optional[Dict[str, Any]],
    sibling_tasks: List[Dict[str, Any]],
    repo_ctx: Dict[str, Any],
) -> str:
    siblings_txt = json.dumps(
        [
            {"epic": s.get("epic"), "title": s.get("title"), "status": s.get("status")}
            for s in sibling_tasks[:15]
        ],
        ensure_ascii=False,
    )
    repo_block = "Sin repositorio vinculado."
    if repo_ctx.get("connected"):
        tree_str = ", ".join(repo_ctx.get("treePreview", [])[:60])
        snippets_str = "\n\n".join(
            f"--- ARCHIVO: {fs['path']} ---\n{fs['content']}"
            for fs in repo_ctx.get("fileSnippets", [])
        )
        repo_block = (
            f"Repositorio: {repo_ctx.get('repoLabel')} (rama: {repo_ctx.get('defaultBranch')}, lenguaje: {repo_ctx.get('language')})\n"
            f"Árbol de archivos ({repo_ctx.get('filesCount')}): {tree_str}\n\n"
            f"Fragmentos de código relevantes:\n{snippets_str}"
        )

    return f"""PROYECTO:
- Nombre: "{project.get('name', 'General') if project else 'General'}"
- Descripción: "{project.get('description', '') if project else ''}"
- Tareas hermanas en este proyecto (contexto de arquitectura/progreso): {siblings_txt}

TAREA ACTIVA:
- Épica / Módulo: "{task.get('epic', 'General')}"
- Título: "{task.get('title')}"
- Descripción: "{task.get('description', '')}"
- Subtareas actuales: {json.dumps([s.get('title') for s in (task.get('subtasks') or [])], ensure_ascii=False)}
- Tiempo estimado: {task.get('estimatedMinutes', 45)} min

CÓDIGO / ESTRUCTURA DEL REPOSITORIO:
{repo_block}"""


async def get_task_action_plan(task: Dict[str, Any], project: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Genera una guía técnica profunda paso a paso con contexto del proyecto y repo GitHub."""
    sibling_tasks = get_project_tasks_summary(task['projectId'], exclude_task_id=task['id'])
    settings = get_settings()
    query_text = f"{task.get('title', '')} {task.get('description', '')} {task.get('epic', '')}"
    repo_ctx = await fetch_repo_context(
        project.get('repoUrl') if project else '',
        query_text=query_text,
        github_token=settings.get('githubToken', ''),
    )

    context_block = _build_project_and_repo_context_block(task, project, sibling_tasks, repo_ctx)
    prompt = f"""Actúa como Staff Software Engineer y Tech Lead.
El programador necesita resolver esta tarea SIN bloqueos y con criterio técnico real:

{context_block}

Explica CONCRETAMENTE cómo resolver el problema (flujo de datos, contratos/tipos, validaciones, qué reutilizar del repo si hay archivos disponibles) y da un ejemplo o esqueleto útil en `quickSnippet`.
Responde EXCLUSIVAMENTE con un JSON válido:
{{
  "summary": "Enfoque técnico directo en 1-2 frases.",
  "architectureNotes": "Explicación concreta de cómo resolverlo: flujo entre capas, datos de entrada/salida, casos borde y cómo encaja con el proyecto.",
  "steps": [
    "1. ...",
    "2. ...",
    "3. ...",
    "4. ..."
  ],
  "filesToTouch": ["rutas reales del repo si existen o rutas sugeridas"],
  "pitfall": "Error técnico concreto donde suele perderse tiempo en esta tarea.",
  "quickSnippet": "// Código o firma inicial concreta (máx 15 líneas)"
}}"""

    try:
        raw = await query_llm(prompt, "Staff Software Engineer pragmático y directo.", max_tokens=2200)
        data = extract_json_block(raw, expect_array=False)
        if isinstance(data, dict) and data.get("steps"):
            return {
                "summary": str(data.get("summary", "")),
                "architectureNotes": str(data.get("architectureNotes", "")),
                "steps": [str(s) for s in data.get("steps", [])],
                "filesToTouch": [str(f) for f in data.get("filesToTouch", [])],
                "pitfall": str(data.get("pitfall", "")),
                "quickSnippet": str(data.get("quickSnippet", "")),
                "repoContextUsed": bool(repo_ctx.get("connected")),
                "repoLabel": repo_ctx.get("repoLabel") if repo_ctx.get("connected") else None,
            }
    except Exception:
        pass

    existing_subtasks = task.get('subtasks') or []
    fallback_steps = (
        [f"{i + 1}. {s.get('title')}" for i, s in enumerate(existing_subtasks) if s.get('title')]
        if existing_subtasks
        else [
            f"1. Definir modelos/contratos de entrada y salida para '{task.get('title')}'.",
            "2. Implementar la función/endpoint/componente del caso principal reutilizando helpers existentes.",
            "3. Añadir validación de errores, estados límite y persistencia.",
            "4. Probar el flujo completo y verificar que compila sin errores.",
        ]
    )

    repo_files = [fs["path"] for fs in repo_ctx.get("fileSnippets", [])] or repo_ctx.get("treePreview", [])[:4]
    done_siblings = [s["title"] for s in sibling_tasks if s.get("status") == "completed"][:3]
    arch_parts = [
        f"Encaja dentro de la épica '{task.get('epic', 'General')}' del proyecto '{project.get('name', 'General') if project else 'General'}'."
    ]
    if done_siblings:
        arch_parts.append(f"Ya tienes resuelto previamente: {', '.join(done_siblings)}.")
    if repo_ctx.get("connected"):
        arch_parts.append(
            f"En tu repo {repo_ctx.get('repoLabel')} ({repo_ctx.get('language') or 'código'}) los archivos más cercanos por nombre son: {', '.join(repo_files[:3])}."
        )
    else:
        arch_parts.append("Consejo: divide la solución en contrato de datos -> lógica pura -> conexión con API/UI -> validación de errores.")

    return {
        "summary": f"Plan técnico para '{task.get('title')}' ({task.get('estimatedMinutes', 45)}m) conectado al contexto de tu proyecto.",
        "architectureNotes": " ".join(arch_parts),
        "steps": fallback_steps,
        "filesToTouch": repo_files if repo_files else ["Módulo de lógica principal", "Tipos / Esquemas / Tests"],
        "pitfall": "Evita sobreingeniería o refactorizar partes no relacionadas; haz funcionar primero el caso principal de extremo a extremo.",
        "quickSnippet": "",
        "repoContextUsed": bool(repo_ctx.get("connected")),
        "repoLabel": repo_ctx.get("repoLabel") if repo_ctx.get("connected") else None,
    }


async def ask_task_technical_question(
    task: Dict[str, Any],
    project: Optional[Dict[str, Any]],
    question: str,
    history: List[Dict[str, str]],
) -> Dict[str, Any]:
    """Responde dudas técnicas específicas sobre cómo resolver la tarea usando contexto del proyecto y repo GitHub."""
    sibling_tasks = get_project_tasks_summary(task['projectId'], exclude_task_id=task['id'])
    settings = get_settings()
    query_text = f"{task.get('title', '')} {task.get('description', '')} {question}"
    repo_ctx = await fetch_repo_context(
        project.get('repoUrl') if project else '',
        query_text=query_text,
        github_token=settings.get('githubToken', ''),
    )

    context_block = _build_project_and_repo_context_block(task, project, sibling_tasks, repo_ctx)
    history_block = "\n".join(
        f"{'Programador' if h['role'] == 'user' else 'Tech Lead'}: {h['content']}"
        for h in history[-6:]
    )

    prompt = f"""Eres un Staff Software Engineer ayudando a resolver un problema técnico concreto dentro de una tarea.

{context_block}

Historial reciente de la consulta:
{history_block or '(Primera pregunta)'}

Pregunta del programador:
"{question}"

Responde con precisión técnica:
- Explica exactamente CÓMO resolverlo en la práctica (arquitectura, flujo de datos, funciones/endpoints concretos).
- Si hay archivos reales del repositorio arriba, cítalos explícitamente y respeta su stack y convenciones.
- Incluye un ejemplo de código (`codeSnippet`) si ayuda a desbloquearlo rápido.

Responde EXCLUSIVAMENTE con un JSON válido:
{{
  "answer": "Explicación clara y técnica en español.",
  "referencedFiles": ["ruta/archivo1.py"],
  "codeSnippet": "// Código concreto opcional"
}}"""

    try:
        raw = await query_llm(prompt, "Staff Software Engineer mentor, práctico y concreto.", max_tokens=2400)
        data = extract_json_block(raw, expect_array=False)
        if isinstance(data, dict) and data.get("answer"):
            return {
                "answer": str(data["answer"]),
                "referencedFiles": [str(f) for f in (data.get("referencedFiles") or [])][:6],
                "codeSnippet": str(data.get("codeSnippet") or ""),
                "repoUsed": bool(repo_ctx.get("connected")),
                "repoLabel": repo_ctx.get("repoLabel") if repo_ctx.get("connected") else None,
            }
    except Exception:
        pass

    # Fallback local inteligente usando contexto real del proyecto y archivos del repo
    matched_files = [fs["path"] for fs in repo_ctx.get("fileSnippets", [])]
    lower_q = question.lower()
    proj_name = project.get('name', 'General') if project else 'General'
    proj_desc = project.get('description', '') if project else ''
    same_epic = [s["title"] for s in sibling_tasks if s.get("epic") == task.get("epic")][:4]
    subs = [s.get("title") for s in (task.get("subtasks") or []) if s.get("title")]

    if any(k in lower_q for k in ['de que va', 'de qué va', 'qué es', 'que es', 'explica', 'resumen', 'objetivo']):
        lines = [
            f"**{task.get('title')}** forma parte de la épica **{task.get('epic', 'General')}** dentro de *{proj_name}*."
        ]
        if proj_desc:
            lines.append(f"• Contexto del proyecto: {proj_desc}")
        if task.get("description"):
            lines.append(f"• Qué tienes que entregar aquí: {task['description']}")
        if subs:
            lines.append("• Desglose concreto:\n" + "\n".join(f"  - {s}" for s in subs))
        if same_epic:
            lines.append(f"• Tareas relacionadas en este mismo módulo: {', '.join(same_epic)}.")
        if matched_files:
            lines.append(f"• Código relacionado en tu repo: `{'`, `'.join(matched_files)}`.")
    else:
        lines = [
            f"Enfoque práctico para **{task.get('title')}** en *{proj_name}*:"
        ]
        if matched_files:
            lines.append(f"• Empieza abriendo `{'`, `'.join(matched_files[:3])}` para seguir las convenciones existentes del repo.")
        if subs:
            lines.append("• Secuencia recomendada según tus subtareas:\n" + "\n".join(f"  {i+1}. {s}" for i, s in enumerate(subs)))
        else:
            lines.append(
                f"• Pasos técnicos: 1) define el esquema/tipos base para {task.get('title')}, "
                "2) implementa el caso principal aislado, 3) valida errores y relaciones/integridad."
            )
        if repo_ctx.get("error"):
            lines.append(f"• Nota sobre el repo: {repo_ctx['error']}")

    snippet_preview = ""
    if repo_ctx.get("fileSnippets"):
        first_file = repo_ctx["fileSnippets"][0]
        snippet_preview = f"// Extracto de {first_file['path']}\n" + "\n".join(first_file["content"].splitlines()[:18])

    return {
        "answer": "\n".join(lines),
        "referencedFiles": matched_files,
        "codeSnippet": snippet_preview,
        "repoUsed": bool(repo_ctx.get("connected")),
        "repoLabel": repo_ctx.get("repoLabel") if repo_ctx.get("connected") else None,
    }


async def breakdown_task_into_subtasks(task: Dict[str, Any], project: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """Desglosa una tarea existente en 3 a 5 subtareas accionables y persistentes."""
    prompt = f"""Actúa como Lead Software Engineer y Project Manager estilo Jira.
Desglosa esta tarea técnica en 3 a 5 subtareas concretas y accionables (cada una realizable en 10-15 min):
- Proyecto: "{project.get('name', 'General') if project else 'General'}" ({project.get('description', '') if project else ''})
- Épica/Módulo: "{task.get('epic', 'General')}"
- Tarea: "{task.get('title')}"
- Descripción: "{task.get('description', '')}"

Responde ÚNICAMENTE con un array JSON de strings o objetos {{"title": "..."}}:
["Subtarea 1...", "Subtarea 2...", "Subtarea 3..."]"""

    try:
        raw = await query_llm(prompt, "Tech Lead pragmático que divide tareas en pasos claros.", max_tokens=1000)
        items = extract_json_block(raw, expect_array=True)
        if isinstance(items, list) and items:
            return normalize_subtasks(items, prefix=f"{task.get('id', 'task')}-sub")
    except Exception:
        pass

    title = task.get('title', 'la tarea')
    return normalize_subtasks([
        f"Definir contratos, tipos y estructura para {title}",
        f"Implementar lógica principal de {title}",
        "Añadir validaciones y manejo de errores",
        "Probar funcionamiento e integración end-to-end",
    ], prefix=f"{task.get('id', 'task')}-sub")


async def evaluate_task(
    title: str,
    description: str,
    project: Optional[Dict[str, Any]],
    velocity: float = 1.0,
) -> Dict[str, Any]:
    """Evalúa si una tarea aporta valor al MVP y ajusta su duración según velocidad histórica."""
    prompt = f"""Eres un Project Manager implacable y experimentado para un desarrollador en solitario.
El usuario quiere añadir esta tarea:
- Título: "{title}"
- Detalles: "{description}"
- Proyecto: "{project.get('name', 'General') if project else 'General'}"
- Ratio histórico de velocidad: {velocity}x (si es > 1.0, suele tardar más de lo estimado).

Evalúa si aporta valor real para el MVP o es sobreingeniería, determina prioridad y minutos reales.
Responde ÚNICAMENTE con un JSON:
{{
  "isUseful": true,
  "verdict": "Explicación directa del PM de por qué es esencial o por qué huele a distracción",
  "suggestedPriority": "high",
  "estimatedMinutes": 45,
  "breakdownWarning": ""
}}"""

    try:
        raw = await query_llm(prompt, "Project Manager técnico estricto, realista y pragmático.", max_tokens=1000)
        data = extract_json_block(raw, expect_array=False)
        if isinstance(data, dict):
            prio = str(data.get("suggestedPriority", "medium")).lower()
            if prio not in VALID_PRIORITIES:
                prio = "medium"
            return {
                "isUseful": bool(data.get("isUseful", True)),
                "verdict": str(data.get("verdict", "Tarea evaluada para el proyecto.")),
                "suggestedPriority": prio,
                "estimatedMinutes": max(15, min(120, int(data.get("estimatedMinutes", 45)))),
                "breakdownWarning": data.get("breakdownWarning") or None,
            }
    except Exception:
        pass

    est = min(90, max(20, int(round(45 * velocity))))
    return {
        "isUseful": True,
        "verdict": f"Tarea relevante para el proyecto. Estimada con factor de velocidad histórico ({velocity}x).",
        "suggestedPriority": "medium",
        "estimatedMinutes": est,
        "breakdownWarning": "Supera 1 hora. Considera partirla en 2 micro-tareas o generar subtareas." if est > 60 else None,
    }
