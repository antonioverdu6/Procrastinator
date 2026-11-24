import React, { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  Layers,
  SlidersHorizontal
} from 'lucide-react';
import { ProjectPlanProposal, ProposedTask } from '../../types';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorButton } from '../ProcrastinatorButton';
import { ProcrastinatorBadge } from '../ProcrastinatorBadge';
import { useI18n } from '../../i18n';

interface ChatProposalCardProps {
  msgId: string;
  proposal: ProjectPlanProposal;
  isCommitting: boolean;
  onCommit: (msgId: string, proposal: ProjectPlanProposal) => void;
  onOpenInPlanner?: (proposal: ProjectPlanProposal) => void;
  onGoToProjects?: () => void;
}

function groupByEpic(tasks: ProposedTask[]): [string, ProposedTask[]][] {
  const map = new Map<string, ProposedTask[]>();
  for (const t of tasks) {
    const epic = t.epic || 'General';
    if (!map.has(epic)) map.set(epic, []);
    map.get(epic)!.push(t);
  }
  return Array.from(map.entries());
}

export const ChatProposalCard: React.FC<ChatProposalCardProps> = ({
  msgId,
  proposal,
  isCommitting,
  onCommit,
  onOpenInPlanner,
  onGoToProjects
}) => {
  const { t } = useI18n();
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const labels = t.conversations.copilot.proposal;

  const epicGroups = groupByEpic(proposal.tasks);
  const totalMins = proposal.tasks.reduce((sum, tk) => sum + tk.estimatedMinutes, 0);
  const totalSubs = proposal.tasks.reduce((sum, tk) => sum + (tk.subtasks?.length || 0), 0);

  return (
    <ProcrastinatorBox variant="proposal-card">
      <ProcrastinatorBox className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-1.5 font-bold text-[#0F172A] text-sm">
            <FolderKanban className="w-4 h-4 text-[#2563EB]" />
            <span>{proposal.projectName}</span>
          </div>
          <div className="text-[11px] text-[#64748B] flex items-center gap-2 mt-0.5 flex-wrap">
            <span>
              {epicGroups.length} {labels.epics}
            </span>
            <span>•</span>
            <span>
              {proposal.tasks.length} {labels.tasks}
            </span>
            <span>•</span>
            <span>
              {totalSubs} {labels.subtasks}
            </span>
            <span>•</span>
            <span>
              {labels.estHoursPrefix}
              {(totalMins / 60).toFixed(1)}h
            </span>
          </div>
        </div>

        {proposal.applied && (
          <ProcrastinatorBadge variant="success">
            <Check className="w-3 h-3" /> {labels.savedBadge}
          </ProcrastinatorBadge>
        )}
      </ProcrastinatorBox>

      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {epicGroups.map(([epicName, epicTasks]) => (
          <div key={epicName} className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
            <div className="px-2.5 py-1.5 bg-[#F1F5F9] border-b border-[#E2E8F0] flex items-center justify-between">
              <span className="font-semibold text-[#0F172A] text-[11px] flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-[#2563EB]" />
                {epicName}
              </span>
              <span className="text-[10px] text-[#64748B]">
                {epicTasks.length} {labels.tasks} • {epicTasks.reduce((s, tk) => s + tk.estimatedMinutes, 0)}m
              </span>
            </div>

            <div className="divide-y divide-[#F1F5F9]">
              {epicTasks.map(tk => {
                const rowKey = `${msgId}-${tk.id}`;
                const isExpanded = Boolean(expandedTasks[rowKey]);
                const subs = tk.subtasks || [];

                return (
                  <div key={tk.id} className="p-2 text-[11px]">
                    <div
                      className="flex items-center justify-between gap-2 cursor-pointer"
                      onClick={() => setExpandedTasks(prev => ({ ...prev, [rowKey]: !prev[rowKey] }))}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {subs.length > 0 ? (
                          isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-[#64748B] flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-[#64748B] flex-shrink-0" />
                          )
                        ) : null}
                        <span className="font-medium text-[#0F172A] truncate">{tk.title}</span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {subs.length > 0 && (
                          <span className="text-[10px] text-[#64748B] bg-[#F1F5F9] px-1.5 py-0.5 rounded">
                            {subs.length} {labels.stepsSuffix}
                          </span>
                        )}
                        <span className="font-mono text-[10px] text-[#475569]">{tk.estimatedMinutes}m</span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-1.5 pl-5 space-y-1 text-[#475569]">
                        {tk.description && <p className="text-[10px] text-[#64748B]">{tk.description}</p>}
                        {subs.map(st => (
                          <div key={st.id} className="flex items-start gap-1.5 text-[10px] text-[#334155]">
                            <span className="text-[#2563EB]">•</span>
                            <span>{st.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        {!proposal.applied ? (
          <>
            {onOpenInPlanner && (
              <ProcrastinatorButton
                variant="secondary"
                onClick={() => onOpenInPlanner(proposal)}
                className="text-xs py-1.5 px-3"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{labels.openInPlanner}</span>
              </ProcrastinatorButton>
            )}
            <ProcrastinatorButton
              variant="success"
              onClick={() => onCommit(msgId, proposal)}
              disabled={isCommitting}
              className="text-xs py-1.5 px-3"
            >
              <Check className="w-3.5 h-3.5" />
              <span>
                {isCommitting
                  ? labels.creatingProject
                  : `${labels.createProjectPrefix} (${proposal.tasks.length} ${labels.tasks})`}
              </span>
            </ProcrastinatorButton>
          </>
        ) : (
          onGoToProjects && (
            <ProcrastinatorButton
              variant="secondary"
              onClick={onGoToProjects}
              className="text-xs py-1.5 px-3"
            >
              <FolderKanban className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>{labels.viewInProjects}</span>
            </ProcrastinatorButton>
          )
        )}
      </div>
    </ProcrastinatorBox>
  );
};
