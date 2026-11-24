from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field

PriorityType = Literal['low', 'medium', 'high', 'urgent']
DifficultyType = Literal['easy', 'medium', 'hard']
TaskStatusType = Literal['backlog', 'scheduled_today', 'in_progress', 'completed', 'deferred']
PlanScopeType = Literal['mvp', 'standard', 'detailed']

# --- SUBTAREAS ---
class SubtaskModel(BaseModel):
    id: str
    title: str
    done: bool = False

# --- PROYECTOS ---
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = ''
    color: Optional[str] = '#2563EB'
    targetHours: Optional[float] = 25.0
    status: Optional[str] = 'active'
    repoUrl: Optional[str] = ''

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    targetHours: Optional[float] = None
    status: Optional[str] = None
    repoUrl: Optional[str] = None

class ProjectResponse(ProjectBase):
    id: str
    createdAt: str

class RepoPreviewResponse(BaseModel):
    connected: bool
    repoLabel: str = ''
    defaultBranch: Optional[str] = None
    language: Optional[str] = None
    filesCount: int = 0
    sampleFiles: List[str] = Field(default_factory=list)
    error: Optional[str] = None

# --- TAREAS ---
class TaskBase(BaseModel):
    projectId: str
    title: str
    description: Optional[str] = ''
    epic: Optional[str] = 'General'
    subtasks: List[SubtaskModel] = Field(default_factory=list)
    estimatedMinutes: int = 45
    priority: PriorityType = 'medium'
    difficulty: DifficultyType = 'medium'

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    projectId: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    epic: Optional[str] = None
    subtasks: Optional[List[SubtaskModel]] = None
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
    githubToken: Optional[str] = ''
    language: Literal['es', 'en'] = 'es'
    hasApiKey: Optional[bool] = None
    apiKeyPreview: Optional[str] = ''
    hasGithubToken: Optional[bool] = None
    githubTokenPreview: Optional[str] = ''
    clearApiKey: Optional[bool] = False
    clearGithubToken: Optional[bool] = False

# --- IA Y ASISTENTE ---
class TaskActionPlanResponse(BaseModel):
    summary: str
    architectureNotes: Optional[str] = ''
    steps: List[str]
    filesToTouch: List[str]
    pitfall: str
    quickSnippet: Optional[str] = ''
    repoContextUsed: bool = False
    repoLabel: Optional[str] = None

class TaskAskMessageModel(BaseModel):
    role: Literal['user', 'assistant']
    content: str

class TaskTechnicalAskRequest(BaseModel):
    taskId: str
    question: str
    history: List[TaskAskMessageModel] = Field(default_factory=list)

class TaskTechnicalAskResponse(BaseModel):
    answer: str
    referencedFiles: List[str] = Field(default_factory=list)
    codeSnippet: Optional[str] = ''
    repoUsed: bool = False
    repoLabel: Optional[str] = None

class TaskBreakdownRequest(BaseModel):
    taskId: str

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
    epic: str = 'General'
    title: str
    description: str
    estimatedMinutes: int
    priority: PriorityType
    difficulty: DifficultyType
    subtasks: List[SubtaskModel] = Field(default_factory=list)

class RoadmapGenerateRequest(BaseModel):
    name: str
    description: str
    targetHours: Optional[float] = None
    scope: Optional[PlanScopeType] = 'standard'
    techStack: Optional[str] = ''

class RoadmapRefineRequest(BaseModel):
    projectName: str
    projectDescription: str
    currentTasks: List[ProposedTaskModel]
    instruction: str
    targetHours: Optional[float] = None

class RoadmapRefineResponse(BaseModel):
    reply: str
    updatedTasks: List[ProposedTaskModel]

class ProjectPlanProposal(BaseModel):
    projectName: str
    projectDescription: str = ''
    targetHours: float = 25.0
    scope: str = 'standard'
    tasks: List[ProposedTaskModel] = Field(default_factory=list)
    applied: bool = False
    createdProjectId: Optional[str] = None

class CommitProjectPlanRequest(BaseModel):
    name: str
    description: Optional[str] = ''
    color: Optional[str] = '#2563EB'
    targetHours: Optional[float] = 25.0
    repoUrl: Optional[str] = ''
    tasks: List[ProposedTaskModel] = Field(default_factory=list)
    sourceMessageId: Optional[str] = None

class CommitProjectPlanResponse(BaseModel):
    project: ProjectResponse
    tasksCreated: int
    tasks: List[TaskResponse]

# --- CHAT ---
class ChatSuggestedAction(BaseModel):
    label: str
    command: str
    payload: Optional[Dict[str, Any]] = None

class ChatMessageModel(BaseModel):
    id: str
    role: Literal['user', 'assistant', 'system']
    content: str
    timestamp: str
    suggestedActions: Optional[List[ChatSuggestedAction]] = None
    planProposal: Optional[ProjectPlanProposal] = None
    actionsTaken: Optional[List[str]] = None

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
