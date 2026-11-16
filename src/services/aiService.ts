import { ChatMessage, Task, Project } from '../types';
import { StorageService, getTodayDateString } from './storageService';
import { SchedulerEngine } from './schedulerEngine';

export class AIService {
  /**
   * Procesa el mensaje del usuario y devuelve la respuesta del asistente
   */
  static async sendMessage(userMessage: string): Promise<ChatMessage> {
    const today = getTodayDateString();
    const settings = StorageService.getSettings();
    const tasks = StorageService.getTasks();
    const projects = StorageService.getProjects();
    const { totalCapacityMinutes, plan } = SchedulerEngine.getEffectiveCapacity(today, settings);

    // 1. Detectar si el usuario está solicitando un cambio de horas o capacidad
    const capacityIntent = this.detectCapacityIntent(userMessage);
    let actionExecutedText = '';

    if (capacityIntent) {
      if (capacityIntent.type === 'add') {
        const result = SchedulerEngine.adjustTodayCapacity(capacityIntent.minutes, false);
        const addedNames = result.tasksAdded.map(t => `• **${t.title}** (${t.estimatedMinutes}m)`).join('\n');
        actionExecutedText = `⚡ **¡Capacidad actualizada!** He añadido **${capacityIntent.minutes} minutos** a tu jornada de hoy. Nueva capacidad total: **${(result.newTotalCapacity / 60).toFixed(1)}h**.\n` +
          (result.tasksAdded.length > 0
            ? `\nHe rescatado del backlog las siguientes tareas prioritarias:\n${addedNames}`
            : '\n(No había más tareas pendientes en el backlog listas para añadir)');
      } else if (capacityIntent.type === 'subtract') {
        const result = SchedulerEngine.adjustTodayCapacity(-capacityIntent.minutes, false);
        const deferredNames = result.tasksDeferred.map(t => `• **${t.title}** (${t.estimatedMinutes}m)`).join('\n');
        actionExecutedText = `🛡️ **Sin agobios.** He reducido tu objetivo de hoy en **${capacityIntent.minutes} minutos**. Capacidad ajustada: **${(result.newTotalCapacity / 60).toFixed(1)}h**.\n` +
          (result.tasksDeferred.length > 0
            ? `\nHe movido al backlog estas tareas secundarias para que te enfoques en lo esencial:\n${deferredNames}`
            : '\nTu lista actual ya se ajusta al tiempo disponible.');
      } else if (capacityIntent.type === 'set') {
        const result = SchedulerEngine.adjustTodayCapacity(capacityIntent.minutes, true);
        actionExecutedText = `🎯 **Jornada fijada a ${(result.newTotalCapacity / 60).toFixed(1)} horas** (${result.newTotalCapacity} minutos). Tu lista diaria ha sido recalculada.`;
      }
    }

    // 2. Si hay clave de API configurada, consultar al LLM con todo el contexto del desarrollador
    if (settings.apiKey && settings.apiKey.trim().length > 0) {
      try {
        const llmResponse = await this.callLLM(userMessage, settings, tasks, projects, totalCapacityMinutes, actionExecutedText);
        return {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: llmResponse,
          timestamp: new Date().toISOString(),
          suggestedActions: this.generateSuggestions(tasks)
        };
      } catch (err: any) {
        console.error('Error llamando a LLM:', err);
        // Fallback al bot local si la API falla
      }
    }

    // 3. Fallback inteligente sin API Key (Local Heurístico)
    let reply = '';
    if (actionExecutedText) {
      reply = `${actionExecutedText}\n\n¿Quieres que arranquemos con la tarea más importante del día?`;
    } else {
      reply = this.generateLocalResponse(userMessage, tasks, projects, totalCapacityMinutes);
    }

    return {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: reply,
      timestamp: new Date().toISOString(),
      suggestedActions: this.generateSuggestions(tasks)
    };
  }

  /**
   * Intenta detectar intenciones de tiempo (+1h, -30m, 2 horas extra, etc.)
   */
  private static detectCapacityIntent(text: string): { type: 'add' | 'subtract' | 'set'; minutes: number } | null {
    const lower = text.toLowerCase();

    // Sumar horas o minutos
    // Ejemplos: "+1h", "+2 horas", "1 hora extra", "tengo 2 horas mas", "anadir 45 minutos"
    const addHourMatch = lower.match(/(?:tengo|\+|añadir|sumar|poner|darme)?\s*(\d+(?:\.\d+)?)\s*(?:hora|horas|h)\s*(?:extra|más|mas)?/i);
    if (addHourMatch && (lower.includes('+') || lower.includes('extra') || lower.includes('más') || lower.includes('mas') || lower.includes('añadir') || lower.includes('sumar') || lower.includes('tengo'))) {
      const hours = parseFloat(addHourMatch[1]);
      if (hours > 0 && hours <= 8) {
        return { type: 'add', minutes: Math.round(hours * 60) };
      }
    }

    // Restar tiempo / reducir
    // Ejemplos: "-1h", "1 hora menos", "hoy menos tiempo", "quitar 30 minutos", "estoy cansado"
    const subHourMatch = lower.match(/(?:-|quitar|restar|reducir)\s*(\d+(?:\.\d+)?)\s*(?:hora|horas|h)/i);
    if (subHourMatch) {
      return { type: 'subtract', minutes: Math.round(parseFloat(subHourMatch[1]) * 60) };
    }

    // Fijar tiempo exacto: "hoy solo puedo 1 hora", "solo tengo 45 minutos"
    const exactMatch = lower.match(/(?:solo|únicamente|dispongo de|puedo)\s*(?:hacer|dedicar)?\s*(\d+(?:\.\d+)?)\s*(?:hora|horas|h)/i);
    if (exactMatch) {
      return { type: 'set', minutes: Math.round(parseFloat(exactMatch[1]) * 60) };
    }

    const exactMinsMatch = lower.match(/(?:solo|únicamente|dispongo de|puedo)\s*(\d+)\s*(?:min|minutos)/i);
    if (exactMinsMatch) {
      return { type: 'set', minutes: parseInt(exactMinsMatch[1], 10) };
    }

    return null;
  }

  /**
   * Llamada al proveedor LLM elegido por el usuario (Gemini, OpenAI, Groq, etc.)
   */
  private static async callLLM(
    userMessage: string,
    settings: any,
    tasks: Task[],
    projects: Project[],
    dailyMinutes: number,
    systemNote: string
  ): Promise<string> {
    const today = getTodayDateString();
    const scheduledTasks = tasks.filter(t => t.scheduledDate === today);
    const activeProjectNames = projects.map(p => p.name).join(', ');

    const systemPrompt = `Eres DevPace, un Project Manager y coach técnico anti-procrastinación para un programador que desarrolla proyectos en solitario.
Tu misión principal es evitar que el usuario se agobie, abandone o postergue sus desarrollos.
Reglas clave:
1. Sé conciso, pragmático y motivador. Nada de rollos teóricos largos.
2. Promueve siempre el principio de "pequeñas victorias": tareas atómicas de 30-45 minutos.
3. Si el usuario está cansado o con poco tiempo, apóyalo para que haga aunque sea una sola micro-tarea de 20 minutos ("mejor hecho que perfecto").
4. Si el usuario propone una tarea grande, sugiérele desglosarla en 2 o 3 subtareas.
5. Si el sistema ya aplicó un ajuste de capacidad, ten en cuenta la siguiente nota técnica: "${systemNote}".

Estado actual del usuario:
- Proyectos activos: ${activeProjectNames || 'Ninguno aún'}
- Capacidad diaria planificada para hoy: ${(dailyMinutes / 60).toFixed(1)} horas (${dailyMinutes} minutos)
- Tareas programadas para hoy: ${scheduledTasks.length} tareas (${scheduledTasks.map(t => `${t.title} [${t.status}]`).join('; ') || 'Ninguna tarea para hoy aún'})
`;

    // Proveedor: Gemini
    if (settings.aiProvider === 'gemini') {
      const model = settings.customModel || 'gemini-1.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.apiKey}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nMensaje del desarrollador: "${userMessage}"` }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 600
          }
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Gemini API error: ${res.status} - ${errorText}`);
      }

      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No pude generar una respuesta en este momento.';
    }

    // Proveedor: OpenAI / Groq / OpenRouter / Compatible
    const endpoint = settings.aiProvider === 'groq'
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

    const defaultModel = settings.aiProvider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';
    const model = settings.customModel || defaultModel;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 600
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`AI API error: ${res.status} - ${errorText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No pude generar respuesta.';
  }

  /**
   * Generador de respuesta local cuando no hay API Key configurada
   */
  private static generateLocalResponse(userMessage: string, tasks: Task[], projects: Project[], dailyMinutes: number): string {
    const lower = userMessage.toLowerCase();
    const today = getTodayDateString();
    const todayTasks = tasks.filter(t => t.scheduledDate === today);
    const inProgress = todayTasks.find(t => t.status === 'in_progress');
    const pending = todayTasks.filter(t => t.status === 'scheduled_today');

    if (lower.includes('empezar') || lower.includes('prioridad') || lower.includes('foco') || lower.includes('que hago')) {
      if (inProgress) {
        return `🎯 Tu foco actual es: **"${inProgress.title}"** (~${inProgress.estimatedMinutes}m).\n\nActiva el temporizador de flujo y concéntrate exclusivamente en este bloque. No mires nada más hasta completarlo.`;
      }
      if (pending.length > 0) {
        return `🚀 Para hoy te recomiendo arrancar con: **"${pending[0].title}"** (${pending[0].estimatedMinutes} min).\n\nEs la tarea con mejor ratio impacto/esfuerzo para darte una victoria rápida y activar el estado de flujo.`;
      }
      return `Tienes el día libre de tareas programadas. Puedes agregar una nueva tarea o pedirme: *"Añade 1 hora de trabajo para hoy"*.`;
    }

    if (lower.includes('desglose') || lower.includes('dividir') || lower.includes('grande') || lower.includes('crear')) {
      return `💡 **Estrategia Anti-Procrastinación:** Cuando una tarea parezca abrumadora, divídela en 3 fases:\n\n1. **Preparación / Config:** Crear carpetas, tipos e interfaces (20 min)\n2. **Lógica mínima (Happy Path):** Que funcione el caso básico sin pulir (40 min)\n3. **Refactor & Edge Cases:** Manejo de errores y estilos (30 min)\n\n¿Quieres que añadamos esta estructura a tus tareas?`;
    }

    if (lower.includes('hola') || lower.includes('buenos dias') || lower.includes('buenas')) {
      return `¡Hola! Listo para una sesión de desarrollo productiva. Tienes **${(dailyMinutes / 60).toFixed(1)} horas** asignadas para hoy repartidas en ${todayTasks.length} micro-tareas.\n\nRecuerda: si tienes más energía o estás cansado, solo dime *"Hoy tengo 1h extra"* o *"Solo puedo hacer 45m"*.`;
    }

    return `He tomado nota de tu consulta. Tu objetivo actual es de **${(dailyMinutes / 60).toFixed(1)} horas** diarias.\n\nPuedes pedirme ajustar tu tiempo con comandos como:\n• *"Añadir 1 hora extra hoy"*\n• *"Hoy solo puedo dedicar 45 minutos"*\n• *"¿Cuál es mi prioridad?"*\n\n*(Consejo: Puedes añadir tu API Key de Gemini u OpenAI en Ajustes ⚙️ para tener respuestas inteligentes y creativas ilimitadas).*`;
  }

  /**
   * Genera botones de acción rápida según el estado actual
   */
  private static generateSuggestions(tasks: Task[]) {
    return [
      { label: '⚡ +1h extra hoy', command: 'Tengo 1 hora extra hoy' },
      { label: '🛡️ Solo 1h hoy', command: 'Hoy solo puedo hacer 1 hora' },
      { label: '🎯 ¿Por dónde arranco?', command: '¿Cuál es mi prioridad de hoy?' },
    ];
  }
}
