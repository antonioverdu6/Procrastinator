import React, { useState } from 'react';
import { Task, Project, UserSettings } from '../../types';
import { Timer } from '../Timer';
import { StorageService, getTodayDateString } from '../../services/storageService';
import { SchedulerEngine } from '../../services/schedulerEngine';
import { Check, Plus, Clock, ArrowRight, CornerDownRight, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { styles } from '../../style';

interface DailyFocusProps {
  tasks: Task[];
  projects: Project[];
  settings: UserSettings;
  onRefreshData: () => void;
  onOpenChat: () => void;
}

export const DailyFocus: React.FC<DailyFocusProps> = ({
  tasks,
  projects,
  settings,
  onRefreshData,
  onOpenChat
}) => {
  const today = getTodayDateString();
  const { totalCapacityMinutes } = SchedulerEngine.getEffectiveCapacity(today, settings);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskMins, setNewTaskMins] = useState(30);
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [showAddForm, setShowAddForm] = useState(false);

  const todayTasks = tasks.filter(t => t.scheduledDate === today);
  const completedToday = todayTasks.filter(t => t.status === 'completed');
  const pendingToday = todayTasks.filter(t => t.status !== 'completed');

  const activeTask = pendingToday.find(t => t.status === 'in_progress') || pendingToday[0];
  const completedMinutes = completedToday.reduce((sum, t) => sum + (t.actualMinutes || t.estimatedMinutes), 0);
  const progressPercent = Math.min(100, Math.round((completedMinutes / totalCapacityMinutes) * 100));

  const triggerCelebration = () => {
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.7 }
    });
  };

  const handleTaskCompleted = (taskId: string) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          status: 'completed' as const,
          completedAt: new Date().toISOString()
        };
      }
      return t;
    });
    StorageService.saveTasks(updated);
    triggerCelebration();
    onRefreshData();
  };

  const handleTimeLogged = (taskId: string, additionalMinutes: number) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          actualMinutes: (t.actualMinutes || 0) + additionalMinutes
        };
      }
      return t;
    });
    StorageService.saveTasks(updated);
    onRefreshData();
  };

  const handleStartTask = (taskId: string) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, status: 'in_progress' as const };
      }
      if (t.status === 'in_progress') {
        return { ...t, status: 'scheduled_today' as const };
      }
      return t;
    });
    StorageService.saveTasks(updated);
    onRefreshData();
  };

  const handleDeferTask = (taskId: string) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          status: 'backlog' as const,
          scheduledDate: undefined,
          deferredCount: (t.deferredCount || 0) + 1
        };
      }
      return t;
    });
    StorageService.saveTasks(updated);
    onRefreshData();
  };

  const handleQuickAdjust = (minutes: number) => {
    SchedulerEngine.adjustTodayCapacity(minutes, false);
    onRefreshData();
  };

  const handleCreateQuickTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      projectId: selectedProjectId || projects[0]?.id || 'default',
      title: newTaskTitle.trim(),
      estimatedMinutes: newTaskMins,
      actualMinutes: 0,
      status: 'scheduled_today',
      priority: 'high',
      difficulty: 'medium',
      deferredCount: 0,
      scheduledDate: today,
      order: tasks.length + 1
    };

    StorageService.saveTasks([...tasks, newTask]);
    setNewTaskTitle('');
    setShowAddForm(false);
    onRefreshData();
  };

  const getProject = (id: string) => projects.find(p => p.id === id);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Tarjeta Superior: Objetivo Diario */}
      <div className={styles.card.base}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={styles.badge.primary}>Plan del Día</span>
              <span className="text-xs text-[#64748B]">
                {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </div>

            <h1 className={styles.typography.h1}>
              Objetivo de Hoy: <span className="text-[#2563EB]">{(totalCapacityMinutes / 60).toFixed(1)}h</span>
            </h1>
            <p className={styles.typography.caption}>
              {pendingToday.length} micro-tareas planificadas para hoy. El resto del backlog permanece oculto para evitar agobios.
            </p>
          </div>

          {/* Ajustadores Rápidos */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-[#64748B] mr-1">Ajustar:</span>
            <button
              onClick={() => handleQuickAdjust(60)}
              className={styles.button.secondary}
              title="Añadir 1 hora de trabajo"
            >
              +1h extra
            </button>
            <button
              onClick={() => handleQuickAdjust(30)}
              className={styles.button.secondary}
            >
              +30m
            </button>
            <button
              onClick={() => handleQuickAdjust(-30)}
              className={styles.button.secondary}
            >
              -30m
            </button>
            <button
              onClick={() => handleQuickAdjust(-60)}
              className={styles.button.secondary}
              title="Reducir 1 hora y reubicar tareas al backlog"
            >
              -1h menos
            </button>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="mt-5 pt-4 border-t border-[#E2E8F0]">
          <div className="flex justify-between text-xs text-[#475569] mb-1.5">
            <span>Progreso diario: <strong>{completedMinutes}m</strong> de {totalCapacityMinutes}m</span>
            <span className="font-semibold text-[#0F172A]">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2563EB] rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tarea Activa en Foco */}
      {activeTask ? (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
            Tarea Activa
          </div>
          <Timer
            task={activeTask}
            onTaskCompleted={handleTaskCompleted}
            onTimeLogged={handleTimeLogged}
          />
        </div>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 text-center space-y-2 shadow-sm">
          <div className="w-10 h-10 bg-[#DCFCE7] text-[#16A34A] rounded-full flex items-center justify-center mx-auto mb-2">
            <Check className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0F172A]">¡Objetivos del día completados!</h3>
          <p className="text-xs text-[#64748B] max-w-sm mx-auto">
            Has cumplido tu tiempo de desarrollo previsto. Puedes descansar o añadir una micro-tarea extra si lo deseas.
          </p>
          <div className="pt-2">
            <button onClick={() => handleQuickAdjust(60)} className={styles.button.primary}>
              +1h extra desde el backlog
            </button>
          </div>
        </div>
      )}

      {/* Lista de Tareas para Hoy */}
      <div className={styles.card.base}>
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
          <div>
            <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#2563EB]" />
              Cola de Trabajo de Hoy ({pendingToday.length})
            </h3>
            <p className="text-xs text-[#64748B]">Tareas asignadas a tu sesión actual.</p>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={styles.button.secondary}
          >
            <Plus className="w-4 h-4" /> Micro-tarea rápida
          </button>
        </div>

        {/* Formulario rápido para añadir tarea */}
        {showAddForm && (
          <form onSubmit={handleCreateQuickTask} className="py-4 border-b border-[#E2E8F0] space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Título de la micro-tarea (ej. Crear función de validación)..."
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                className={styles.input.base}
                autoFocus
              />
              <select
                value={newTaskMins}
                onChange={e => setNewTaskMins(Number(e.target.value))}
                className="bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A]"
              >
                <option value={20}>20m</option>
                <option value={30}>30m</option>
                <option value={45}>45m</option>
                <option value={60}>60m</option>
              </select>
              <select
                value={selectedProjectId}
                onChange={e => setSelectedProjectId(e.target.value)}
                className="bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A]"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button type="submit" className={styles.button.primary}>
                Añadir
              </button>
            </div>
          </form>
        )}

        {/* Elementos de la lista */}
        <div className="divide-y divide-[#F1F5F9] mt-2">
          {pendingToday.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#94A3B8]">
              No hay más tareas en la lista de hoy.
            </div>
          ) : (
            pendingToday.map(task => {
              const project = getProject(task.projectId);
              const isCurrent = activeTask?.id === task.id;

              return (
                <div
                  key={task.id}
                  className={`py-3 px-2 flex items-center justify-between gap-3 rounded-lg transition-colors ${
                    isCurrent ? 'bg-[#EFF6FF]' : 'hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => handleTaskCompleted(task.id)}
                      className="w-5 h-5 rounded border border-[#CBD5E1] hover:border-[#16A34A] hover:bg-[#DCFCE7] flex items-center justify-center text-transparent hover:text-[#16A34A] transition-colors flex-shrink-0"
                      title="Marcar como hecha"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#0F172A] truncate">
                          {task.title}
                        </span>
                        {project && (
                          <span className={styles.badge.neutral}>
                            {project.name}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#64748B] flex items-center gap-2 mt-0.5">
                        <span>{task.estimatedMinutes} min</span>
                        <span>•</span>
                        <span className="capitalize">{task.difficulty}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {!isCurrent && (
                      <button
                        onClick={() => handleStartTask(task.id)}
                        className={styles.button.ghost}
                      >
                        Enfocar <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => handleDeferTask(task.id)}
                      className="p-1.5 text-[#94A3B8] hover:text-[#D97706] hover:bg-[#FEF3C7] rounded-lg transition-colors"
                      title="Posponer al backlog"
                    >
                      <CornerDownRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Victorias de hoy */}
      {completedToday.length > 0 && (
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#16A34A]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Completadas Hoy ({completedToday.length})
            </span>
            <span className="text-[#64748B]">
              {completedToday.reduce((s, t) => s + (t.actualMinutes || t.estimatedMinutes), 0)} min dedicados
            </span>
          </div>

          <div className="divide-y divide-[#E2E8F0] text-xs">
            {completedToday.map(task => (
              <div key={task.id} className="py-2 flex items-center justify-between text-[#64748B]">
                <span className="line-through text-[#94A3B8] truncate">{task.title}</span>
                <span className="font-mono">{task.actualMinutes || task.estimatedMinutes}m</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
