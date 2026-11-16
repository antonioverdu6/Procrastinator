import React from 'react';
import { Task, Project } from '../../types';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorButton } from '../ProcrastinatorButton';
import { ProcrastinatorBadge } from '../ProcrastinatorBadge';
import { ProcrastinatorText } from '../ProcrastinatorText';
import { Check, Play, CornerDownRight, CheckCircle2 } from 'lucide-react';

interface DailyTaskQueueProps {
  tasks: Task[];
  projects: Project[];
  onStartTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
  onDeferTask: (taskId: string) => void;
}

export const DailyTaskQueue: React.FC<DailyTaskQueueProps> = ({
  tasks,
  projects,
  onStartTask,
  onCompleteTask,
  onDeferTask
}) => {
  const getProject = (id: string) => projects.find(p => p.id === id);

  return (
    <ProcrastinatorBox variant="card">
      <ProcrastinatorBox variant="row-between" className="pb-3 border-b border-[#E2E8F0] mb-3">
        <ProcrastinatorBox variant="stack-sm">
          <ProcrastinatorText variant="h3">Cola de Tareas de Hoy</ProcrastinatorText>
          <ProcrastinatorText variant="caption">
            El PM ha seleccionado únicamente estas micro-tareas para evitar saturación cognitiva.
          </ProcrastinatorText>
        </ProcrastinatorBox>
        <ProcrastinatorBadge variant="neutral">
          {tasks.length} pendientes
        </ProcrastinatorBadge>
      </ProcrastinatorBox>

      {tasks.length === 0 ? (
        <ProcrastinatorBox className="py-12 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-[#16A34A] mx-auto opacity-80" />
          <ProcrastinatorText variant="h3">¡Objetivo del día completado!</ProcrastinatorText>
          <ProcrastinatorText variant="caption" className="max-w-md mx-auto block">
            Has cumplido todas las tareas previstas para hoy. Puedes descansar con la conciencia tranquila o añadir una más desde el Backlog si tienes energía extra.
          </ProcrastinatorText>
        </ProcrastinatorBox>
      ) : (
        <ProcrastinatorBox variant="list">
          {tasks.map(task => {
            const project = getProject(task.projectId);
            const isInProgress = task.status === 'in_progress';

            return (
              <ProcrastinatorBox
                key={task.id}
                variant={isInProgress ? 'list-item-active' : 'list-item'}
              >
                <ProcrastinatorBox variant="row" className="items-start gap-3 min-w-0">
                  <button
                    onClick={() => onCompleteTask(task.id)}
                    className="mt-0.5 w-5 h-5 rounded-md border border-[#CBD5E1] hover:border-[#16A34A] hover:bg-[#DCFCE7] flex items-center justify-center text-transparent hover:text-[#16A34A] transition-colors flex-shrink-0"
                    title="Marcar completada"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>

                  <ProcrastinatorBox className="min-w-0">
                    <ProcrastinatorBox variant="row-wrap">
                      <span className={`text-sm font-medium ${isInProgress ? 'text-[#1D4ED8]' : 'text-[#0F172A]'}`}>
                        {task.title}
                      </span>
                      {project && (
                        <ProcrastinatorBadge variant="neutral">
                          {project.name}
                        </ProcrastinatorBadge>
                      )}
                      {isInProgress && (
                        <ProcrastinatorBadge variant="primary">
                          En curso
                        </ProcrastinatorBadge>
                      )}
                    </ProcrastinatorBox>

                    {task.description && (
                      <ProcrastinatorText variant="caption" className="block mt-0.5 truncate max-w-xl">
                        {task.description}
                      </ProcrastinatorText>
                    )}

                    <ProcrastinatorBox variant="row" className="text-xs text-[#94A3B8] mt-1">
                      <span>⏱️ {task.estimatedMinutes} min</span>
                      <span>•</span>
                      <span>Registrado: {task.actualMinutes} min</span>
                      {task.deferredCount > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-[#D97706]">Pospuesta {task.deferredCount}x</span>
                        </>
                      )}
                    </ProcrastinatorBox>
                  </ProcrastinatorBox>
                </ProcrastinatorBox>

                <ProcrastinatorBox variant="row" className="self-end sm:self-auto flex-shrink-0">
                  {!isInProgress && (
                    <ProcrastinatorButton
                      variant="primary"
                      onClick={() => onStartTask(task.id)}
                      title="Activar foco en esta tarea"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Comenzar</span>
                    </ProcrastinatorButton>
                  )}

                  <ProcrastinatorButton
                    variant="ghost"
                    onClick={() => onDeferTask(task.id)}
                    title="Mover al backlog general si no vas a llegar hoy"
                  >
                    <CornerDownRight className="w-3.5 h-3.5 text-[#64748B]" />
                    <span className="text-xs text-[#64748B]">Posponer</span>
                  </ProcrastinatorButton>
                </ProcrastinatorBox>
              </ProcrastinatorBox>
            );
          })}
        </ProcrastinatorBox>
      )}
    </ProcrastinatorBox>
  );
};
