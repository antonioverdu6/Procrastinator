export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type TaskStatus = 'backlog' | 'scheduled_today' | 'in_progress' | 'completed' | 'deferred';

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  deadline?: string;
  status: 'active' | 'paused' | 'completed';
  targetHours?: number;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  estimatedMinutes: number; // e.g. 45
  actualMinutes: number;    // cumulative actual time worked
  status: TaskStatus;
  priority: Priority;
  difficulty: Difficulty;
  deferredCount: number;    // times postponed (procrastination metric)
  scheduledDate?: string;   // YYYY-MM-DD
  completedAt?: string;     // ISO timestamp
  order: number;
  tags?: string[];
}

export interface DailyPlan {
  date: string; // YYYY-MM-DD
  baseCapacityMinutes: number; // default e.g. 150 min (2.5h)
  extraMinutesAdjustment: number; // e.g. +60 or -30 from chatbot
  completed: boolean;
  reflection?: string; // Daily wrap-up log
}

export interface WorkSession {
  id: string;
  taskId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // ISO
  endTime?: string;
  durationMinutes: number;
  completedSubgoal?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  suggestedActions?: {
    label: string;
    command: string;
    payload?: any;
  }[];
}

export interface UserSettings {
  defaultDailyHours: number; // 2.5 by default
  aiProvider: 'gemini' | 'openai' | 'groq' | 'anthropic';
  apiKey: string;
  customModel?: string;
  strictness: 'gentle' | 'balanced' | 'tough_love';
  pomodoroWorkMins: number; // 45
  pomodoroBreakMins: number; // 10
  soundEnabled: boolean;
  autoBreakdownTasks: boolean;
}

export interface WeeklyActivityPoint {
  date: string;
  dayName: string;
  plannedHours: number;
  actualHours: number;
  completionPercent?: number;
  tasksCount?: number;
}

export interface ProjectProgressPoint {
  id: string;
  name: string;
  color: string;
  completedHours: number;
  totalHours: number;
  percentage: number;
}

export interface DistributionPoint {
  label: string;
  count: number;
  color: string;
}

export interface ProductivityStats {
  streakDays: number;
  totalHoursCompleted: number;
  weeklyHoursCompleted: number;
  todayPlannedMinutes: number;
  todayWorkedMinutes: number;
  todayCompletionRate: number; // 0 - 100%
  procrastinationScore: number; // 0 - 100 (100 = high focus, low deferred)
  totalTasksFinished: number;
  accuracyRatio: number; // actual / estimated
  weeklyActivity?: WeeklyActivityPoint[];
  projectProgress?: ProjectProgressPoint[];
  priorityDistribution?: DistributionPoint[];
  difficultyDistribution?: DistributionPoint[];
}

export interface TaskActionPlan {
  summary: string;
  steps: string[];
  filesToTouch: string[];
  pitfall: string;
  quickSnippet?: string;
}

export interface TaskPMEvaluation {
  isUseful: boolean;
  verdict: string;
  suggestedPriority: Priority;
  estimatedMinutes: number;
  breakdownWarning?: string;
}

export interface ProposedTask {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  priority: Priority;
  difficulty: Difficulty;
}

