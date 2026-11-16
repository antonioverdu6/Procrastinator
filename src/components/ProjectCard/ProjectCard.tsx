import React from 'react';
import { Project, Task } from '../../types';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorBadge } from '../ProcrastinatorBadge';
import { ProcrastinatorText } from '../ProcrastinatorText';

interface ProjectCardProps {
  project: Project;
  tasks: Task[];
  isSelected: boolean;
  onSelect: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  tasks,
  isSelected,
  onSelect
}) => {
  const projTasks = tasks.filter(t => t.projectId === project.id);
  const completedCount = projTasks.filter(t => t.status === 'completed').length;
  const completedMins = projTasks
    .filter(t => t.status === 'completed')
    .reduce((s, t) => s + (t.actualMinutes || t.estimatedMinutes), 0);
  const totalEstimatedMins =
    projTasks.reduce((s, t) => s + t.estimatedMinutes, 0) ||
    (project.targetHours ? project.targetHours * 60 : 60);
  const percent = Math.min(100, Math.round((completedMins / totalEstimatedMins) * 100));

  return (
    <ProcrastinatorBox
      variant={isSelected ? 'card-selected' : 'card-interactive'}
      onClick={onSelect}
    >
      <ProcrastinatorBox variant="row-between" className="mb-2">
        <ProcrastinatorText variant="h3" className="truncate">
          {project.name}
        </ProcrastinatorText>
        <ProcrastinatorBadge variant="neutral">
          {completedCount}/{projTasks.length} hechas
        </ProcrastinatorBadge>
      </ProcrastinatorBox>

      <ProcrastinatorText variant="caption" className="line-clamp-2 h-8 mb-3 block">
        {project.description || 'Sin descripción'}
      </ProcrastinatorText>

      {/* Progreso */}
      <ProcrastinatorBox variant="stack-sm">
        <ProcrastinatorBox variant="row-between" className="text-xs text-[#64748B]">
          <span>Progreso</span>
          <span className="font-semibold text-[#0F172A]">{percent}%</span>
        </ProcrastinatorBox>
        <div className="w-full h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#2563EB] rounded-full transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </ProcrastinatorBox>
    </ProcrastinatorBox>
  );
};
