import json
from typing import List

from fastapi import APIRouter, HTTPException

from ..database import row_to_task
from ..lib.db_helpers import db_session, get_task_and_project
from ..models import (
    ProposedTaskModel,
    RoadmapGenerateRequest,
    RoadmapRefineRequest,
    RoadmapRefineResponse,
    TaskActionPlanResponse,
    TaskBreakdownRequest,
    TaskEvaluationRequest,
    TaskEvaluationResponse,
    TaskResponse,
    TaskTechnicalAskRequest,
    TaskTechnicalAskResponse,
)
from ..scheduler import calculate_stats
from ..services.roadmap_service import generate_roadmap, refine_roadmap
from ..services.task_ai_service import (
    ask_task_technical_question,
    breakdown_task_into_subtasks,
    evaluate_task,
    get_task_action_plan,
)

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/task-guide", response_model=TaskActionPlanResponse)
async def task_action_guide(payload: dict):
    task_id = payload.get("taskId")
    task, project = get_task_and_project(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return await get_task_action_plan(task, project)


@router.post("/task-ask", response_model=TaskTechnicalAskResponse)
async def task_technical_ask(payload: TaskTechnicalAskRequest):
    task, project = get_task_and_project(payload.taskId)
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return await ask_task_technical_question(
        task,
        project,
        payload.question.strip(),
        [h.dict() for h in payload.history],
    )


@router.post("/breakdown-task", response_model=TaskResponse)
async def breakdown_existing_task(payload: TaskBreakdownRequest):
    task, project = get_task_and_project(payload.taskId)
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    subtasks = await breakdown_task_into_subtasks(task, project)
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute(
            'UPDATE tasks SET subtasks = ? WHERE id = ?',
            (json.dumps(subtasks, ensure_ascii=False), payload.taskId),
        )
        cursor.execute('SELECT * FROM tasks WHERE id = ?', (payload.taskId,))
        return row_to_task(cursor.fetchone())


@router.post("/evaluate-task", response_model=TaskEvaluationResponse)
async def evaluate_task_endpoint(payload: TaskEvaluationRequest):
    project = None
    if payload.projectId:
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM projects WHERE id = ?', (payload.projectId,))
            p_row = cursor.fetchone()
            project = dict(p_row) if p_row else None

    velocity = calculate_stats().get('accuracyRatio', 1.0)
    return await evaluate_task(payload.title, payload.description or '', project, velocity)


@router.post("/roadmap", response_model=List[ProposedTaskModel])
async def generate_project_roadmap(payload: RoadmapGenerateRequest):
    velocity = calculate_stats().get('accuracyRatio', 1.0)
    return await generate_roadmap(
        payload.name,
        payload.description,
        payload.targetHours,
        velocity,
        payload.scope or 'standard',
        payload.techStack or '',
    )


@router.post("/refine-roadmap", response_model=RoadmapRefineResponse)
async def refine_project_roadmap(payload: RoadmapRefineRequest):
    return await refine_roadmap(
        [t.dict() for t in payload.currentTasks],
        payload.instruction,
        payload.projectName,
        payload.projectDescription,
        payload.targetHours,
    )
