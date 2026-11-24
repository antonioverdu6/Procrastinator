from typing import Any, Dict, List, Optional

from ..lib.json_utils import extract_json_block
from ..lib.llm_client import query_llm
from ..lib.task_normalizer import normalize_proposed_tasks, target_task_count
from ..scheduler import get_settings
from .local_planner import build_local_roadmap, refine_roadmap_local


async def generate_roadmap(
    name: str,
    description: str,
    target_hours: Optional[float] = None,
    velocity: float = 1.0,
    scope: str = 'standard',
    tech_stack: str = '',
) -> List[Dict[str, Any]]:
    """Genera un desglose por épicas, tareas y subtareas con prompt compacto."""
    min_t, max_t = target_task_count(target_hours, scope)
    scope_label = {
        'mvp': 'MVP mínimo',
        'standard': 'Módulos completos',
        'detailed': 'Detallado estilo Jira',
    }.get(scope, 'Módulos completos')
    budget = f"Presupuesto: {target_hours}h" if target_hours is not None else "Estima horas reales sumando tareas"

    prompt = (
        f'Proyecto: "{name}" | Desc: "{description[:450]}" | Stack: "{tech_stack or "pragmático"}"\n'
        f'Alcance: {scope_label} ({min_t}-{max_t} tareas) | {budget} | Velocidad: {velocity}x\n'
        'Divide en épicas lógicas (Setup, BD, Backend, Auth, UI, QA según aplique). '
        'Bloques 25-55m con 3 subtareas concretas cada uno.\n'
        'Responde SOLO array JSON: [{"id":"prop-1","epic":"1. BD","title":"...","description":"criterio aceptación",'
        '"estimatedMinutes":40,"priority":"urgent|high|medium|low","difficulty":"easy|medium|hard","subtasks":[{"title":"..."}]}]'
    )

    lang = get_settings().get('language', 'es')
    lang_note = 'Write titles, descriptions, epics and subtasks in English.' if lang == 'en' else 'Escribe títulos, descripciones, épicas y subtareas en español.'

    try:
        raw = await query_llm(
            f"{prompt}\n{lang_note}",
            "Arquitecto y Technical PM estilo Jira. Responde solo JSON.",
            max_tokens=2600,
            json_mode=True,
        )
        items = extract_json_block(raw, expect_array=True)
        if isinstance(items, list) and len(items) >= 3:
            return normalize_proposed_tasks(items, velocity)
    except Exception:
        pass

    return build_local_roadmap(name, description, target_hours, velocity, scope, tech_stack)


async def refine_roadmap(
    current_tasks: List[Dict[str, Any]],
    instruction: str,
    project_name: str,
    project_desc: str,
    target_hours: Optional[float] = None,
) -> Dict[str, Any]:
    """Refina un roadmap propuesto usando representación compacta por líneas."""
    compact_lines = "\n".join(
        f"{t.get('id')}|{t.get('epic','General')}|{t.get('estimatedMinutes',40)}m|{t.get('priority','medium')}|{t.get('title')}|subs:{','.join(s.get('title') if isinstance(s,dict) else str(s) for s in t.get('subtasks',[])[:4])}"
        for t in current_tasks
    )

    prompt = (
        f'Proyecto "{project_name}" ({project_desc[:200]}).\n'
        f'Backlog actual:\n{compact_lines}\n\n'
        f'Cambio pedido: "{instruction}"\n'
        'Responde SOLO JSON: {"reply":"qué cambiaste","updatedTasks":[{"id":"prop-1","epic":"...","title":"...",'
        '"description":"...","estimatedMinutes":40,"priority":"high","difficulty":"medium","subtasks":[{"title":"..."}]}]}'
    )

    try:
        raw = await query_llm(prompt, "Technical PM. Responde solo JSON.", max_tokens=2600, json_mode=True)
        data = extract_json_block(raw, expect_array=False)
        if isinstance(data, dict) and data.get("updatedTasks"):
            updated = normalize_proposed_tasks(data.get("updatedTasks", []))
            if updated:
                return {
                    "reply": str(data.get("reply", "Plan actualizado según tus indicaciones.")),
                    "updatedTasks": updated,
                }
    except Exception:
        pass

    return refine_roadmap_local(current_tasks, instruction)
