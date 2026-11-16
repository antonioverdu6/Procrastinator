import React, { useState } from 'react';
import { Task, Project, UserSettings } from '../../types';
import { Timer } from '../Timer';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorButton } from '../ProcrastinatorButton';
import { ProcrastinatorBadge } from '../ProcrastinatorBadge';
import { ProcrastinatorInput } from '../ProcrastinatorInput';
import { ProcrastinatorText } from '../ProcrastinatorText';
import { api } from '../../services/api';
import { Check, Plus, Clock, ArrowRight, CornerDownRight, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

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
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskMins, setNewTaskMins] = useState(30);
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [showAddForm, setShowAddForm] = useState(false);

  // Filtrar tareas de hoy
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter(t => t.scheduledDate === todayDateStr || t.status === 'scheduled_today' || t.status === 'in_progress');
  const completedToday = tasks.filter(t => t.status === 'completed' && t.completedAt && t.completedAt.startsWith(todayDateStr));
  const pendingToday = todayTasks.filter(t => t.status !== 'completed');

  const activeTask = pendingToday.find(t => t.status === 'in_progress') || pendingToday[0];
  const totalCapacityMinutes = Math.round(settings.defaultDailyHours * 60);
  const completedMinutes = completedToday.reduce((sum, t) => sum + (t.actualMinutes || t.estimatedMinutes), 0);
  const progressPercent = totalCapacityMinutes > 0 ? Math.min(100, Math.round((completedMinutes / totalCapacityMinutes) * 100)) : 0;

  const triggerCelebration = () => {
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.7 }
    });
  };

  const handleTaskCompleted = async (taskId: string) => {
    try {
      await api.updateTask(taskId, {
        status: 'completed',
        completedAt: new Date().toISOString()
      });
      triggerCelebration();
      onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTimeLogged = async (taskId: string, additionalMinutes: number) => {
    try {
      await api.logTaskTime(taskId, additionalMinutes);
      onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartTask = async (taskId: string) => {
    try {
      // Pausar cualquier otra que esté in_progress
      for (const t of tasks) {
        if (t.status === 'in_progress' && t.id !== taskId) {
          await api.updateTask(t.id, { status: 'scheduled_today' });
        }
      }
      await api.updateTask(taskId, { status: 'in_progress' });
      onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeferTask = async (taskId: string) => {
    const t = tasks.find(x => x.id === taskId);
    try {
      await api.updateTask(taskId, {
        status: 'backlog',
        scheduledDate: undefined,
        deferredCount: (t?.deferredCount || 0) + 1
      });
      onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickAdjust = async (minutes: number) => {
    try {
      await api.adjustCapacity(minutes, false);
      onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateQuickTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      await api.createTask({
        projectId: selectedProjectId || projects[0]?.id || 'default',
        title: newTaskTitle.trim(),
        estimatedMinutes: newTaskMins,
        priority: 'high',
        difficulty: 'medium'
      });
      setNewTaskTitle('');
      setShowAddForm(false);
      onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const getProject = (id: string) => projects.find(p => p.id === id);

  return (
    <ProcrastinatorBox className="space-y-6 animate-fadeIn">
      {/* Tarjeta Superior: Objetivo Diario */}
      <ProcrastinatorBox variant="card">
        <ProcrastinatorBox className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <ProcrastinatorBox>
            <ProcrastinatorBox className="flex items-center gap-2 mb-1">
              <ProcrastinatorBadge variant="primary">Plan del Día</ProcrastinatorBadge>
              <ProcrastinatorText variant="caption">
                {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </ProcrastinatorText>
            </ProcrastinatorBox>

            <ProcrastinatorText variant="h1">
              Objetivo de Hoy: <span className="text-[#2563EB]">{(totalCapacityMinutes / 60).toFixed(1)}h</span>
            </ProcrastinatorText>
            <ProcrastinatorText variant="caption" className="block mt-0.5">
              {pendingToday.length} micro-tareas planificadas para hoy. El resto del backlog permanece oculto para evitar agobios.
            </ProcrastinatorText>
          </ProcrastinatorBox>

          {/* Ajustadores Rápidos */}
          <ProcrastinatorBox className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-[#64748B] mr-1">Ajustar:</span>
            <ProcrastinatorButton
              variant="secondary"
              onClick={() => handleQuickAdjust(60)}
              title="Añadir 1 hora de trabajo"
            >
              +1h extra
            </ProcrastinatorButton>
            <ProcrastinatorButton
              variant="secondary"
              onClick={() => handleQuickAdjust(30)}
            >
              +30m
            </ProcrastinatorButton>
            <ProcrastinatorButton
              variant="secondary"
              onClick={() => handleQuickAdjust(-30)}
            >
              -30m
            </ProcrastinatorButton>
            <ProcrastinatorButton
              variant="secondary"
              onClick={() => handleQuickAdjust(-60)}
              title="Reducir 1 hora y reubicar tareas al backlog"
            >
              -1h menos
            </ProcrastinatorButton>
          </ProcrastinatorBox>
        </ProcrastinatorBox>

        {/* Barra de progreso */}
        <ProcrastinatorBox className="mt-5 pt-4 border-t border-[#E2E8F0]">
          <ProcrastinatorBox className="flex justify-between text-xs text-[#475569] mb-1.5">
            <span>Progreso diario: <strong>{completedMinutes}m</strong> de {totalCapacityMinutes}m</span>
            <span className="font-semibold text-[#0F172A]">{progressPercent}%</span>
          </ProcrastinatorBox>
          <ProcrastinatorBox className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2563EB] rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </ProcrastinatorBox>
        </ProcrastinatorBox>
      </ProcrastinatorBox>

      {/* Tarea Activa en Foco */}
      {activeTask ? (
        <ProcrastinatorBox className="space-y-2">
          <ProcrastinatorText variant="caption" className="font-semibold uppercase tracking-wider block">
            Tarea Activa
          </ProcrastinatorText>
          <Timer
            task={activeTask}
            project={getProject(activeTask.projectId)}
            onTaskCompleted={handleTaskCompleted}
            onTimeLogged={handleTimeLogged}
          />
        </ProcrastinatorBox>
      ) : (
        <ProcrastinatorBox variant="card" className="text-center space-y-2">
          <div className="w-10 h-10 bg-[#DCFCE7] text-[#16A34A] rounded-full flex items-center justify-center mx-auto mb-2">
            <Check className="w-5 h-5" />
          </div>
          <ProcrastinatorText variant="h3">¡Objetivos del día completados!</ProcrastinatorText>
          <ProcrastinatorText variant="caption" className="max-w-sm mx-auto block">
            Has cumplido tu tiempo de desarrollo previsto. Puedes descansar o añadir una micro-tarea extra si lo deseas.
          </ProcrastinatorText>
          <div className="pt-2">
            <ProcrastinatorButton variant="primary" onClick={() => handleQuickAdjust(60)}>
              +1h extra desde el backlog
            </ProcrastinatorButton>
          </div>
        </ProcrastinatorBox>
      )}

      {/* Lista de Tareas para Hoy */}
      <ProcrastinatorBox variant="card">
        <ProcrastinatorBox className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
          <ProcrastinatorBox>
            <ProcrastinatorText variant="h3" className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#2563EB]" />
              Cola de Trabajo de Hoy ({pendingToday.length})
            </ProcrastinatorText>
            <ProcrastinatorText variant="caption">Tareas asignadas a tu sesión actual.</ProcrastinatorText>
          </ProcrastinatorBox>

          <ProcrastinatorButton
            variant="secondary"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus className="w-4 h-4" /> Micro-tarea rápida
          </ProcrastinatorButton>
        </ProcrastinatorBox>

        {/* Formulario rápido para añadir tarea */}
        {showAddForm && (
          <form onSubmit={handleCreateQuickTask} className="py-4 border-b border-[#E2E8F0] space-y-3">
            <ProcrastinatorBox className="flex flex-col sm:flex-row gap-2">
              <ProcrastinatorInput
                type="text"
                placeholder="Título de la micro-tarea (ej. Crear función de validación)..."
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
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
              <ProcrastinatorButton variant="primary" type="submit">
                Añadir
              </ProcrastinatorButton>
            </ProcrastinatorBox>
          </form>
        )}

        {/* Elementos de la lista */}
        <ProcrastinatorBox className="divide-y divide-[#F1F5F9] mt-2">
          {pendingToday.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#94A3B8]">
              No hay más tareas en la lista de hoy.
            </div>
          ) : (
            pendingToday.map(task => {
              const project = getProject(task.projectId);
              const isCurrent = activeTask?.id === task.id;

              return (
                <ProcrastinatorBox
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
                          <ProcrastinatorBadge variant="neutral">
                            {project.name}
                          </ProcrastinatorBadge>
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
                      <ProcrastinatorButton
                        variant="ghost"
                        onClick={() => handleStartTask(task.id)}
                      >
                        Enfocar <ArrowRight className="w-3.5 h-3.5" />
                      </ProcrastinatorButton>
                    )}

                    <button
                      onClick={() => handleDeferTask(task.id)}
                      className="p-1.5 text-[#94A3B8] hover:text-[#D97706] hover:bg-[#FEF3C7] rounded-lg transition-colors"
                      title="Posponer al backlog"
                    >
                      <CornerDownRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </ProcrastinatorBox>
              );
            })
          )}
        </ProcrastinatorBox>
      </ProcrastinatorBox>

      {/* Victorias de hoy */}
      {completedToday.length > 0 && (
        <ProcrastinatorBox variant="subtle" className="space-y-2">
          <ProcrastinatorBox className="flex items-center justify-between text-xs font-semibold text-[#16A34A]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Completadas Hoy ({completedToday.length})
            </span>
            <span className="text-[#64748B]">
              {completedToday.reduce((s, t) => s + (t.actualMinutes || t.estimatedMinutes), 0)} min dedicados
            </span>
          </ProcrastinatorBox>

          <div className="divide-y divide-[#E2E8F0] text-xs">
            {completedToday.map(task => (
              <div key={task.id} className="py-2 flex items-center justify-between text-[#64748B]">
                <span className="line-through text-[#94A3B8] truncate">{task.title}</span>
                <span className="font-mono">{task.actualMinutes || task.estimatedMinutes}m</span>
              </div>
            ))}
          </div>
        </ProcrastinatorBox>
      )}
    </ProcrastinatorBox>
  );
};
