import React from 'react';
import { Project, Task } from '../../types';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorButton } from '../ProcrastinatorButton';
import { ProcrastinatorBadge } from '../ProcrastinatorBadge';
import { ProcrastinatorText } from '../ProcrastinatorText';
import { ArrowUpRight, Trash2 } from 'lucide-react';
import { styles } from '../../style';

interface ProjectBacklogProps {
  tasks: Task[];
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  onMoveToToday: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export const ProjectBacklog: React.FC<ProjectBacklogProps> = ({
  tasks,
  projects,
  selectedProjectId,
  onSelectProject,
  onMoveToToday,
  onDeleteTask
}) => {
  const filteredTasks = tasks.filter(t => {
    if (selectedProjectId === 'all') return true;
    return t.projectId === selectedProjectId;
  });

  const backlogTasks = filteredTasks.filter(t => t.status === 'backlog');
  const scheduledTasks = filteredTasks.filter(
    t => t.status === 'scheduled_today' || t.status === 'in_progress'
  );
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');

  const getProject = (id: string) => projects.find(p => p.id === id);

  return (
    <ProcrastinatorBox variant="card">
      <ProcrastinatorBox variant="row-between" className="pb-4 border-b border-[#E2E8F0]">
        {/* Filtros de proyectos */}
        <ProcrastinatorBox variant="row" className="overflow-x-auto pb-1">
          <button
            onClick={() => onSelectProject('all')}
            className={selectedProjectId === 'all' ? styles.button.tabActive : styles.button.tabInactive}
          >
            Todos ({tasks.length})
          </button>
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => onSelectProject(p.id)}
              className={selectedProjectId === p.id ? styles.button.tabActive : styles.button.tabInactive}
            >
              {p.name}
            </button>
          ))}
        </ProcrastinatorBox>

        <ProcrastinatorBox variant="row" className="text-xs text-[#64748B]">
          <span>Backlog: <strong>{backlogTasks.length}</strong></span>
          <span>•</span>
          <span>Hoy: <strong>{scheduledTasks.length}</strong></span>
          <span>•</span>
          <span>Hechas: <strong>{completedTasks.length}</strong></span>
        </ProcrastinatorBox>
      </ProcrastinatorBox>

      {/* Lista de Tareas en Backlog */}
      <ProcrastinatorBox variant="list" className="mt-2">
        {backlogTasks.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#94A3B8]">
            No hay tareas en el backlog para este filtro.
          </div>
        ) : (
          backlogTasks.map(task => {
            const project = getProject(task.projectId);

            return (
              <ProcrastinatorBox key={task.id} variant="list-item">
                <ProcrastinatorBox className="min-w-0">
                  <ProcrastinatorBox variant="row-wrap">
                    <span className="text-sm font-medium text-[#0F172A]">
                      {task.title}
                    </span>
                    {project && (
                      <ProcrastinatorBadge variant="neutral">
                        {project.name}
                      </ProcrastinatorBadge>
                    )}
                    <ProcrastinatorBadge
                      variant={
                        task.priority === 'urgent'
                          ? 'danger'
                          : task.priority === 'high'
                          ? 'warning'
                          : 'neutral'
                      }
                    >
                      {task.priority}
                    </ProcrastinatorBadge>
                  </ProcrastinatorBox>

                  {task.description && (
                    <ProcrastinatorText variant="caption" className="block mt-0.5">
                      {task.description}
                    </ProcrastinatorText>
                  )}

                  <ProcrastinatorBox variant="row" className="text-xs text-[#94A3B8] mt-1">
                    <span>⏱️ {task.estimatedMinutes} min</span>
                    <span>•</span>
                    <span>Dificultad: {task.difficulty}</span>
                    {task.deferredCount > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-[#D97706]">Pospuesta {task.deferredCount}x</span>
                      </>
                    )}
                  </ProcrastinatorBox>
                </ProcrastinatorBox>

                <ProcrastinatorBox variant="row" className="self-end sm:self-auto flex-shrink-0">
                  <ProcrastinatorButton
                    variant="secondary"
                    onClick={() => onMoveToToday(task.id)}
                    title="Mover a la jornada de hoy"
                  >
                    <span>Planificar hoy</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </ProcrastinatorButton>

                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="p-2 text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </ProcrastinatorBox>
              </ProcrastinatorBox>
            );
          })
        )}
      </ProcrastinatorBox>
    </ProcrastinatorBox>
  );
};
