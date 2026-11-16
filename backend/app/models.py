from typing import List, Optional, Literal
from pydantic import BaseModel, Field

PriorityType = Literal['low', 'medium', 'high', 'urgent']
DifficultyType = Literal['easy', 'medium', 'hard']
TaskStatusType = Literal['backlog', 'scheduled_today', 'in_progress', 'completed', 'deferred']

# --- PROYECTOS ---
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = ''
    color: Optional[str] = '#2563EB'
    targetHours: Optional[float] = 25.0
    status: Optional[str] = 'active'

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    id: str
    createdAt: str

# --- TAREAS ---
class TaskBase(BaseModel):
    projectId: str
    title: str
    description: Optional[str] = ''
    estimatedMinutes: int = 45
    priority: PriorityType = 'medium'
    difficulty: DifficultyType = 'medium'

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    projectId: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    estimatedMinutes: Optional[int] = None
    actualMinutes: Optional[int] = None
    status: Optional[TaskStatusType] = None
    priority: Optional[PriorityType] = None
    difficulty: Optional[DifficultyType] = None
    scheduledDate: Optional[str] = None
    completedAt: Optional[str] = None
    deferredCount: Optional[int] = None
    order: Optional[int] = None

class TaskResponse(TaskBase):
    id: str
    actualMinutes: int = 0
    status: TaskStatusType = 'backlog'
    deferredCount: int = 0
    scheduledDate: Optional[str] = None
    completedAt: Optional[str] = None
    order: int = 0

# --- CAPACIDAD DIARIA ---
class CapacityAdjustRequest(BaseModel):
    deltaMinutes: int
    isAbsolute: bool = False

class DailyPlanResponse(BaseModel):
    date: str
    baseCapacityMinutes: int
    extraMinutesAdjustment: int
    totalCapacityMinutes: int
    completed: bool

# --- CONFIGURACIÓN ---
class UserSettingsModel(BaseModel):
    defaultDailyHours: float = 2.5
    aiProvider: Literal['gemini', 'openai', 'groq'] = 'gemini'
    apiKey: str = ''
    customModel: Optional[str] = None
    strictness: Literal['gentle', 'balanced', 'tough_love'] = 'balanced'
    pomodoroWorkMins: int = 45
    pomodoroBreakMins: int = 10
    soundEnabled: bool = True

# --- IA Y ASISTENTE ---
class TaskActionPlanResponse(BaseModel):
    summary: str
    steps: List[str]
    filesToTouch: List[str]
    pitfall: str
    quickSnippet: Optional[str] = ''

class TaskEvaluationRequest(BaseModel):
    title: str
    description: Optional[str] = ''
    projectId: Optional[str] = None

class TaskEvaluationResponse(BaseModel):
    isUseful: bool
    verdict: str
    suggestedPriority: PriorityType
    estimatedMinutes: int
    breakdownWarning: Optional[str] = None

class ProposedTaskModel(BaseModel):
    id: str
    title: str
    description: str
    estimatedMinutes: int
    priority: PriorityType
    difficulty: DifficultyType

class RoadmapGenerateRequest(BaseModel):
    name: str
    description: str
    targetHours: Optional[float] = 25.0

class RoadmapRefineRequest(BaseModel):
    projectName: str
    projectDescription: str
    currentTasks: List[ProposedTaskModel]
    instruction: str

class RoadmapRefineResponse(BaseModel):
    reply: str
    updatedTasks: List[ProposedTaskModel]

# --- CHAT ---
class ChatMessageModel(BaseModel):
    id: str
    role: Literal['user', 'assistant', 'system']
    content: str
    timestamp: str

class ChatSendRequest(BaseModel):
    message: str

# --- STATS ---
class WeeklyActivityItem(BaseModel):
    date: str
    dayName: str
    plannedHours: float
    actualHours: float

class ProjectProgressItem(BaseModel):
    id: str
    name: str
    color: str
    completedHours: float
    totalHours: float
    percentage: int

class StatsResponse(BaseModel):
    streakDays: int
    totalHoursCompleted: float
    weeklyHoursCompleted: float
    todayPlannedMinutes: int
    todayWorkedMinutes: int
    todayCompletionRate: int
    procrastinationScore: int
    totalTasksFinished: int
    accuracyRatio: float
    weeklyActivity: List[WeeklyActivityItem]
    projectProgress: List[ProjectProgressItem]
