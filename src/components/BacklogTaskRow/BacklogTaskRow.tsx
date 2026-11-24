import React, { useState } from 'react';
import {
  ArrowUpRight,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ListChecks,
  Sparkles,
  Square,
  Trash2
} from 'lucide-react';
import { Project, Subtask, Task } from '../../types';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorButton } from '../ProcrastinatorButton';
import { ProcrastinatorBadge } from '../ProcrastinatorBadge';
import { ProcrastinatorText } from '../ProcrastinatorText';
import { useI18n } from '../../i18n';

interface BacklogTaskRowProps {
  task: Task;
  project?: Project;
  showEpicBadge: boolean;
  isBreakingDown: boolean;
  onMoveToToday: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onBreakdown: (taskId: string) => void;
  onToggleSubtask: (task: Task, subId: string) => void;
}

export const BacklogTaskRow: React.FC<BacklogTaskRowProps> = ({
  task,
  project,
  showEpicBadge,
  isBreakingDown,
  onMoveToToday,
  onDelete,
  onBreakdown,
  onToggleSubtask
}) => {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  const subs: Subtask[] = task.subtasks || [];
  const doneSubs = subs.filter(s => s.done).length;

  return (
    <ProcrastinatorBox className="py-3 px-3 hover:bg-[#F8FAFC] rounded-lg transition-colors space-y-2">
      <ProcrastinatorBox className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <ProcrastinatorBox className="min-w-0 flex-1">
          <ProcrastinatorBox className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-[#0F172A]">{task.title}</span>
            {project && <ProcrastinatorBadge variant="neutral">{project.name}</ProcrastinatorBadge>}
            {task.epic && task.epic !== 'General' && showEpicBadge && (
              <ProcrastinatorBadge variant="primary">{task.epic}</ProcrastinatorBadge>
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

          <ProcrastinatorBox className="text-xs text-[#94A3B8] flex items-center gap-2 mt-1 flex-wrap">
            <span>{task.estimatedMinutes} min</span>
            <span>•</span>
            <span>
              {t.projects.difficultyPrefix} {task.difficulty}
            </span>
            {subs.length > 0 && (
              <>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setExpanded(prev => !prev)}
                  className="inline-flex items-center gap-1 text-[#2563EB] hover:underline font-medium"
                >
                  <ListChecks className="w-3.5 h-3.5" />
                  <span>
                    {t.projects.subtasksCount} {doneSubs}/{subs.length}
                  </span>
                  {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
              </>
            )}
            {task.deferredCount > 0 && (
              <>
                <span>•</span>
                <span className="text-[#D97706]">
                  {t.projects.deferredTimes} {task.deferredCount}x
                </span>
              </>
            )}
          </ProcrastinatorBox>
        </ProcrastinatorBox>

        <ProcrastinatorBox className="flex items-center gap-1.5 self-end sm:self-auto flex-shrink-0">
          {subs.length === 0 && (
            <ProcrastinatorButton
              variant="ghost"
              onClick={() => {
                setExpanded(true);
                onBreakdown(task.id);
              }}
              disabled={isBreakingDown}
              className="text-xs text-[#2563EB]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isBreakingDown ? t.projects.breakingDown : t.projects.breakDownAction}</span>
            </ProcrastinatorButton>
          )}

          <ProcrastinatorButton variant="secondary" onClick={() => onMoveToToday(task.id)}>
            <span>{t.projects.scheduleToday}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </ProcrastinatorButton>

          <button
            onClick={() => onDelete(task.id)}
            className="p-2 text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded-lg transition-colors"
            title={t.common.delete}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </ProcrastinatorBox>
      </ProcrastinatorBox>

      {expanded && subs.length > 0 && (
        <div className="pl-2 space-y-1 pt-1">
          {subs.map(sub => (
            <div
              key={sub.id}
              onClick={() => onToggleSubtask(task, sub.id)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                sub.done
                  ? 'bg-[#DCFCE7] border-[#BBF7D0] text-[#15803D]'
                  : 'bg-white border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#334155]'
              }`}
            >
              {sub.done ? (
                <CheckSquare className="w-3.5 h-3.5 text-[#16A34A] flex-shrink-0" />
              ) : (
                <Square className="w-3.5 h-3.5 text-[#94A3B8] flex-shrink-0" />
              )}
              <span className={sub.done ? 'line-through' : ''}>{sub.title}</span>
            </div>
          ))}
        </div>
      )}
    </ProcrastinatorBox>
  );
};
