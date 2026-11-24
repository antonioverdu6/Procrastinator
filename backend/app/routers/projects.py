import json
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, HTTPException

from ..lib.db_helpers import db_session, get_next_task_order, insert_task_row
from ..lib.json_utils import safe_json_loads
from ..lib.repo_reader import fetch_repo_context
from ..models import (
    CommitProjectPlanRequest,
    CommitProjectPlanResponse,
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
    RepoPreviewResponse,
)
from ..scheduler import get_settings

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=List[ProjectResponse])
def get_projects():
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM projects ORDER BY createdAt DESC')
        return [dict(r) for r in cursor.fetchall()]


@router.post("", response_model=ProjectResponse)
def create_project(project: ProjectCreate):
    project_id = f"proj-{int(datetime.now().timestamp() * 1000)}"
    now_iso = datetime.now(timezone.utc).isoformat()
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO projects (id, name, description, color, targetHours, status, repoUrl, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            (
                project_id,
                project.name,
                project.description,
                project.color,
                project.targetHours,
                project.status,
                (project.repoUrl or '').strip(),
                now_iso,
            ),
        )
        cursor.execute('SELECT * FROM projects WHERE id = ?', (project_id,))
        return dict(cursor.fetchone())


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: str, updates: ProjectUpdate):
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM projects WHERE id = ?', (project_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Proyecto no encontrado")

        fields = []
        values = []
        for key, value in updates.dict(exclude_unset=True).items():
            fields.append(f"{key} = ?")
            values.append(value.strip() if isinstance(value, str) else value)

        if fields:
            values.append(project_id)
            cursor.execute(f"UPDATE projects SET {', '.join(fields)} WHERE id = ?", tuple(values))

        cursor.execute('SELECT * FROM projects WHERE id = ?', (project_id,))
        return dict(cursor.fetchone())


@router.get("/{project_id}/repo-preview", response_model=RepoPreviewResponse)
async def preview_project_repo(project_id: str):
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM projects WHERE id = ?', (project_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Proyecto no encontrado")
        project = dict(row)

    settings = get_settings()
    repo_ctx = await fetch_repo_context(
        project.get('repoUrl', ''),
        query_text=project.get('name', ''),
        github_token=settings.get('githubToken', ''),
    )
    return {
        "connected": bool(repo_ctx.get("connected")),
        "repoLabel": repo_ctx.get("repoLabel", ""),
        "defaultBranch": repo_ctx.get("defaultBranch"),
        "language": repo_ctx.get("language"),
        "filesCount": repo_ctx.get("filesCount", 0),
        "sampleFiles": repo_ctx.get("treePreview", [])[:12],
        "error": repo_ctx.get("error"),
    }


@router.post("/commit-plan", response_model=CommitProjectPlanResponse)
def commit_project_plan(payload: CommitProjectPlanRequest):
    """Crea un proyecto y vuelca en bloque todas sus tareas (con épica y subtareas) en el backlog."""
    project_id = f"proj-{int(datetime.now().timestamp() * 1000)}"
    now_iso = datetime.now(timezone.utc).isoformat()

    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO projects (id, name, description, color, targetHours, status, repoUrl, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            (
                project_id,
                payload.name.strip(),
                payload.description or '',
                payload.color or '#2563EB',
                payload.targetHours or 25.0,
                'active',
                (payload.repoUrl or '').strip(),
                now_iso,
            ),
        )

        base_order = get_next_task_order(cursor)
        created_tasks = [
            insert_task_row(
                cursor,
                project_id=project_id,
                title=pt.title,
                description=pt.description or '',
                epic=pt.epic or 'General',
                subtasks=[s.dict() for s in pt.subtasks],
                estimated_minutes=pt.estimatedMinutes,
                priority=pt.priority,
                difficulty=pt.difficulty,
                order_val=base_order + idx,
            )
            for idx, pt in enumerate(payload.tasks)
        ]

        if payload.sourceMessageId:
            cursor.execute('SELECT metadata FROM chat_messages WHERE id = ?', (payload.sourceMessageId,))
            msg_row = cursor.fetchone()
            if msg_row:
                meta = safe_json_loads(msg_row['metadata'], {})
                if isinstance(meta.get('planProposal'), dict):
                    meta['planProposal']['applied'] = True
                    meta['planProposal']['createdProjectId'] = project_id
                actions = list(meta.get('actionsTaken') or [])
                actions.append(f"Proyecto '{payload.name.strip()}' creado con {len(created_tasks)} tareas")
                meta['actionsTaken'] = actions
                cursor.execute(
                    'UPDATE chat_messages SET metadata = ? WHERE id = ?',
                    (json.dumps(meta, ensure_ascii=False), payload.sourceMessageId),
                )

        cursor.execute('SELECT * FROM projects WHERE id = ?', (project_id,))
        proj_row = dict(cursor.fetchone())

    return {
        "project": proj_row,
        "tasksCreated": len(created_tasks),
        "tasks": created_tasks,
    }


@router.delete("/{project_id}")
def delete_project(project_id: str):
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM tasks WHERE projectId = ?', (project_id,))
        cursor.execute('DELETE FROM projects WHERE id = ?', (project_id,))
    return {"success": True}
