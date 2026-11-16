import React, { useState } from 'react';
import { Task, Project, UserSettings } from '../../types';
import { Timer } from '../Timer';
import { DailyHeader } from '../DailyHeader';
import { DailyTaskQueue } from '../DailyTaskQueue';
import { DailyQuickTaskModal } from '../DailyQuickTaskModal';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { useDailyFocus } from '../../hooks';

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
  onRefreshData
}) => {
  const [showQuickModal, setShowQuickModal] = useState(false);

  // Filtrar tareas de hoy
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter(
    t => t.scheduledDate === todayDateStr || t.status === 'scheduled_today' || t.status === 'in_progress'
  );
  const completedToday = tasks.filter(
    t => t.status === 'completed' && t.completedAt && t.completedAt.startsWith(todayDateStr)
  );
  const pendingToday = todayTasks.filter(t => t.status !== 'completed');

  const activeTask = pendingToday.find(t => t.status === 'in_progress') || pendingToday[0];
  const totalCapacityMinutes = Math.round(settings.defaultDailyHours * 60);
  const completedMinutes = completedToday.reduce(
    (sum, t) => sum + (t.actualMinutes || t.estimatedMinutes),
    0
  );
  const progressPercent =
    totalCapacityMinutes > 0
      ? Math.min(100, Math.round((completedMinutes / totalCapacityMinutes) * 100))
      : 0;

  const {
    completeTask,
    logTime,
    startTask,
    deferTask,
    adjustCapacity
  } = useDailyFocus({
    tasks,
    defaultProjectId: projects[0]?.id,
    onRefreshData
  });

  const activeProject = activeTask ? projects.find(p => p.id === activeTask.projectId) : undefined;

  return (
    <ProcrastinatorBox variant="page">
      {/* Tarjeta Superior: Objetivo Diario y Progreso */}
      <DailyHeader
        totalCapacityMinutes={totalCapacityMinutes}
        completedMinutes={completedMinutes}
        progressPercent={progressPercent}
        onAdjustCapacity={adjustCapacity}
        onOpenQuickTaskModal={() => setShowQuickModal(true)}
      />

      {/* Tarea Activa y Cronómetro con Guía de IA */}
      {activeTask && (
        <Timer
          task={activeTask}
          project={activeProject}
          onTaskCompleted={completeTask}
          onTimeLogged={logTime}
        />
      )}

      {/* Cola de Tareas de Hoy */}
      <DailyTaskQueue
        tasks={pendingToday}
        projects={projects}
        onStartTask={startTask}
        onCompleteTask={completeTask}
        onDeferTask={deferTask}
      />

      {/* Modal para Añadir Tarea Rápida a Hoy */}
      <DailyQuickTaskModal
        isOpen={showQuickModal}
        onClose={() => setShowQuickModal(false)}
        projects={projects}
        onTaskCreated={onRefreshData}
      />
    </ProcrastinatorBox>
  );
};
