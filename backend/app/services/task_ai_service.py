import json
import re
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
    siblings_txt = "\n".join(
        f"- [{s.get('status')}] {s.get('epic')}: {s.get('title')}"
        for s in sibling_tasks[:10]
    ) or "(sin otras tareas)"

    repo_block = "Sin repo."
    if repo_ctx.get("connected"):
        tree_str = ", ".join(repo_ctx.get("treePreview", [])[:35])
        snippets_str = "\n".join(
            f"=== {fs['path']} ===\n{fs['content']}"
            for fs in repo_ctx.get("fileSnippets", [])[:3]
        )
        repo_block = f"Repo {repo_ctx.get('repoLabel')} ({repo_ctx.get('filesCount')} arch): {tree_str}\n{snippets_str}"

    subs_list = ", ".join(s.get('title', '') for s in (task.get('subtasks') or [])[:6])
    proj_desc = (project.get('description') or '')[:260] if project else ''

    return (
        f"PROYECTO: {project.get('name', 'General') if project else 'General'} | {proj_desc}\n"
        f"HERMANAS:\n{siblings_txt}\n"
        f"TAREA: [{task.get('epic', 'General')}] {task.get('title')} ({task.get('estimatedMinutes', 45)}m)\n"
        f"DESC: {(task.get('description') or '')[:260]}\n"
        f"SUBTAREAS: {subs_list or 'ninguna'}\n"
        f"REPO:\n{repo_block}"
    )


def _format_llm_error_notice(exc: Exception) -> str:
    msg = str(exc)
    if '402' in msg or 'credits are depleted' in msg.lower():
        return "⚠️ Tu clave de Gemini devolvió **402 (créditos agotados en AI Studio)**. Cambia de clave o usa Groq/OpenAI en Ajustes. Respuesta generada con análisis local del repo."
    if '401' in msg or '403' in msg:
        return "⚠️ API Key rechazada o sin permisos. Revisa Ajustes. Respuesta generada con análisis local del repo."
    if '429' in msg:
        return "⚠️ Cuota de API alcanzada (`429`). Respuesta generada con análisis local del repo."
    return "⚠️ No se pudo obtener respuesta de la IA externa en este instante. Respuesta generada con análisis local del repo."


def _extract_symbols_from_snippets(snippets: List[Dict[str, str]]) -> List[str]:
    symbols: List[str] = []
    for fs in snippets:
        found = re.findall(r'^(?:def |async def |class |export (?:interface|type|const|function) )([A-Za-z0-9_]+)', fs['content'], flags=re.MULTILINE)
        if found:
            symbols.append(f"`{fs['path']}` ({', '.join(found[:4])})")
    return symbols


def _build_domain_starter_snippet(task: Dict[str, Any], repo_ctx: Dict[str, Any]) -> str:
    """Genera un snippet inicial útil y real acorde al tipo de tarea (sin volcar READMEs)."""
    text = f"{task.get('title', '')} {task.get('description', '')} {task.get('epic', '')}".lower()
    paths = " ".join(repo_ctx.get("treePreview", [])).lower()
    is_python = '.py' in paths or any(k in text for k in ['pydantic', 'fastapi', 'sqlite', 'sqlalchemy', 'python'])

    if any(k in text for k in ['esquema', 'datos', 'dto', 'pydantic', 'validacion', 'validación', 'tabla', 'bd', 'modelo', 'acceso']):
        if is_python:
            return (
                "# 1) Contrato Pydantic (models.py) + 2) Acceso seguro (db_helpers.py)\n"
                "from pydantic import BaseModel, Field\n"
                "from fastapi import HTTPException\n\n"
                "class ItemCreate(BaseModel):\n"
                "    name: str = Field(min_length=2, max_length=120)\n\n"
                "def get_item_or_404(cursor, item_id: str) -> dict:\n"
                "    row = cursor.execute('SELECT * FROM items WHERE id = ?', (item_id,)).fetchone()\n"
                "    if not row:\n"
                "        raise HTTPException(status_code=404, detail='Registro no encontrado')\n"
                "    return dict(row)"
            )
        return (
            "export interface ItemDTO {\n"
            "  id: string;\n"
            "  name: string;\n"
            "}\n\n"
            "export function validateItemInput(name: string): string {\n"
            "  const clean = name.trim();\n"
            "  if (clean.length < 2) throw new Error('Nombre demasiado corto');\n"
            "  return clean;\n"
            "}"
        )

    if any(k in text for k in ['auth', 'login', 'jwt', 'usuario', 'permiso', 'sesion', 'sesión']):
        return (
            "from fastapi import Depends, HTTPException, Header\n\n"
            "def require_current_user(authorization: str = Header(...)) -> str:\n"
            "    if not authorization.startswith('Bearer '):\n"
            "        raise HTTPException(status_code=401, detail='Token requerido')\n"
            "    token = authorization.removeprefix('Bearer ').strip()\n"
            "    # Validar firma/expiración y devolver user_id\n"
            "    return token"
        )

    if any(k in text for k in ['ui', 'interfaz', 'componente', 'pantalla', 'vista', 'react', 'formulario']):
        return (
            "const [loading, setLoading] = useState(false);\n"
            "const [error, setError] = useState<string | null>(null);\n\n"
            "const handleSubmit = async () => {\n"
            "  setLoading(true); setError(null);\n"
            "  try { /* llamada a api.* */ } catch (e) { setError('Error al guardar'); }\n"
            "  finally { setLoading(false); }\n"
            "};"
        )

    return (
        "# Estructura modular recomendada:\n"
        "# 1. Validar entrada (Pydantic / TypeScript)\n"
        "# 2. Ejecutar lógica en servicio aislado\n"
        "# 3. Persistir / devolver respuesta tipada con manejo explícito de errores"
    )


def _infer_edge_cases(task: Dict[str, Any]) -> List[str]:
    text = f"{task.get('title', '')} {task.get('description', '')} {task.get('epic', '')}".lower()
    if any(k in text for k in ['esquema', 'datos', 'dto', 'pydantic', 'validacion', 'validación', 'tabla', 'bd', 'modelo', 'acceso']):
        return [
            "ID inexistente al consultar/actualizar/borrar → devolver `404` limpio en lugar de `500`.",
            "Campos vacíos, tipos erróneos o rangos inválidos → validación estricta (`422`) antes de tocar SQLite.",
            "JSON corrupto o nulo en columnas serializadas (como `subtasks`) → parseo seguro con fallback `[]`.",
            "Restricciones de clave foránea (`ON DELETE CASCADE`) y migración segura si la tabla ya existe.",
        ]
    if any(k in text for k in ['auth', 'login', 'jwt', 'permiso', 'rol']):
        return [
            "Email duplicado en registro (`409`) y credenciales inválidas sin revelar qué campo falló (`401`).",
            "Token expirado, malformado o ausente (`401`), y usuario sin permisos (`403`).",
        ]
    if any(k in text for k in ['ui', 'interfaz', 'componente', 'pantalla', 'vista', 'react', 'formulario']):
        return [
            "Evitar doble envío bloqueando el botón mientras `loading === true`.",
            "Estado vacío (0 elementos), textos largos con `truncate` y error visible si falla la API.",
        ]
    return [
        "Entradas vacías o nulas y timeouts en llamadas externas.",
        "Errores HTTP claros (`400`/`404`) y rollback si falla una operación múltiple.",
    ]


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
    prompt = (
        f"{context_block}\n\n"
        "Da una guía técnica concreta de cómo resolverlo (flujo, contratos, archivos reales del repo y snippet).\n"
        'Responde SOLO JSON: {"summary":"1-2 frases","architectureNotes":"cómo resolverlo y flujo",'
        '"steps":["1. ...","2. ..."],"filesToTouch":["ruta"],"pitfall":"trampa concreta","quickSnippet":"código max 12 líneas"}'
    )

    lang = settings.get('language', 'es')
    lang_instr = "Answer in English." if lang == 'en' else "Responde en español."

    llm_notice = ""
    if settings.get('apiKey', '').strip():
        try:
            raw = await query_llm(f"{prompt}\n{lang_instr}", "Staff Software Engineer pragmático. Responde solo JSON.", max_tokens=1100, json_mode=True)
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
        except Exception as exc:
            llm_notice = _format_llm_error_notice(exc)

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
    symbols = _extract_symbols_from_snippets(repo_ctx.get("fileSnippets", []))
    done_siblings = [s["title"] for s in sibling_tasks if s.get("status") == "completed"][:3]
    arch_parts = [
        f"Encaja dentro de la épica '{task.get('epic', 'General')}' del proyecto '{project.get('name', 'General') if project else 'General'}'."
    ]
    if done_siblings:
        arch_parts.append(f"Ya tienes resuelto previamente: {', '.join(done_siblings)}.")
    if symbols:
        arch_parts.append(f"Símbolos relevantes detectados en tu repo: {'; '.join(symbols)}.")
    elif repo_ctx.get("connected"):
        arch_parts.append(f"Archivos más cercanos en {repo_ctx.get('repoLabel')}: {', '.join(repo_files[:3])}.")
    if llm_notice:
        arch_parts.append(llm_notice)

    return {
        "summary": f"Plan técnico para '{task.get('title')}' ({task.get('estimatedMinutes', 45)}m) conectado al contexto de tu proyecto.",
        "architectureNotes": " ".join(arch_parts),
        "steps": fallback_steps,
        "filesToTouch": repo_files if repo_files else ["Módulo de lógica principal", "Tipos / Esquemas / Tests"],
        "pitfall": " | ".join(_infer_edge_cases(task)[:2]),
        "quickSnippet": _build_domain_starter_snippet(task, repo_ctx),
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
        f"{'U' if h['role'] == 'user' else 'A'}: {h['content'][:240]}"
        for h in history[-4:]
    )

    prompt = (
        f"{context_block}\n"
        f"{f'HISTORIAL:\n{history_block}\n' if history_block else ''}"
        f'PREGUNTA: "{question}"\n'
        'Responde con precisión técnica citando archivos/símbolos reales del repo si hay y código útil.\n'
        'Responde SOLO JSON: {"answer":"explicación en español","referencedFiles":["ruta"],"codeSnippet":"código opcional"}'
    )

    lang = settings.get('language', 'es')
    lang_instr = "Answer in English." if lang == 'en' else "Responde en español."

    llm_notice = ""
    if settings.get('apiKey', '').strip():
        try:
            raw = await query_llm(f"{prompt}\n{lang_instr}", "Staff Software Engineer concreto. Responde solo JSON.", max_tokens=1000, json_mode=True)
            data = extract_json_block(raw, expect_array=False)
            if isinstance(data, dict) and data.get("answer"):
                return {
                    "answer": str(data["answer"]),
                    "referencedFiles": [str(f) for f in (data.get("referencedFiles") or [])][:6],
                    "codeSnippet": str(data.get("codeSnippet") or ""),
                    "repoUsed": bool(repo_ctx.get("connected")),
                    "repoLabel": repo_ctx.get("repoLabel") if repo_ctx.get("connected") else None,
                }
        except Exception as exc:
            llm_notice = _format_llm_error_notice(exc)

    # Fallback local inteligente diferenciado por tipo de pregunta
    matched_files = [fs["path"] for fs in repo_ctx.get("fileSnippets", [])]
    symbols = _extract_symbols_from_snippets(repo_ctx.get("fileSnippets", []))
    lower_q = question.lower()
    proj_name = project.get('name', 'General') if project else 'General'
    proj_desc = project.get('description', '') if project else ''
    same_epic = [s["title"] for s in sibling_tasks if s.get("epic") == task.get("epic")][:4]
    subs = [s.get("title") for s in (task.get("subtasks") or []) if s.get("title")]

    snippet_out = ""
    if any(k in lower_q for k in ['ejemplo', 'código', 'codigo', 'snippet', 'empezar']):
        lines = [
            f"Aquí tienes un punto de partida concreto para **{task.get('title')}** en *{proj_name}*:"
        ]
        if matched_files:
            lines.append(f"• Puedes integrarlo directamente sobre `{'`, `'.join(matched_files[:3])}`.")
        if symbols:
            lines.append(f"• Símbolos detectados en tu código: {'; '.join(symbols)}.")
        snippet_out = _build_domain_starter_snippet(task, repo_ctx)
    elif any(k in lower_q for k in ['archivo', 'tocar', 'caso', 'límite', 'limite', 'validar', 'edge']):
        lines = [f"**Archivos a revisar y casos límite** para **{task.get('title')}**:"]
        if matched_files:
            lines.append("• Archivos del repo más relevantes:\n" + "\n".join(f"  - `{f}`" for f in matched_files))
        if symbols:
            lines.append(f"• Funciones/clases encontradas: {'; '.join(symbols)}.")
        lines.append("• Casos límite obligatorios a validar:\n" + "\n".join(f"  - {ec}" for ec in _infer_edge_cases(task)))
    elif any(k in lower_q for k in ['de que va', 'de qué va', 'qué es', 'que es', 'explica', 'resumen', 'objetivo']):
        lines = [f"**{task.get('title')}** forma parte de la épica **{task.get('epic', 'General')}** dentro de *{proj_name}*."]
        if proj_desc:
            lines.append(f"• Contexto del proyecto: {proj_desc}")
        if task.get("description"):
            lines.append(f"• Qué tienes que entregar aquí: {task['description']}")
        if subs:
            lines.append("• Desglose concreto:\n" + "\n".join(f"  - {s}" for s in subs))
        if same_epic:
            lines.append(f"• Tareas relacionadas en este módulo: {', '.join(same_epic)}.")
    else:
        lines = [f"Enfoque práctico para **{task.get('title')}** en *{proj_name}*:"]
        if matched_files:
            lines.append(f"• Empieza revisando `{'`, `'.join(matched_files[:3])}` para seguir la estructura existente.")
        if subs:
            lines.append("• Orden de ejecución:\n" + "\n".join(f"  {i + 1}. {s}" for i, s in enumerate(subs)))
        lines.append("• Casos límite clave:\n" + "\n".join(f"  - {ec}" for ec in _infer_edge_cases(task)[:2]))

    if repo_ctx.get("error"):
        lines.append(f"• Nota sobre el repo: {repo_ctx['error']}")
    if llm_notice:
        lines.append(f"\n{llm_notice}")

    return {
        "answer": "\n".join(lines),
        "referencedFiles": matched_files,
        "codeSnippet": snippet_out,
        "repoUsed": bool(repo_ctx.get("connected")),
        "repoLabel": repo_ctx.get("repoLabel") if repo_ctx.get("connected") else None,
    }


async def breakdown_task_into_subtasks(task: Dict[str, Any], project: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """Desglosa una tarea existente en 3 a 5 subtareas accionables y persistentes."""
    prompt = (
        f'Proyecto: "{project.get("name", "General") if project else "General"}" | Épica: "{task.get("epic", "General")}"\n'
        f'Tarea: "{task.get("title")}" | Desc: "{(task.get("description") or "")[:200]}"\n'
        'Divide en 3-5 subtareas de 10-15m. Responde SOLO array JSON: ["Subtarea 1", "Subtarea 2"]'
    )

    try:
        raw = await query_llm(prompt, "Tech Lead pragmático. Responde solo JSON.", max_tokens=450, json_mode=True)
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
    prompt = (
        f'Proyecto: "{project.get("name", "General") if project else "General"}" | Velocidad: {velocity}x\n'
        f'Tarea: "{title}" | Detalles: "{description[:220]}"\n'
        'Evalúa utilidad MVP, prioridad y minutos reales. Responde SOLO JSON: '
        '{"isUseful":true,"verdict":"1-2 frases","suggestedPriority":"high|medium|low|urgent","estimatedMinutes":45,"breakdownWarning":""}'
    )

    try:
        raw = await query_llm(prompt, "PM técnico estricto. Responde solo JSON.", max_tokens=350, json_mode=True)
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
