import { Project, Task, DailyPlan, WorkSession, ChatMessage, UserSettings } from '../types';

const STORAGE_KEYS = {
  PROJECTS: 'procrastinator_projects',
  TASKS: 'procrastinator_tasks',
  DAILY_PLANS: 'procrastinator_daily_plans',
  SESSIONS: 'procrastinator_sessions',
  CHAT_MESSAGES: 'procrastinator_chat_messages',
  SETTINGS: 'procrastinator_settings',
};

const DEFAULT_SETTINGS: UserSettings = {
  defaultDailyHours: 2.5, // 2.5h side-project sweet spot
  aiProvider: 'gemini',
  apiKey: '',
  strictness: 'balanced',
  pomodoroWorkMins: 45,
  pomodoroBreakMins: 10,
  soundEnabled: true,
  autoBreakdownTasks: true,
};

// Initial starter data for an instant high-quality experience
const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'SaaS Dashboard Pro',
    description: 'Plataforma web con analíticas en tiempo real y facturación Stripe',
    color: '#6366F1', // indigo
    status: 'active',
    targetHours: 35,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'proj-2',
    name: 'App Móvil React Native',
    description: 'Cliente móvil para sincronización offline de notas',
    color: '#10B981', // emerald
    status: 'active',
    targetHours: 20,
    createdAt: new Date().toISOString(),
  }
];

export const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const INITIAL_TASKS: Task[] = [
  {
    id: 'task-1',
    projectId: 'proj-1',
    title: 'Crear esquema Prisma y migración inicial',
    description: 'Definir modelos User, Team y Subscription con relaciones seguras.',
    estimatedMinutes: 45,
    actualMinutes: 40,
    status: 'completed',
    priority: 'high',
    difficulty: 'medium',
    deferredCount: 0,
    scheduledDate: getTodayDateString(),
    completedAt: new Date(Date.now() - 3600000).toISOString(),
    order: 1,
  },
  {
    id: 'task-2',
    projectId: 'proj-1',
    title: 'Implementar endpoint de autenticación JWT',
    description: 'Rutas /login, /register con hash bcrypt y cookies httpOnly.',
    estimatedMinutes: 50,
    actualMinutes: 20,
    status: 'in_progress',
    priority: 'urgent',
    difficulty: 'hard',
    deferredCount: 0,
    scheduledDate: getTodayDateString(),
    order: 2,
  },
  {
    id: 'task-3',
    projectId: 'proj-1',
    title: 'Diseñar componente de Header con selector de workspace',
    description: 'Crear navbar responsive con Tailwind y avatar de usuario.',
    estimatedMinutes: 40,
    actualMinutes: 0,
    status: 'scheduled_today',
    priority: 'medium',
    difficulty: 'easy',
    deferredCount: 0,
    scheduledDate: getTodayDateString(),
    order: 3,
  },
  {
    id: 'task-4',
    projectId: 'proj-1',
    title: 'Integrar Webhooks de Stripe para suscripciones',
    description: 'Manejar eventos customer.subscription.created y checkout.session.completed.',
    estimatedMinutes: 60,
    actualMinutes: 0,
    status: 'backlog',
    priority: 'high',
    difficulty: 'hard',
    deferredCount: 1,
    order: 4,
  },
  {
    id: 'task-5',
    projectId: 'proj-2',
    title: 'Configurar Expo Router y navegación por pestañas',
    description: 'Estructura base de carpetas y temas oscuro/claro.',
    estimatedMinutes: 45,
    actualMinutes: 0,
    status: 'backlog',
    priority: 'medium',
    difficulty: 'medium',
    deferredCount: 0,
    order: 5,
  }
];

export class StorageService {
  static getSettings(): UserSettings {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  static saveSettings(settings: UserSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  static getProjects(): Project[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(INITIAL_PROJECTS));
      return INITIAL_PROJECTS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_PROJECTS;
    }
  }

  static saveProjects(projects: Project[]): void {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  }

  static getTasks(): Task[] {
    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(INITIAL_TASKS));
      return INITIAL_TASKS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_TASKS;
    }
  }

  static saveTasks(tasks: Task[]): void {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  }

  static getDailyPlans(): Record<string, DailyPlan> {
    const raw = localStorage.getItem(STORAGE_KEYS.DAILY_PLANS);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  static saveDailyPlan(plan: DailyPlan): void {
    const plans = this.getDailyPlans();
    plans[plan.date] = plan;
    localStorage.setItem(STORAGE_KEYS.DAILY_PLANS, JSON.stringify(plans));
  }

  static getWorkSessions(): WorkSession[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (!raw) {
      // Create a few past realistic sessions for graphs
      const today = getTodayDateString();
      const demoSessions: WorkSession[] = [
        {
          id: 'sess-1',
          taskId: 'task-1',
          date: today,
          startTime: new Date(Date.now() - 7200000).toISOString(),
          endTime: new Date(Date.now() - 4800000).toISOString(),
          durationMinutes: 40,
          completedSubgoal: true
        }
      ];
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(demoSessions));
      return demoSessions;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static saveWorkSession(session: WorkSession): void {
    const sessions = this.getWorkSessions();
    sessions.push(session);
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  }

  static getChatMessages(): ChatMessage[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CHAT_MESSAGES);
    if (!raw) {
      const initialMsgs: ChatMessage[] = [
        {
          id: 'welcome-1',
          role: 'assistant',
          content: '¡Hola! Soy tu Project Manager personal anti-procrastinación. 🎯\n\nTu objetivo de hoy está calculado para **2.5 horas** de desarrollo enfocado. Tienes 3 micro-tareas preparadas para avanzar sin agobios.\n\n¿Tienes más o menos tiempo hoy? Puedes decirme por ejemplo:\n- *"Hoy tengo 1 hora extra"* ⚡\n- *"Solo dispongo de 45 minutos"* ⏱️\n- *"¿Por dónde empiezo?"* 🚀',
          timestamp: new Date().toISOString(),
          suggestedActions: [
            { label: '⚡ +1h extra hoy', command: 'Tengo 1 hora extra hoy' },
            { label: '⏱️ Reducir a 1 hora hoy', command: 'Hoy solo puedo dedicar 1 hora' },
            { label: '🚀 ¿En qué me enfoco hoy?', command: '¿Cuál es mi prioridad máxima de hoy?' }
          ]
        }
      ];
      localStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(initialMsgs));
      return initialMsgs;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static saveChatMessages(messages: ChatMessage[]): void {
    localStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(messages));
  }
}
