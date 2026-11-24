import json
import uuid
from contextlib import contextmanager
from typing import Any, Dict, Generator, Optional

from ..database import get_connection, row_to_task


@contextmanager
def db_session() -> Generator[Any, None, None]:
    """Context manager que abre conexión SQLite, hace commit si no hay error y siempre cierra."""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def get_next_task_order(cursor) -> int:
    """Devuelve la siguiente posición de orden disponible para insertar tareas."""
    cursor.execute('SELECT COALESCE(MAX("order"), 0) as max_ord FROM tasks')
    return int(cursor.fetchone()['max_ord']) + 1


def insert_task_row(
    cursor,
    *,
    project_id: str,
    title: str,
    description: str = '',
    epic: str = 'General',
    subtasks: Optional[list] = None,
    estimated_minutes: int = 45,
    priority: str = 'medium',
    difficulty: str = 'medium',
    order_val: Optional[int] = None,
) -> Dict[str, Any]:
    """Inserta una tarea en SQLite y devuelve el registro normalizado."""
    task_id = f"task-{uuid.uuid4().hex[:10]}"
    next_order = order_val if order_val is not None else get_next_task_order(cursor)
    subtasks_json = json.dumps(subtasks or [], ensure_ascii=False)

    cursor.execute(
        '''
        INSERT INTO tasks (
            id, projectId, title, description, epic, subtasks,
            estimatedMinutes, actualMinutes, status, priority,
            difficulty, deferredCount, scheduledDate, completedAt, "order"
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'backlog', ?, ?, 0, NULL, NULL, ?)
        ''',
        (
            task_id,
            project_id,
            title.strip(),
            description or '',
            (epic or 'General').strip(),
            subtasks_json,
            int(estimated_minutes),
            priority,
            difficulty,
            next_order,
        ),
    )
    cursor.execute('SELECT * FROM tasks WHERE id = ?', (task_id,))
    return row_to_task(cursor.fetchone())


ALLOWED_TASK_UPDATE_FIELDS = {
    'projectId', 'title', 'description', 'epic', 'subtasks',
    'estimatedMinutes', 'actualMinutes', 'status', 'priority',
    'difficulty', 'scheduledDate', 'completedAt', 'deferredCount', 'order',
}


def update_task_row(cursor, task_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Aplica actualizaciones parciales a una tarea en SQLite y devuelve la fila normalizada."""
    cursor.execute('SELECT * FROM tasks WHERE id = ?', (task_id,))
    if not cursor.fetchone():
        return None

    fields = []
    values = []
    for key, value in updates.items():
        if key not in ALLOWED_TASK_UPDATE_FIELDS:
            continue
        if key == 'subtasks':
            fields.append('subtasks = ?')
            values.append(json.dumps(value or [], ensure_ascii=False))
        elif key == 'order':
            fields.append('"order" = ?')
            values.append(value)
        else:
            fields.append(f'{key} = ?')
            values.append(value)

    if fields:
        values.append(task_id)
        cursor.execute(f"UPDATE tasks SET {', '.join(fields)} WHERE id = ?", tuple(values))

    cursor.execute('SELECT * FROM tasks WHERE id = ?', (task_id,))
    return row_to_task(cursor.fetchone())


def get_task_and_project(task_id: str):
    """Obtiene una tarea normalizada y su proyecto asociado (o None si no existe)."""
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM tasks WHERE id = ?', (task_id,))
        t_row = cursor.fetchone()
        if not t_row:
            return None, None
        task = row_to_task(t_row)
        cursor.execute('SELECT * FROM projects WHERE id = ?', (task['projectId'],))
        p_row = cursor.fetchone()
        project = dict(p_row) if p_row else None
        return task, project


def get_project_tasks_summary(project_id: str, exclude_task_id: Optional[str] = None) -> list:
    """Devuelve un resumen de las tareas hermanas del mismo proyecto para dar contexto al PM."""
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute(
            'SELECT id, title, epic, status, description FROM tasks WHERE projectId = ? ORDER BY "order" ASC',
            (project_id,),
        )
        rows = [dict(r) for r in cursor.fetchall()]
    if exclude_task_id:
        rows = [r for r in rows if r['id'] != exclude_task_id]
    return rows[:25]
