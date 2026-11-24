import React from 'react';
import { ListChecks, CheckSquare, Square } from 'lucide-react';
import { Subtask } from '../../types';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { useI18n } from '../../i18n';

interface SubtaskChecklistProps {
  subtasks: Subtask[];
  onToggle: (subId: string) => void;
}

export const SubtaskChecklist: React.FC<SubtaskChecklistProps> = ({ subtasks, onToggle }) => {
  const { t } = useI18n();
  if (subtasks.length === 0) return null;

  const doneCount = subtasks.filter(s => s.done).length;

  return (
    <ProcrastinatorBox variant="subtle" className="mt-4 space-y-2">
      <ProcrastinatorBox className="flex items-center justify-between text-xs">
        <span className="font-semibold text-[#0F172A] flex items-center gap-1.5">
          <ListChecks className="w-4 h-4 text-[#2563EB]" />
          {t.timer.subtasksTitle} ({doneCount}/{subtasks.length})
        </span>
        <span className="text-[#64748B]">{t.timer.savedInProject}</span>
      </ProcrastinatorBox>

      <div className="space-y-1">
        {subtasks.map(sub => (
          <div
            key={sub.id}
            onClick={() => onToggle(sub.id)}
            className={`flex items-start gap-2.5 p-2 rounded-lg text-xs cursor-pointer transition-colors ${
              sub.done
                ? 'bg-[#DCFCE7] text-[#15803D]'
                : 'bg-white hover:bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0]'
            }`}
          >
            {sub.done ? (
              <CheckSquare className="w-4 h-4 text-[#16A34A] flex-shrink-0 mt-0.5" />
            ) : (
              <Square className="w-4 h-4 text-[#94A3B8] flex-shrink-0 mt-0.5" />
            )}
            <span className={sub.done ? 'line-through text-[#15803D]' : ''}>{sub.title}</span>
          </div>
        ))}
      </div>
    </ProcrastinatorBox>
  );
};
