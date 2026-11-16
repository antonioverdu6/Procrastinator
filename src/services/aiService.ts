import { ChatMessage, Task, Project, TaskActionPlan, TaskPMEvaluation, ProposedTask, Priority, Difficulty } from '../types';
import { StorageService, getTodayDateString } from './storageService';
import { SchedulerEngine } from './schedulerEngine';

export class AIService {
  /**
   * Ejecuta una consulta directa al LLM configurado (Gemini / OpenAI / Groq)
   */
  public static async queryLLM(prompt: string, systemPrompt: string = ''): Promise<string> {
    const settings = StorageService.getSettings();
    if (!settings.apiKey || settings.apiKey.trim().length === 0) {
      throw new Error('NO_API_KEY');
    }

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
              parts: [{ text: `${systemPrompt}\n\n${prompt}` }]
            }
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1200
          }
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Gemini API error: ${res.status} - ${errorText}`);
      }

      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    // Proveedor: OpenAI / Groq
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
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 1200
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`AI API error: ${res.status} - ${errorText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * 1. GUÍA DE EJECUCIÓN PARA LA TAREA ACTIVA
   * Pinchar en la tarea activa para obtener guía concreta paso a paso de qué hacer
   */
  static async getTaskActionPlan(task: Task, project?: Project): Promise<TaskActionPlan> {
    const prompt = `Actúa como Lead Developer pragmático y Project Manager anti-bloqueo.
El programador tiene activa esta tarea:
- Título: "${task.title}"
- Descripción: "${task.description || 'Sin descripción adicional'}"
- Proyecto: "${project?.name || 'General'}" (${project?.description || ''})
- Tiempo estimado: ${task.estimatedMinutes} minutos

Tu meta es desarmar la parálisis por análisis. Proporciona una guía hiper-concreta de ejecución:
Responde EXCLUSIVAMENTE con un JSON válido con esta estructura (sin explicaciones antes ni después):
{
  "summary": "Enfoque en 1 o 2 frases",
  "steps": [
    "1. Crear interfaz/tipo en src/types/...",
    "2. Escribir la función principal con el caso feliz...",
    "3. Añadir control de excepciones y validar...",
    "4. Probar en el componente/interfaz..."
  ],
  "filesToTouch": [
    "src/.../...",
    "tests/..."
  ],
  "pitfall": "La trampa o error donde suele perderse el tiempo tontamente en esta tarea",
  "quickSnippet": "// Ejemplo mínimo de código si aplica (o vacío si no es necesario)"
}`;

    const system = 'Eres un Lead Tech y Project Manager enfocado en resultados rápidos y código limpio.';

    try {
      const raw = await this.queryLLM(prompt, system);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e: any) {
      console.warn('Fallback local para plan de acción:', e.message);
    }

    // Fallback inteligente offline
    return {
      summary: `Enfoque modular para "${task.title}": implementa la lógica mínima viable en bloques de 15 minutos.`,
      steps: [
        `1. Definir los tipos o modelos de datos necesarios para "${task.title}".`,
        `2. Desarrollar la función o componente base con el flujo principal funcionando.`,
        `3. Comprobar casos límite y posibles fallos sin añadir complejidad innecesaria.`,
        `4. Hacer commit y verificar integración con el resto del proyecto.`
      ],
      filesToTouch: ['Archivos de lógica principal', 'Tipos / Modelos asociados'],
      pitfall: 'No intentes pulir estilos o casos hiper-raros ahora; busca que funcione el caso base primero.',
      quickSnippet: ''
    };
  }

  /**
   * 2. EVALUADOR DE TAREAS POR EL PM
   * Determina si la tarea es útil para el MVP o es pérdida de tiempo/sobreingeniería,
   * asigna prioridad y ajusta el tiempo según la velocidad real del desarrollador.
   */
  static async evaluateTaskWithPM(
    title: string,
    description: string,
    project?: Project
  ): Promise<TaskPMEvaluation> {
    const stats = SchedulerEngine.getStats();
    const velocity = stats.accuracyRatio || 1.0;

    const prompt = `Eres un Project Manager implacable y experimentado para un desarrollador en solitario.
El usuario quiere añadir esta tarea:
- Título: "${title}"
- Detalles: "${description || 'Ninguno'}"
- Proyecto: "${project?.name || 'General'}" (${project?.description || ''})
- Ratio histórico de velocidad del usuario: ${velocity}x (si es > 1.0, el usuario suele tardar más de lo previsto; si es < 1.0, es más rápido).

Evalúa:
1. ¿Aporta valor real o es sobreingeniería / procrastinación productiva?
2. ¿Qué prioridad real le corresponde ('urgent' | 'high' | 'medium' | 'low')?
3. ¿Cuántos minutos reales debería estimar considerando su velocidad histórica (mínimo 15, máximo 90 min)?
4. Si la tarea es muy grande (>60m), genera una advertencia de división.

Responde ÚNICAMENTE con un JSON con este formato exacto:
{
  "isUseful": true,
  "verdict": "Explicación directa y franca del PM de por qué es esencial o por qué huele a distracción",
  "suggestedPriority": "high",
  "estimatedMinutes": 45,
  "breakdownWarning": "Si es > 60m, sugerencia de cómo dividirla, o cadena vacía si está bien acotada"
}`;

    const system = 'Eres un Project Manager técnico estricto, realista y motivador.';

    try {
      const raw = await this.queryLLM(prompt, system);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          isUseful: Boolean(parsed.isUseful),
          verdict: parsed.verdict || 'Tarea aprobada para el proyecto.',
          suggestedPriority: (['urgent', 'high', 'medium', 'low'].includes(parsed.suggestedPriority) ? parsed.suggestedPriority : 'medium') as Priority,
          estimatedMinutes: Number(parsed.estimatedMinutes) || 45,
          breakdownWarning: parsed.breakdownWarning || undefined
        };
      }
    } catch (e: any) {
      console.warn('Fallback local para evaluación de tarea:', e.message);
    }

    // Fallback local heurístico si no hay API Key o falla
    const estimated = Math.round(45 * velocity);
    return {
      isUseful: true,
      verdict: `Tarea relevante para el avance del proyecto. Evaluada con factor de velocidad histórico (${velocity}x).`,
      suggestedPriority: 'medium',
      estimatedMinutes: Math.min(90, Math.max(20, estimated)),
      breakdownWarning: estimated > 60 ? 'El tiempo estimado supera 1 hora. Te recomendamos partirla en dos micro-tareas.' : undefined
    };
  }

  /**
   * 3. GENERACIÓN DE ROADMAP AL CREAR UN PROYECTO
   * Crea un conjunto de micro-tareas ordenadas y estimadas para un nuevo proyecto.
   */
  static async generateProjectRoadmap(
    projectName: string,
    projectDesc: string,
    targetHours: number = 25
  ): Promise<ProposedTask[]> {
    const stats = SchedulerEngine.getStats();
    const velocity = stats.accuracyRatio || 1.0;

    const prompt = `Eres un Lead Software Architect y Project Manager.
El usuario va a crear este proyecto de software:
- Nombre: "${projectName}"
- Descripción: "${projectDesc}"
- Horas objetivo: ${targetHours}h

Genera una lista de 5 a 7 micro-tareas esenciales para construir este proyecto de forma iterativa y sin parálisis.
Reglas:
- Cada tarea debe ser de 30 a 50 minutos (ajustadas para un ratio de velocidad de ${velocity}x).
- Orden secuencial lógico (ej: 1. Setup y modelos -> 2. Lógica core -> 3. UI/Endpoints -> 4. Integración y cierre).
- Nada de tareas vagas como "Hacer backend". Deben ser títulos de acción claros.

Responde ÚNICAMENTE con un array JSON de objetos:
[
  {
    "title": "Título conciso y accionable",
    "description": "Qué incluye exactamente y qué queda fuera",
    "estimatedMinutes": 45,
    "priority": "high",
    "difficulty": "medium"
  }
]`;

    try {
      const raw = await this.queryLLM(prompt, 'Generador de arquitecturas y tareas ágiles de software.');
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const list = JSON.parse(jsonMatch[0]);
        return list.map((item: any, idx: number) => ({
          id: `prop-${Date.now()}-${idx}`,
          title: String(item.title || `Fase ${idx + 1}`),
          description: String(item.description || ''),
          estimatedMinutes: Number(item.estimatedMinutes) || 45,
          priority: (item.priority || 'medium') as Priority,
          difficulty: (item.difficulty || 'medium') as Difficulty
        }));
      }
    } catch (e: any) {
      console.warn('Fallback local para generación de roadmap:', e.message);
    }

    // Fallback local
    return [
      {
        id: `prop-${Date.now()}-1`,
        title: `Configurar entorno y esquema base para ${projectName}`,
        description: 'Estructura de carpetas, dependencias clave e interfaces de datos.',
        estimatedMinutes: 40,
        priority: 'high',
        difficulty: 'medium'
      },
      {
        id: `prop-${Date.now()}-2`,
        title: 'Implementar el caso de uso principal (Happy Path)',
        description: 'El flujo de valor central que hace funcionar la idea.',
        estimatedMinutes: 50,
        priority: 'urgent',
        difficulty: 'hard'
      },
      {
        id: `prop-${Date.now()}-3`,
        title: 'Crear interfaz o endpoints de consulta básica',
        description: 'Conectar la lógica con vistas o APIs consumibles.',
        estimatedMinutes: 45,
        priority: 'medium',
        difficulty: 'medium'
      },
      {
        id: `prop-${Date.now()}-4`,
        title: 'Gestión de errores y validaciones críticas',
        description: 'Asegurar que los datos erróneos no rompan la app.',
        estimatedMinutes: 35,
        priority: 'medium',
        difficulty: 'easy'
      },
      {
        id: `prop-${Date.now()}-5`,
        title: 'Prueba funcional integral y despliegue local',
        description: 'Verificar el flujo de principio a fin y documentar arranque.',
        estimatedMinutes: 30,
        priority: 'high',
        difficulty: 'easy'
      }
    ];
  }

  /**
   * 4. REFINAMIENTO CONVERSACIONAL DE ROADMAP
   * Permite al usuario hablar con el PM para modificar las tareas sugeridas
   * (ej: "quita los pagos y pon login con Google", "hazlas más cortas")
   */
  static async refineProjectRoadmap(
    currentTasks: ProposedTask[],
    userInstruction: string,
    project: { name: string; description: string }
  ): Promise<{ reply: string; updatedTasks: ProposedTask[] }> {
    const prompt = `Eres el Project Manager de "${project.name}".
Actualmente tienes esta lista de tareas propuestas:
${JSON.stringify(currentTasks.map(t => ({ title: t.title, estimatedMinutes: t.estimatedMinutes, priority: t.priority })))}

El desarrollador te dice lo siguiente:
"${userInstruction}"

Aplica sus cambios a la lista de tareas (añadiendo, quitando, renombrando o re-estimando las tareas según su petición).
Responde ÚNICAMENTE con un JSON con este formato:
{
  "reply": "Breve explicación conversacional de qué cambios has hecho y por qué",
  "updatedTasks": [
    {
      "title": "...",
      "description": "...",
      "estimatedMinutes": 40,
      "priority": "high",
      "difficulty": "medium"
    }
  ]
}`;

    try {
      const raw = await this.queryLLM(prompt, 'Project Manager técnico y conversacional.');
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const updated = (parsed.updatedTasks || []).map((t: any, idx: number) => ({
          id: `prop-${Date.now()}-${idx}`,
          title: String(t.title || `Tarea ${idx + 1}`),
          description: String(t.description || ''),
          estimatedMinutes: Number(t.estimatedMinutes) || 40,
          priority: (t.priority || 'medium') as Priority,
          difficulty: (t.difficulty || 'medium') as Difficulty
        }));

        return {
          reply: parsed.reply || 'He actualizado las tareas según tus indicaciones.',
          updatedTasks: updated.length > 0 ? updated : currentTasks
        };
      }
    } catch (e: any) {
      console.warn('Fallback refinamiento:', e.message);
    }

    return {
      reply: `He tomado nota de "${userInstruction}". Puedes ajustar los títulos o minutos directamente en la lista editable.`,
      updatedTasks: currentTasks
    };
  }

  /**
   * Procesa mensajes generales del Copiloto en el tab de Chat
   */
  static async sendMessage(userMessage: string): Promise<ChatMessage> {
    const today = getTodayDateString();
    const settings = StorageService.getSettings();
    const tasks = StorageService.getTasks();
    const projects = StorageService.getProjects();
    const { totalCapacityMinutes } = SchedulerEngine.getEffectiveCapacity(today, settings);

    // Detección de intenciones de horas
    const capacityIntent = this.detectCapacityIntent(userMessage);
    let actionExecutedText = '';

    if (capacityIntent) {
      if (capacityIntent.type === 'add') {
        const result = SchedulerEngine.adjustTodayCapacity(capacityIntent.minutes, false);
        const addedNames = result.tasksAdded.map(t => `• **${t.title}** (${t.estimatedMinutes}m)`).join('\n');
        actionExecutedText = `⚡ **Capacidad actualizada:** He añadido **${capacityIntent.minutes} minutos** a hoy. Capacidad total: **${(result.newTotalCapacity / 60).toFixed(1)}h**.\n` +
          (result.tasksAdded.length > 0
            ? `\nHe rescatado del backlog:\n${addedNames}`
            : '\n(No había más tareas en el backlog listas para añadir)');
      } else if (capacityIntent.type === 'subtract') {
        const result = SchedulerEngine.adjustTodayCapacity(-capacityIntent.minutes, false);
        const deferredNames = result.tasksDeferred.map(t => `• **${t.title}** (${t.estimatedMinutes}m)`).join('\n');
        actionExecutedText = `🛡️ **Jornada reducida:** Se han restado **${capacityIntent.minutes} minutos**. Capacidad: **${(result.newTotalCapacity / 60).toFixed(1)}h**.\n` +
          (result.tasksDeferred.length > 0
            ? `\nMovidas al backlog para evitar agobios:\n${deferredNames}`
            : '\nTu lista actual ya se ajusta al tiempo disponible.');
      } else if (capacityIntent.type === 'set') {
        const result = SchedulerEngine.adjustTodayCapacity(capacityIntent.minutes, true);
        actionExecutedText = `🎯 **Jornada fijada a ${(result.newTotalCapacity / 60).toFixed(1)} horas** (${result.newTotalCapacity} min).`;
      }
    }

    if (settings.apiKey && settings.apiKey.trim().length > 0) {
      try {
        const prompt = `Mensaje del desarrollador: "${userMessage}"\n${actionExecutedText ? `(Nota del sistema: ${actionExecutedText})` : ''}`;
        const system = `Eres Procrastinator, un Project Manager y coach técnico para un desarrollador en solitario.
Sé conciso, realista, pragmático y motivador. Tareas planificadas para hoy: ${tasks.filter(t => t.scheduledDate === today).length}.`;
        const reply = await this.queryLLM(prompt, system);

        return {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: reply || actionExecutedText || 'Entendido.',
          timestamp: new Date().toISOString()
        };
      } catch (err: any) {
        console.error(err);
      }
    }

    return {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: actionExecutedText || `He tomado nota de: "${userMessage}". Recuerda que puedes pedirme sumar o restar horas a tu jornada actual.`,
      timestamp: new Date().toISOString()
    };
  }

  private static detectCapacityIntent(text: string): { type: 'add' | 'subtract' | 'set'; minutes: number } | null {
    const lower = text.toLowerCase();
    const addHourMatch = lower.match(/(?:tengo|\+|añadir|sumar|poner|darme)?\s*(\d+(?:\.\d+)?)\s*(?:hora|horas|h)\s*(?:extra|más|mas)?/i);
    if (addHourMatch && (lower.includes('+') || lower.includes('extra') || lower.includes('más') || lower.includes('mas') || lower.includes('añadir') || lower.includes('sumar') || lower.includes('tengo'))) {
      const hours = parseFloat(addHourMatch[1]);
      if (hours > 0 && hours <= 8) return { type: 'add', minutes: Math.round(hours * 60) };
    }

    const subHourMatch = lower.match(/(?:-|quitar|restar|reducir)\s*(\d+(?:\.\d+)?)\s*(?:hora|horas|h)/i);
    if (subHourMatch) {
      return { type: 'subtract', minutes: Math.round(parseFloat(subHourMatch[1]) * 60) };
    }

    const exactMatch = lower.match(/(?:solo|únicamente|dispongo de|puedo)\s*(?:hacer|dedicar)?\s*(\d+(?:\.\d+)?)\s*(?:hora|horas|h)/i);
    if (exactMatch) {
      return { type: 'set', minutes: Math.round(parseFloat(exactMatch[1]) * 60) };
    }

    return null;
  }
}
