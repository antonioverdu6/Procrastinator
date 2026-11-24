from typing import Any, Dict, List, Optional, Tuple

VALID_PRIORITIES = {'low', 'medium', 'high', 'urgent'}
VALID_DIFFICULTIES = {'easy', 'medium', 'hard'}


def normalize_subtasks(raw_subtasks: Any, prefix: str = 'sub') -> List[Dict[str, Any]]:
    """Normaliza una lista de subtareas (strings o dicts) al formato {id, title, done}."""
    if not isinstance(raw_subtasks, list):
        return []

    result: List[Dict[str, Any]] = []
    for idx, item in enumerate(raw_subtasks):
        if isinstance(item, str):
            title = item.strip()
            done = False
            sub_id = f"{prefix}-{idx + 1}"
        elif isinstance(item, dict):
            title = str(item.get('title') or item.get('text') or '').strip()
            done = bool(item.get('done', False))
            sub_id = str(item.get('id') or f"{prefix}-{idx + 1}")
        else:
            continue

        if title:
            result.append({"id": sub_id, "title": title, "done": done})

    return result


def normalize_proposed_tasks(items: List[Dict[str, Any]], velocity: float = 1.0) -> List[Dict[str, Any]]:
    """Normaliza tareas propuestas por IA o motor local validando prioridad, dificultad, épica y subtareas."""
    normalized: List[Dict[str, Any]] = []
    for idx, item in enumerate(items):
        if not isinstance(item, dict):
            continue

        try:
            mins = int(item.get("estimatedMinutes", 40))
        except Exception:
            mins = 40
        mins = max(15, min(90, mins))

        priority = str(item.get("priority", "medium")).lower()
        if priority not in VALID_PRIORITIES:
            priority = "medium"

        difficulty = str(item.get("difficulty", "medium")).lower()
        if difficulty not in VALID_DIFFICULTIES:
            difficulty = "medium"

        epic = str(item.get("epic") or "General").strip() or "General"
        task_id = str(item.get("id") or f"prop-{idx + 1}")
        subtasks = normalize_subtasks(item.get("subtasks", []), prefix=f"{task_id}-sub")

        normalized.append({
            "id": task_id,
            "epic": epic,
            "title": str(item.get("title", f"Tarea {idx + 1}")).strip(),
            "description": str(item.get("description", "")).strip(),
            "estimatedMinutes": mins,
            "priority": priority,
            "difficulty": difficulty,
            "subtasks": subtasks,
        })

    return normalized


def target_task_count(target_hours: Optional[float] = None, scope: str = 'standard') -> Tuple[int, int]:
    """Calcula el rango (min, max) de tareas según el alcance elegido (y horas si se especifican)."""
    if target_hours is None:
        if scope == 'mvp':
            return 6, 11
        if scope == 'detailed':
            return 15, 25
        return 10, 18

    estimated_blocks = max(6, int(round((target_hours * 60) / 40)))
    if scope == 'mvp':
        count = max(6, min(12, estimated_blocks))
        return max(6, count - 2), min(12, count + 1)
    if scope == 'detailed':
        count = max(14, min(28, int(round((target_hours * 60) / 35))))
        return max(14, count - 2), min(28, count + 2)
    count = max(9, min(20, estimated_blocks))
    return max(9, count - 2), min(20, count + 2)
