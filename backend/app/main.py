import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .database import init_db, get_connection
from .models import (
    ProjectCreate, ProjectResponse,
    TaskCreate, TaskUpdate, TaskResponse,
    CapacityAdjustRequest, DailyPlanResponse,
    UserSettingsModel, StatsResponse,
    ChatMessageModel, ChatSendRequest,
    TaskActionPlanResponse, TaskEvaluationRequest, TaskEvaluationResponse,
    RoadmapGenerateRequest, ProposedTaskModel,
    RoadmapRefineRequest, RoadmapRefineResponse
)
from .scheduler import (
    get_today_date_str, get_effective_capacity,
    adjust_today_capacity, calculate_stats, get_settings
)
from .ai_service import (
    get_task_action_plan, evaluate_task,
    generate_roadmap, refine_roadmap, query_llm
)

app = FastAPI(title="Procrastinator API", version="1.0.0")

# CORS abierto para desarrollo local y Electron
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "Procrastinator API", "time": datetime.now(timezone.utc).isoformat()}

# --- PROYECTOS ---
@app.get("/api/projects", response_model=List[ProjectResponse])
def get_projects():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM projects ORDER BY createdAt DESC')
    projects = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return projects

@app.post("/api/projects", response_model=ProjectResponse)
def create_project(project: ProjectCreate):
    conn = get_connection()
    cursor = conn.cursor()
    project_id = f"proj-{int(datetime.now().timestamp() * 1000)}"
    now_iso = datetime.now(timezone.utc).isoformat()

    cursor.execute(
        'INSERT INTO projects (id, name, description, color, targetHours, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        (project_id, project.name, project.description, project.color, project.targetHours, project.status, now_iso)
    )
    conn.commit()
    cursor.execute('SELECT * FROM projects WHERE id = ?', (project_id,))
    row = dict(cursor.fetchone())
    conn.close()
    return row

@app.delete("/api/projects/{project_id}")
def delete_project(project_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM tasks WHERE projectId = ?', (project_id,))
    cursor.execute('DELETE FROM projects WHERE id = ?', (project_id,))
    conn.commit()
    conn.close()
    return {"success": True}

# --- TAREAS ---
@app.get("/api/tasks", response_model=List[TaskResponse])
def get_tasks(scheduledDate: Optional[str] = None):
    conn = get_connection()
    cursor = conn.cursor()
    if scheduledDate:
        cursor.execute('SELECT * FROM tasks WHERE scheduledDate = ? ORDER BY "order" ASC', (scheduledDate,))
    else:
        cursor.execute('SELECT * FROM tasks ORDER BY "order" ASC')
    tasks = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return tasks

@app.post("/api/tasks", response_model=TaskResponse)
def create_task(task: TaskCreate):
    conn = get_connection()
    cursor = conn.cursor()
    task_id = f"task-{int(datetime.now().timestamp() * 1000)}"

    cursor.execute('SELECT COUNT(*) as count FROM tasks')
    order_val = cursor.fetchone()['count'] + 1

    cursor.execute('''
    INSERT INTO tasks (id, projectId, title, description, estimatedMinutes, actualMinutes, status, priority, difficulty, deferredCount, scheduledDate, completedAt, "order")
    VALUES (?, ?, ?, ?, ?, 0, 'backlog', ?, ?, 0, NULL, NULL, ?)
    ''', (task_id, task.projectId, task.title, task.description, task.estimatedMinutes, task.priority, task.difficulty, order_val))

    conn.commit()
    cursor.execute('SELECT * FROM tasks WHERE id = ?', (task_id,))
    row = dict(cursor.fetchone())
    conn.close()
    return row

@app.patch("/api/tasks/{task_id}", response_model=TaskResponse)
def update_task(task_id: str, updates: TaskUpdate):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM tasks WHERE id = ?', (task_id,))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    fields = []
    values = []
    for k, v in updates.dict(exclude_unset=True).items():
        fields.append(f'"{k}" = ?' if k == 'order' else f'{k} = ?')
        values.append(v)

    if fields:
        values.append(task_id)
        sql = f"UPDATE tasks SET {', '.join(fields)} WHERE id = ?"
        cursor.execute(sql, tuple(values))
        conn.commit()

    cursor.execute('SELECT * FROM tasks WHERE id = ?', (task_id,))
    updated_row = dict(cursor.fetchone())
    conn.close()
    return updated_row

@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM tasks WHERE id = ?', (task_id,))
    conn.commit()
    conn.close()
    return {"success": True}

# --- LOG DE TIEMPO / SESIONES ---
@app.post("/api/tasks/{task_id}/log-time")
def log_task_time(task_id: str, payload: dict):
    minutes = payload.get("minutes", 0)
    today = get_today_date_str()
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('UPDATE tasks SET actualMinutes = actualMinutes + ? WHERE id = ?', (minutes, task_id))
    session_id = f"sess-{int(datetime.now().timestamp() * 1000)}"
    now_iso = datetime.now(timezone.utc).isoformat()
    cursor.execute(
        'INSERT INTO work_sessions (id, taskId, date, startTime, durationMinutes) VALUES (?, ?, ?, ?, ?)',
        (session_id, task_id, today, now_iso, minutes)
    )
    conn.commit()
    conn.close()
    return {"success": True, "addedMinutes": minutes}

# --- CAPACIDAD DIARIA ---
@app.get("/api/daily-plan", response_model=DailyPlanResponse)
def get_daily_plan(date: Optional[str] = None):
    d = date or get_today_date_str()
    return get_effective_capacity(d)

@app.post("/api/daily-plan/adjust")
def adjust_capacity(payload: CapacityAdjustRequest):
    return adjust_today_capacity(payload.deltaMinutes, payload.isAbsolute)

# --- STATS ---
@app.get("/api/stats", response_model=StatsResponse)
def get_stats():
    return calculate_stats()

# --- CONFIGURACIÓN ---
@app.get("/api/settings", response_model=UserSettingsModel)
def get_user_settings():
    return get_settings()

@app.post("/api/settings", response_model=UserSettingsModel)
def update_user_settings(settings: UserSettingsModel):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
    UPDATE settings SET
        defaultDailyHours = ?,
        aiProvider = ?,
        apiKey = ?,
        customModel = ?,
        strictness = ?,
        pomodoroWorkMins = ?,
        pomodoroBreakMins = ?,
        soundEnabled = ?
    WHERE id = 1
    ''', (
        settings.defaultDailyHours,
        settings.aiProvider,
        settings.apiKey,
        settings.customModel,
        settings.strictness,
        settings.pomodoroWorkMins,
        settings.pomodoroBreakMins,
        1 if settings.soundEnabled else 0
    ))
    conn.commit()
    conn.close()
    return settings

# --- CHAT ---
@app.get("/api/chat", response_model=List[ChatMessageModel])
def get_chat_history():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM chat_messages ORDER BY timestamp ASC')
    msgs = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return msgs

@app.delete("/api/chat")
def clear_chat_history():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM chat_messages')
    conn.commit()
    conn.close()
    return {"success": True}

@app.post("/api/chat", response_model=ChatMessageModel)
async def send_chat_message(payload: ChatSendRequest):
    msg_text = payload.message.strip()
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_connection()
    cursor = conn.cursor()

    # Guardar mensaje usuario
    user_msg_id = f"msg-{int(datetime.now().timestamp() * 1000)}"
    cursor.execute('INSERT INTO chat_messages (id, role, content, timestamp) VALUES (?, "user", ?, ?)', (user_msg_id, msg_text, now_iso))
    conn.commit()

    # Detectar cambios de capacidad al vuelo
    lower = msg_text.lower()
    action_note = ""
    if "+1h" in lower or "1 hora extra" in lower:
        adjust_today_capacity(60, False)
        action_note = "He añadido 1 hora extra a tu objetivo de hoy."
    elif "-1h" in lower or "1 hora menos" in lower:
        adjust_today_capacity(-60, False)
        action_note = "He reducido 1 hora de tu objetivo de hoy."
    elif "solo puedo 1 hora" in lower or "solo 1 hora" in lower:
        adjust_today_capacity(60, True)
        action_note = "He fijado tu objetivo de hoy a 1 hora exacta."

    # Responder mediante LLM o Fallback
    assistant_content = ""
    settings = get_settings()
    if settings.get('apiKey'):
        try:
            prompt = f"Mensaje del programador: '{msg_text}'\n{f'Acción aplicada por el sistema: {action_note}' if action_note else ''}"
            system = "Eres Procrastinator, un Project Manager y coach técnico para un desarrollador en solitario. Sé conciso, motivador y directo."
            assistant_content = await query_llm(prompt, system)
        except Exception:
            pass

    if not assistant_content:
        if action_note:
            assistant_content = f"⚡ {action_note} Tu lista diaria ha sido recalculada para que te enfoques sin agobios."
        else:
            assistant_content = f"Entendido: '{msg_text}'. Puedes pedirme sumar horas ('+1h extra') o recortar tu jornada si estás cansado."

    asst_msg_id = f"msg-{int(datetime.now().timestamp() * 1000) + 1}"
    now_iso_2 = datetime.now(timezone.utc).isoformat()
    cursor.execute('INSERT INTO chat_messages (id, role, content, timestamp) VALUES (?, "assistant", ?, ?)', (asst_msg_id, assistant_content, now_iso_2))
    conn.commit()
    conn.close()

    return {
        "id": asst_msg_id,
        "role": "assistant",
        "content": assistant_content,
        "timestamp": now_iso_2
    }

# --- FUNCIONALIDADES DE IA DEDICADAS ---
@app.post("/api/ai/task-guide", response_model=TaskActionPlanResponse)
async def task_action_guide(payload: dict):
    task_id = payload.get("taskId")
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM tasks WHERE id = ?', (task_id,))
    t_row = cursor.fetchone()
    if not t_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    task = dict(t_row)
    cursor.execute('SELECT * FROM projects WHERE id = ?', (task['projectId'],))
    p_row = cursor.fetchone()
    project = dict(p_row) if p_row else None
    conn.close()

    plan = await get_task_action_plan(task, project)
    return plan

@app.post("/api/ai/evaluate-task", response_model=TaskEvaluationResponse)
async def evaluate_task_endpoint(payload: TaskEvaluationRequest):
    project = None
    if payload.projectId:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM projects WHERE id = ?', (payload.projectId,))
        p_row = cursor.fetchone()
        project = dict(p_row) if p_row else None
        conn.close()

    stats = calculate_stats()
    velocity = stats.get('accuracyRatio', 1.0)
    verdict = await evaluate_task(payload.title, payload.description or '', project, velocity)
    return verdict

@app.post("/api/ai/roadmap", response_model=List[ProposedTaskModel])
async def generate_project_roadmap(payload: RoadmapGenerateRequest):
    stats = calculate_stats()
    velocity = stats.get('accuracyRatio', 1.0)
    tasks = await generate_roadmap(payload.name, payload.description, payload.targetHours or 25.0, velocity)
    return tasks

@app.post("/api/ai/refine-roadmap", response_model=RoadmapRefineResponse)
async def refine_project_roadmap(payload: RoadmapRefineRequest):
    result = await refine_roadmap(
        [t.dict() for t in payload.currentTasks],
        payload.instruction,
        payload.projectName,
        payload.projectDescription
    )
    return result
