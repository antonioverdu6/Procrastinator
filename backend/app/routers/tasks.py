from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException

from ..database import row_to_task
from ..lib.db_helpers import db_session, insert_task_row, update_task_row
from ..models import TaskCreate, TaskResponse, TaskUpdate
from ..scheduler import get_today_date_str

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=List[TaskResponse])
def get_tasks(scheduledDate: Optional[str] = None):
    with db_session() as conn:
        cursor = conn.cursor()
        if scheduledDate:
            cursor.execute('SELECT * FROM tasks WHERE scheduledDate = ? ORDER BY "order" ASC', (scheduledDate,))
        else:
            cursor.execute('SELECT * FROM tasks ORDER BY "order" ASC')
        return [row_to_task(r) for r in cursor.fetchall()]


@router.post("", response_model=TaskResponse)
def create_task(task: TaskCreate):
    with db_session() as conn:
        cursor = conn.cursor()
        return insert_task_row(
            cursor,
            project_id=task.projectId,
            title=task.title,
            description=task.description or '',
            epic=task.epic or 'General',
            subtasks=[s.dict() for s in task.subtasks],
            estimated_minutes=task.estimatedMinutes,
            priority=task.priority,
            difficulty=task.difficulty,
        )


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(task_id: str, updates: TaskUpdate):
    with db_session() as conn:
        updated = update_task_row(conn.cursor(), task_id, updates.dict(exclude_unset=True))
        if not updated:
            raise HTTPException(status_code=404, detail="Tarea no encontrada")
        return updated


@router.delete("/{task_id}")
def delete_task(task_id: str):
    with db_session() as conn:
        conn.cursor().execute('DELETE FROM tasks WHERE id = ?', (task_id,))
    return {"success": True}


@router.post("/{task_id}/log-time")
def log_task_time(task_id: str, payload: dict):
    minutes = payload.get("minutes", 0)
    today = get_today_date_str()
    session_id = f"sess-{int(datetime.now().timestamp() * 1000)}"
    now_iso = datetime.now(timezone.utc).isoformat()

    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute('UPDATE tasks SET actualMinutes = actualMinutes + ? WHERE id = ?', (minutes, task_id))
        cursor.execute(
            'INSERT INTO work_sessions (id, taskId, date, startTime, durationMinutes) VALUES (?, ?, ?, ?, ?)',
            (session_id, task_id, today, now_iso, minutes),
        )
    return {"success": True, "addedMinutes": minutes}
