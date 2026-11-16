import { Project, Task, UserSettings, ProductivityStats, TaskActionPlan, TaskPMEvaluation, ProposedTask, ChatMessage, DailyPlan } from '../types';

const API_BASE = 'http://127.0.0.1:8000/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API Error [${res.status}]: ${errText}`);
    }

    return await res.json();
  } catch (err) {
    console.warn(`Error llamando a backend FastAPI (${url}):`, err);
    throw err;
  }
}

export const api = {
  // Health
  checkHealth: () => request<{ status: string }>('/health'),

  // Proyectos
  getProjects: () => request<Project[]>('/projects'),
  createProject: (data: Partial<Project>) => request<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  deleteProject: (id: string) => request<{ success: boolean }>(`/projects/${id}`, { method: 'DELETE' }),

  // Tareas
  getTasks: (scheduledDate?: string) => request<Task[]>(`/tasks${scheduledDate ? `?scheduledDate=${scheduledDate}` : ''}`),
  createTask: (data: Partial<Task>) => request<Task>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: string, updates: Partial<Task>) => request<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
  deleteTask: (id: string) => request<{ success: boolean }>(`/tasks/${id}`, { method: 'DELETE' }),
  logTaskTime: (id: string, minutes: number) => request<{ success: boolean }>(`/tasks/${id}/log-time`, { method: 'POST', body: JSON.stringify({ minutes }) }),

  // Capacidad Diaria
  getDailyPlan: (date?: string) => request<DailyPlan & { totalCapacityMinutes: number }>(`/daily-plan${date ? `?date=${date}` : ''}`),
  adjustCapacity: (deltaMinutes: number, isAbsolute: boolean = false) => request<{ newTotalCapacity: number; tasksAdded: Task[]; tasksDeferred: Task[] }>('/daily-plan/adjust', {
    method: 'POST',
    body: JSON.stringify({ deltaMinutes, isAbsolute })
  }),

  // Rendimiento & Stats
  getStats: () => request<ProductivityStats & { weeklyActivity: any[]; projectProgress: any[] }>('/stats'),

  // Configuración
  getSettings: () => request<UserSettings>('/settings'),
  saveSettings: (settings: UserSettings) => request<UserSettings>('/settings', { method: 'POST', body: JSON.stringify(settings) }),

  // Chatbot
  getChatHistory: () => request<ChatMessage[]>('/chat'),
  sendChatMessage: (message: string) => request<ChatMessage>('/chat', { method: 'POST', body: JSON.stringify({ message }) }),
  clearChatHistory: () => request<{ success: boolean }>('/chat', { method: 'DELETE' }),

  // Funcionalidades de IA especializadas
  getTaskActionPlan: (taskId: string) => request<TaskActionPlan>('/ai/task-guide', { method: 'POST', body: JSON.stringify({ taskId }) }),
  evaluateTask: (title: string, description: string = '', projectId?: string) => request<TaskPMEvaluation>('/ai/evaluate-task', {
    method: 'POST',
    body: JSON.stringify({ title, description, projectId })
  }),
  generateRoadmap: (name: string, description: string, targetHours: number = 25) => request<ProposedTask[]>('/ai/roadmap', {
    method: 'POST',
    body: JSON.stringify({ name, description, targetHours })
  }),
  refineRoadmap: (projectName: string, projectDescription: string, currentTasks: ProposedTask[], instruction: string) => request<{ reply: string; updatedTasks: ProposedTask[] }>('/ai/refine-roadmap', {
    method: 'POST',
    body: JSON.stringify({ projectName, projectDescription, currentTasks, instruction })
  })
};
