import json
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter

from ..database import row_to_chat_message, row_to_task
from ..lib.db_helpers import db_session, get_next_task_order, insert_task_row, update_task_row
from ..models import ChatMessageModel, ChatSendRequest
from ..scheduler import (
    adjust_today_capacity,
    calculate_stats,
    get_effective_capacity,
    get_today_date_str,
)
from ..services.copilot_service import handle_copilot_chat

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.get("", response_model=List[ChatMessageModel])
def get_chat_history():
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM chat_messages ORDER BY timestamp ASC')
        return [row_to_chat_message(r) for r in cursor.fetchall()]


@router.delete("")
def clear_chat_history():
    with db_session() as conn:
        conn.cursor().execute('DELETE FROM chat_messages')
    return {"success": True}


@router.post("", response_model=ChatMessageModel)
async def send_chat_message(payload: ChatSendRequest):
    msg_text = payload.message.strip()
    now_iso = datetime.now(timezone.utc).isoformat()
    today = get_today_date_str()

    with db_session() as conn:
        cursor = conn.cursor()
        user_msg_id = f"msg-{uuid.uuid4().hex[:10]}"
        cursor.execute(
            'INSERT INTO chat_messages (id, role, content, timestamp, metadata) VALUES (?, "user", ?, ?, ?)',
            (user_msg_id, msg_text, now_iso, '{}'),
        )

        cursor.execute('SELECT * FROM projects ORDER BY createdAt DESC')
        projects = [dict(r) for r in cursor.fetchall()]

        cursor.execute('SELECT * FROM tasks ORDER BY "order" ASC')
        all_tasks = [row_to_task(r) for r in cursor.fetchall()]

        cursor.execute('SELECT * FROM chat_messages ORDER BY timestamp DESC LIMIT 8')
        recent_msgs = [row_to_chat_message(r) for r in reversed(cursor.fetchall())]

    today_tasks = [
        t for t in all_tasks
        if t.get('scheduledDate') == today or t.get('status') in ('scheduled_today', 'in_progress')
    ]
    backlog_tasks = [t for t in all_tasks if t.get('status') == 'backlog']
    daily_plan = get_effective_capacity(today)
    velocity = calculate_stats().get('accuracyRatio', 1.0)

    ai_result = await handle_copilot_chat(
        msg_text,
        {
            "projects": projects,
            "todayTasks": today_tasks,
            "backlogTasks": backlog_tasks,
            "allTasks": all_tasks,
            "dailyPlan": daily_plan,
            "recentMessages": recent_msgs,
        },
        velocity=velocity,
    )

    actions_taken: List[str] = []

    cap_adj = ai_result.get("capacityAdjustment")
    if isinstance(cap_adj, dict) and cap_adj.get("deltaMinutes") is not None:
        adjust_today_capacity(int(cap_adj["deltaMinutes"]), bool(cap_adj.get("isAbsolute", False)))
        actions_taken.append(str(cap_adj.get("note") or "Capacidad diaria actualizada"))

    with db_session() as conn:
        cursor = conn.cursor()

        tasks_to_create = ai_result.get("tasksToCreate") or []
        if tasks_to_create:
            base_ord = get_next_task_order(cursor)
            for idx, nt in enumerate(tasks_to_create):
                insert_task_row(
                    cursor,
                    project_id=nt["projectId"],
                    title=nt["title"],
                    description=nt.get("description", ""),
                    epic=nt.get("epic", "General"),
                    subtasks=nt.get("subtasks", []),
                    estimated_minutes=int(nt.get("estimatedMinutes", 40)),
                    priority=nt.get("priority", "medium"),
                    difficulty=nt.get("difficulty", "medium"),
                    order_val=base_ord + idx,
                )
            actions_taken.append(f"{len(tasks_to_create)} tarea(s) añadida(s) al backlog")

        tasks_to_update = ai_result.get("tasksToUpdate") or []
        if tasks_to_update:
            updated_count = 0
            for upd in tasks_to_update:
                tid = upd.get("id")
                if not tid:
                    continue
                patch = {k: v for k, v in upd.items() if k != "id"}
                if update_task_row(cursor, tid, patch):
                    updated_count += 1
            if updated_count:
                actions_taken.append(f"{updated_count} tarea(s) actualizada(s)")

        tasks_to_delete = ai_result.get("tasksToDelete") or []
        if tasks_to_delete:
            deleted_count = 0
            for tid in tasks_to_delete:
                cursor.execute('DELETE FROM tasks WHERE id = ?', (tid,))
                deleted_count += cursor.rowcount
            if deleted_count:
                actions_taken.append(f"{deleted_count} tarea(s) eliminada(s)")

        project_updates = ai_result.get("projectUpdates") or []
        for pu in project_updates:
            if pu.get("id") and pu.get("description") is not None:
                cursor.execute(
                    'UPDATE projects SET description = ? WHERE id = ?',
                    (pu["description"], pu["id"]),
                )

        sub_attach = ai_result.get("subtasksToAttach")
        if isinstance(sub_attach, dict) and sub_attach.get("taskId") and sub_attach.get("subtasks"):
            cursor.execute('SELECT id, title FROM tasks WHERE id = ?', (sub_attach["taskId"],))
            t_row = cursor.fetchone()
            if t_row:
                cursor.execute(
                    'UPDATE tasks SET subtasks = ? WHERE id = ?',
                    (json.dumps(sub_attach["subtasks"], ensure_ascii=False), sub_attach["taskId"]),
                )
                actions_taken.append(f"Desglose guardado en '{t_row['title']}'")

        metadata: dict = {}
        if ai_result.get("suggestedActions"):
            metadata["suggestedActions"] = ai_result["suggestedActions"]
        if ai_result.get("planProposal"):
            metadata["planProposal"] = ai_result["planProposal"]
        if actions_taken:
            metadata["actionsTaken"] = actions_taken

        asst_msg_id = f"msg-{uuid.uuid4().hex[:10]}"
        now_iso_2 = datetime.now(timezone.utc).isoformat()
        assistant_content = ai_result.get("content") or "Listo."

        cursor.execute(
            'INSERT INTO chat_messages (id, role, content, timestamp, metadata) VALUES (?, "assistant", ?, ?, ?)',
            (asst_msg_id, assistant_content, now_iso_2, json.dumps(metadata, ensure_ascii=False)),
        )
        cursor.execute('SELECT * FROM chat_messages WHERE id = ?', (asst_msg_id,))
        return row_to_chat_message(cursor.fetchone())
