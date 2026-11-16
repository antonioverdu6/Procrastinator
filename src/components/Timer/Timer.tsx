import React from 'react';
import { Play, Pause, CheckCircle2, Coffee, AlertCircle } from 'lucide-react';
import { Task, Project } from '../../types';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorButton } from '../ProcrastinatorButton';
import { ProcrastinatorBadge } from '../ProcrastinatorBadge';
import { ProcrastinatorText } from '../ProcrastinatorText';
import { TaskGuidePanel } from '../TaskGuidePanel';
import { useTimer, useTaskGuide } from '../../hooks';

interface TimerProps {
  task: Task;
  project?: Project;
  onTaskCompleted: (taskId: string) => void;
  onTimeLogged: (taskId: string, additionalMinutes: number) => void;
}

export const Timer: React.FC<TimerProps> = ({
  task,
  onTaskCompleted,
  onTimeLogged
}) => {
  const {
    isRunning,
    secondsElapsed,
    mode,
    isOvertime,
    progressPercent,
    togglePlay,
    complete,
    switchBreak,
    formatTime
  } = useTimer({
    task,
    onTaskCompleted,
    onTimeLogged
  });

  const {
    plan,
    loadingPlan,
    showPlan,
    checkedSteps,
    toggleActionPlan,
    toggleStep
  } = useTaskGuide(task.id);

  return (
    <ProcrastinatorBox variant="card">
      {/* Barra de progreso de la tarea */}
      <div className="w-full h-1 bg-[#F1F5F9] rounded-full overflow-hidden mb-4">
        <div
          className={`h-full transition-all duration-300 ${
            isOvertime ? 'bg-[#D97706]' : 'bg-[#2563EB]'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <ProcrastinatorBox variant="header">
        {/* Datos de la tarea activa */}
        <ProcrastinatorBox className="flex-1 min-w-0 w-full md:w-auto">
          <ProcrastinatorBox variant="row-wrap" className="mb-1">
            <ProcrastinatorBadge variant={mode === 'focus' ? 'primary' : 'success'}>
              {mode === 'focus' ? 'Enfoque activo' : 'Pausa de descanso'}
            </ProcrastinatorBadge>
            <ProcrastinatorText variant="caption">
              Estimado: {task.estimatedMinutes}m | Registrado hoy: {task.actualMinutes}m
            </ProcrastinatorText>
          </ProcrastinatorBox>

          <ProcrastinatorText variant="h2" className="truncate">
            {task.title}
          </ProcrastinatorText>
          {task.description && (
            <ProcrastinatorText variant="caption" className="truncate block mt-0.5">
              {task.description}
            </ProcrastinatorText>
          )}

          {/* Panel con Guía de Acción de IA */}
          <TaskGuidePanel
            plan={plan}
            loadingPlan={loadingPlan}
            showPlan={showPlan}
            onTogglePlan={toggleActionPlan}
            checkedSteps={checkedSteps}
            onToggleStep={toggleStep}
          />
        </ProcrastinatorBox>

        {/* Display del Cronómetro y Controles */}
        <ProcrastinatorBox variant="stack-sm" className="items-center md:items-end flex-shrink-0">
          <div className="text-4xl font-mono font-bold tracking-tight text-[#0F172A]">
            {formatTime(secondsElapsed)}
          </div>

          {isOvertime && (
            <ProcrastinatorBadge variant="warning" className="flex items-center gap-1 text-[11px]">
              <AlertCircle className="w-3 h-3" />
              <span>Tiempo estimado superado</span>
            </ProcrastinatorBadge>
          )}

          <ProcrastinatorBox variant="row" className="mt-1">
            <ProcrastinatorButton
              variant={isRunning ? 'secondary' : 'primary'}
              onClick={togglePlay}
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isRunning ? 'Pausar' : 'Reanudar'}</span>
            </ProcrastinatorButton>

            <ProcrastinatorButton
              variant="success"
              onClick={complete}
              title="Marcar tarea como terminada"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Completar</span>
            </ProcrastinatorButton>

            <ProcrastinatorButton
              variant="ghost"
              onClick={switchBreak}
              title={mode === 'focus' ? 'Tomar descanso' : 'Volver al foco'}
            >
              <Coffee className="w-4 h-4" />
            </ProcrastinatorButton>
          </ProcrastinatorBox>
        </ProcrastinatorBox>
      </ProcrastinatorBox>
    </ProcrastinatorBox>
  );
};
