import { Task, UserSettings, ProductivityStats, WorkSession, DailyPlan } from '../types';
import { StorageService, getTodayDateString } from './storageService';

export class SchedulerEngine {
  /**
   * Obtiene la capacidad total en minutos para una fecha específica.
   */
  static getEffectiveCapacity(date: string, settings: UserSettings): { totalCapacityMinutes: number; plan: DailyPlan } {
    const plans = StorageService.getDailyPlans();
    let plan = plans[date];
    const baseMinutes = Math.round(settings.defaultDailyHours * 60);

    if (!plan) {
      plan = {
        date,
        baseCapacityMinutes: baseMinutes,
        extraMinutesAdjustment: 0,
        completed: false
      };
      StorageService.saveDailyPlan(plan);
    }

    return {
      totalCapacityMinutes: Math.max(30, plan.baseCapacityMinutes + plan.extraMinutesAdjustment),
      plan
    };
  }

  /**
   * Ajusta dinámicamente la capacidad del día actual (horas extra o menos horas).
   * @param deltaMinutes Minutos a sumar (positivo) o restar (negativo).
   * @param isAbsolute Si es true, establece la capacidad a ese valor exacto.
   */
  static adjustTodayCapacity(deltaMinutes: number, isAbsolute: boolean = false): {
    newTotalCapacity: number;
    tasksAdded: Task[];
    tasksDeferred: Task[];
  } {
    const today = getTodayDateString();
    const settings = StorageService.getSettings();
    const { plan } = this.getEffectiveCapacity(today, settings);
    const tasks = StorageService.getTasks();

    if (isAbsolute) {
      plan.extraMinutesAdjustment = deltaMinutes - plan.baseCapacityMinutes;
    } else {
      plan.extraMinutesAdjustment += deltaMinutes;
    }

    StorageService.saveDailyPlan(plan);
    const newTotalCapacity = Math.max(30, plan.baseCapacityMinutes + plan.extraMinutesAdjustment);

    // Calcular minutos ya programados para hoy
    const todayTasks = tasks.filter(t => t.scheduledDate === today && t.status !== 'deferred');
    const todayMinutes = todayTasks.reduce((acc, t) => acc + t.estimatedMinutes, 0);

    const tasksAdded: Task[] = [];
    const tasksDeferred: Task[] = [];

    if (todayMinutes < newTotalCapacity) {
      // Necesitamos o podemos agregar más tareas desde el backlog
      let availableMinutes = newTotalCapacity - todayMinutes;
      const backlogTasks = tasks
        .filter(t => t.status === 'backlog')
        .sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority));

      for (const t of backlogTasks) {
        if (t.estimatedMinutes <= availableMinutes + 15) { // 15 min tolerance
          t.status = 'scheduled_today';
          t.scheduledDate = today;
          availableMinutes -= t.estimatedMinutes;
          tasksAdded.push(t);
        }
        if (availableMinutes <= 0) break;
      }
    } else if (todayMinutes > newTotalCapacity) {
      // Hay más tareas de las que el usuario puede hacer hoy: aligerar la carga sin culpa
      let excessMinutes = todayMinutes - newTotalCapacity;
      // Posponer primero las no iniciadas de menor prioridad
      const candidates = todayTasks
        .filter(t => t.status === 'scheduled_today')
        .sort((a, b) => this.getPriorityWeight(a.priority) - this.getPriorityWeight(b.priority));

      for (const t of candidates) {
        t.status = 'backlog';
        t.scheduledDate = undefined;
        excessMinutes -= t.estimatedMinutes;
        tasksDeferred.push(t);
        if (excessMinutes <= 0) break;
      }
    }

    StorageService.saveTasks(tasks);

    return {
      newTotalCapacity,
      tasksAdded,
      tasksDeferred
    };
  }

  /**
   * Puntuación de prioridad
   */
  private static getPriorityWeight(p: string): number {
    switch (p) {
      case 'urgent': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 1;
    }
  }

  /**
   * Calcula estadísticas de productividad, velocidad y anti-procrastinación.
   */
  static getStats(): ProductivityStats & {
    weeklyActivity: { date: string; dayName: string; plannedHours: number; actualHours: number }[];
    projectProgress: { id: string; name: string; color: string; completedHours: number; totalHours: number; percentage: number }[];
  } {
    const today = getTodayDateString();
    const settings = StorageService.getSettings();
    const tasks = StorageService.getTasks();
    const sessions = StorageService.getWorkSessions();
    const projects = StorageService.getProjects();
    const { totalCapacityMinutes } = this.getEffectiveCapacity(today, settings);

    // Tareas de hoy
    const todayTasks = tasks.filter(t => t.scheduledDate === today);
    const todayCompletedTasks = todayTasks.filter(t => t.status === 'completed');

    const todayPlannedMinutes = totalCapacityMinutes;
    const todayWorkedMinutes = todayTasks.reduce((sum, t) => sum + (t.actualMinutes || 0), 0);
    const todayCompletedMinutes = todayCompletedTasks.reduce((sum, t) => sum + (t.actualMinutes || t.estimatedMinutes), 0);

    const todayCompletionRate = todayPlannedMinutes > 0
      ? Math.min(100, Math.round((todayCompletedMinutes / todayPlannedMinutes) * 100))
      : 0;

    // Calcular Procrastination Score (100 = perfecto, castiga tareas pospuestas muchas veces)
    const totalDeferredCount = tasks.reduce((sum, t) => sum + (t.deferredCount || 0), 0);
    const totalFinished = tasks.filter(t => t.status === 'completed').length;
    let procrastinationScore = Math.max(10, Math.min(100, 100 - (totalDeferredCount * 8) + (totalFinished * 2)));

    // Ratio de precisión (estimado vs real)
    const evaluatedTasks = tasks.filter(t => t.actualMinutes > 0);
    const totalEstimated = evaluatedTasks.reduce((s, t) => s + t.estimatedMinutes, 0);
    const totalActual = evaluatedTasks.reduce((s, t) => s + t.actualMinutes, 0);
    const accuracyRatio = totalEstimated > 0 ? Number((totalActual / totalEstimated).toFixed(2)) : 1.0;

    // Racha de días (streak)
    const datesWithCompletedTasks = new Set(
      tasks
        .filter(t => t.completedAt)
        .map(t => t.completedAt!.split('T')[0])
    );
    // Añadir fechas con sesiones
    sessions.forEach(s => datesWithCompletedTasks.add(s.date));

    let streakDays = 0;
    const checkDate = new Date();
    // Verificar hoy o ayer
    const todayStr = getTodayDateString();
    if (datesWithCompletedTasks.has(todayStr)) {
      streakDays++;
    }
    for (let i = 1; i <= 30; i++) {
      const d = new Date();
      d.setDate(checkDate.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      if (datesWithCompletedTasks.has(dStr)) {
        streakDays++;
      } else {
        break;
      }
    }

    // Progreso semanal (últimos 7 días)
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const weeklyActivity = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const dDayName = dayNames[d.getDay()];

      // Tareas de ese día
      const dayTasks = tasks.filter(t => 
        (t.completedAt && t.completedAt.startsWith(dStr)) ||
        (t.scheduledDate === dStr)
      );
      const plannedMins = dStr === today ? todayPlannedMinutes : Math.round(settings.defaultDailyHours * 60);
      const actualMins = dayTasks.reduce((s, t) => s + (t.actualMinutes || 0), 0);

      weeklyActivity.push({
        date: dStr,
        dayName: dDayName,
        plannedHours: Number((plannedMins / 60).toFixed(1)),
        actualHours: Number((actualMins / 60).toFixed(1))
      });
    }

    // Progreso por proyectos
    const projectProgress = projects.map(proj => {
      const projTasks = tasks.filter(t => t.projectId === proj.id);
      const completedTasks = projTasks.filter(t => t.status === 'completed');
      const completedMinutes = completedTasks.reduce((s, t) => s + (t.actualMinutes || t.estimatedMinutes), 0);
      const totalMinutes = projTasks.reduce((s, t) => s + t.estimatedMinutes, 0) || (proj.targetHours ? proj.targetHours * 60 : 60);

      const completedHours = Number((completedMinutes / 60).toFixed(1));
      const totalHours = Number((totalMinutes / 60).toFixed(1));
      const percentage = totalHours > 0 ? Math.min(100, Math.round((completedHours / totalHours) * 100)) : 0;

      return {
        id: proj.id,
        name: proj.name,
        color: proj.color,
        completedHours,
        totalHours,
        percentage
      };
    });

    const totalHoursCompleted = Number((tasks.filter(t => t.status === 'completed').reduce((s, t) => s + (t.actualMinutes || t.estimatedMinutes), 0) / 60).toFixed(1));
    const weeklyHoursCompleted = Number((weeklyActivity.reduce((s, w) => s + w.actualHours, 0)).toFixed(1));

    return {
      streakDays: Math.max(streakDays, 1), // Racha mínima amigable
      totalHoursCompleted,
      weeklyHoursCompleted,
      todayPlannedMinutes,
      todayWorkedMinutes,
      todayCompletionRate,
      procrastinationScore,
      totalTasksFinished: totalFinished,
      accuracyRatio,
      weeklyActivity,
      projectProgress
    };
  }
}
