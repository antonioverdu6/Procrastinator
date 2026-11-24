import json
from typing import Any, Dict, List, Optional

from ..lib.json_utils import extract_json_block
from ..lib.llm_client import query_llm
from ..lib.task_normalizer import normalize_proposed_tasks, target_task_count
from .local_planner import build_local_roadmap, refine_roadmap_local


async def generate_roadmap(
    name: str,
    description: str,
    target_hours: Optional[float] = None,
    velocity: float = 1.0,
    scope: str = 'standard',
    tech_stack: str = '',
) -> List[Dict[str, Any]]:
    """Genera un desglose completo por épicas, tareas y subtareas calculando el esfuerzo real."""
    min_t, max_t = target_task_count(target_hours, scope)
    scope_label = {
        'mvp': 'MVP enfocado (solo lo imprescindible para lanzar)',
        'standard': 'Planificación completa por módulos funcionales',
        'detailed': 'Desglose exhaustivo estilo Jira / Azure DevOps (todos los módulos, edge cases y QA)',
    }.get(scope, 'Planificación completa por módulos funcionales')
    hours_line = (
        f"- Presupuesto de horas indicado: {target_hours}h"
        if target_hours is not None
        else "- Meta de horas: NO especificada por el usuario — calcúlala tú de forma realista sumando los bloques necesarios para cubrir este alcance."
    )

    prompt = f"""Eres un Staff Software Architect y Technical Project Manager (estilo Jira / Azure DevOps) para un desarrollador en solitario.
El usuario quiere planificar y construir este proyecto:
- Nombre: "{name}"
- Descripción funcional: "{description}"
- Stack / Tecnologías indicadas: "{tech_stack or 'A elegir según el proyecto (sé pragmático)'}"
{hours_line}
- Nivel de detalle pedido: {scope_label}
- Ratio histórico de velocidad del programador: {velocity}x

Tu trabajo: descomponer el proyecto en **Épicas / Módulos** claros (por ejemplo: "1. Setup & Arquitectura", "2. Base de Datos", "3. Backend API", "4. Auth & Seguridad", "5. Frontend UI", "6. Integraciones", "7. Testing & Cierre" — adaptados 100% a lo que pide este proyecto en concreto).

Reglas estrictas:
1. Genera entre {min_t} y {max_t} tareas concretas y ejecutables, ordenadas lógicamente por dependencias.
2. Cada tarea debe durar entre 25 y 55 minutos (ajustado por {velocity}x). Evita tareas gigantes vagas.
3. Cada tarea DEBE incluir un campo "epic" (nombre del módulo) y un array "subtasks" con 3 a 4 pasos concretos de "qué hay que hacer" (objetos {{"title": "..."}}).
4. En "description", resume criterio de aceptación (qué incluye y qué queda fuera).
5. Responde ÚNICAMENTE con un array JSON válido:
[
  {{
    "id": "prop-1",
    "epic": "1. Base de Datos",
    "title": "Diseñar esquema de usuarios y reservas",
    "description": "Tablas users, services, bookings con claves foráneas. Sin multitenant por ahora.",
    "estimatedMinutes": 40,
    "priority": "urgent",
    "difficulty": "medium",
    "subtasks": [
      {{"title": "Definir columnas e índices en migración SQL"}},
      {{"title": "Crear modelos Pydantic/ORM correspondientes"}},
      {{"title": "Añadir script seed con 5 registros de prueba"}}
    ]
  }}
]"""

    try:
        raw = await query_llm(
            prompt,
            "Staff Software Architect y Technical Project Manager experto en Jira/Azure DevOps.",
            max_tokens=4096,
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
    """Refina un roadmap propuesto aplicando instrucciones conversacionales del usuario."""
    est_hours = target_hours if target_hours is not None else round(
        sum(int(t.get("estimatedMinutes", 40)) for t in current_tasks) / 60, 1
    )
    compact_tasks = [
        {
            "id": t.get("id"),
            "epic": t.get("epic", "General"),
            "title": t.get("title"),
            "description": t.get("description", ""),
            "estimatedMinutes": t.get("estimatedMinutes", 40),
            "priority": t.get("priority", "medium"),
            "difficulty": t.get("difficulty", "medium"),
            "subtasks": [s.get("title") if isinstance(s, dict) else str(s) for s in t.get("subtasks", [])],
        }
        for t in current_tasks
    ]

    prompt = f"""Eres el Technical Project Manager de "{project_name}" ({project_desc}, estimación actual {est_hours}h).
Backlog propuesto actual:
{json.dumps(compact_tasks, ensure_ascii=False)}

El desarrollador te pide este cambio:
"{instruction}"

Aplica los cambios manteniendo la estructura por Épicas ("epic") y subtareas ("subtasks") de cada tarea.
Responde ÚNICAMENTE con un JSON válido:
{{
  "reply": "Explicación corta y clara de qué modificaste en el plan",
  "updatedTasks": [
    {{
      "id": "prop-1",
      "epic": "Backend API",
      "title": "...",
      "description": "...",
      "estimatedMinutes": 40,
      "priority": "high",
      "difficulty": "medium",
      "subtasks": [{{"title": "Paso 1"}}, {{"title": "Paso 2"}}]
    }}
  ]
}}"""

    try:
        raw = await query_llm(prompt, "Technical Project Manager conversacional.", max_tokens=4096)
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
