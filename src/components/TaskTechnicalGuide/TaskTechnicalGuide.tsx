import React, { useState } from 'react';
import {
  AlertCircle,
  CheckSquare,
  FileCode,
  GitBranch,
  MessageSquare,
  Send,
  Square
} from 'lucide-react';
import { Project, Task, TaskActionPlan, TaskAskMessage } from '../../types';
import { api } from '../../services/api';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorButton } from '../ProcrastinatorButton';
import { ProcrastinatorBadge } from '../ProcrastinatorBadge';
import { ProcrastinatorInput } from '../ProcrastinatorInput';
import { ProcrastinatorText } from '../ProcrastinatorText';
import { FormattedText } from '../FormattedText';
import { formatMsg, useI18n } from '../../i18n';

interface TaskTechnicalGuideProps {
  task: Task;
  project?: Project;
  plan: TaskActionPlan;
  hasPersistedSubtasks: boolean;
  qaMessages: TaskAskMessage[];
  onAppendQaMessages: (entries: TaskAskMessage[]) => void;
}

export const TaskTechnicalGuide: React.FC<TaskTechnicalGuideProps> = ({
  task,
  project,
  plan,
  hasPersistedSubtasks,
  qaMessages,
  onAppendQaMessages
}) => {
  const { t } = useI18n();
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});
  const [qaInput, setQaInput] = useState('');
  const [askingQa, setAskingQa] = useState(false);

  const handleAskTechnical = async (customQuestion?: string) => {
    const q = (customQuestion || qaInput).trim();
    if (!q || askingQa) return;

    const userEntry: TaskAskMessage = { role: 'user', content: q };
    setQaInput('');
    setAskingQa(true);

    try {
      const res = await api.askTaskTechnicalQuestion(
        task.id,
        q,
        qaMessages.map(m => ({ role: m.role, content: m.content }))
      );
      onAppendQaMessages([
        userEntry,
        {
          role: 'assistant',
          content: res.answer,
          referencedFiles: res.referencedFiles,
          codeSnippet: res.codeSnippet
        }
      ]);
    } catch (err) {
      console.error(err);
      onAppendQaMessages([
        userEntry,
        { role: 'assistant', content: t.conversations.timerQa.errorReply }
      ]);
    } finally {
      setAskingQa(false);
    }
  };

  const contextLabel = project?.repoUrl
    ? formatMsg(t.conversations.timerQa.contextWithRepo, { project: project.name })
    : formatMsg(t.conversations.timerQa.contextProjectOnly, {
        project: project?.name || 'General'
      });

  return (
    <ProcrastinatorBox variant="subtle" className="mt-4 pt-4 border-t border-[#E2E8F0] space-y-4 animate-fadeIn">
      <ProcrastinatorBox className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <ProcrastinatorBadge variant="primary">{t.timer.guideBadge}</ProcrastinatorBadge>
          {plan.repoContextUsed && plan.repoLabel && (
            <ProcrastinatorBadge variant="success">
              <GitBranch className="w-3 h-3" />
              <span>
                {t.timer.readFromRepo} {plan.repoLabel}
              </span>
            </ProcrastinatorBadge>
          )}
        </div>

        <ProcrastinatorText variant="body" className="font-medium block">
          {plan.summary}
        </ProcrastinatorText>

        {plan.architectureNotes && (
          <div className="bg-white border border-[#E2E8F0] rounded-lg p-3 text-xs text-[#334155] leading-relaxed">
            <span className="font-semibold text-[#0F172A] block mb-1">{t.timer.howToSolve}</span>
            {plan.architectureNotes}
          </div>
        )}
      </ProcrastinatorBox>

      {!hasPersistedSubtasks && (
        <ProcrastinatorBox className="space-y-1.5">
          <ProcrastinatorText variant="caption" className="font-semibold uppercase tracking-wider block">
            {t.timer.stepsToRun}
          </ProcrastinatorText>
          <ProcrastinatorBox className="space-y-1">
            {plan.steps.map((step, idx) => {
              const isChecked = Boolean(checkedSteps[idx]);
              return (
                <div
                  key={idx}
                  onClick={() => setCheckedSteps(prev => ({ ...prev, [idx]: !prev[idx] }))}
                  className={`flex items-start gap-2.5 p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                    isChecked
                      ? 'bg-[#DCFCE7] text-[#15803D]'
                      : 'bg-white hover:bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0]'
                  }`}
                >
                  {isChecked ? (
                    <CheckSquare className="w-4 h-4 text-[#16A34A] flex-shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-4 h-4 text-[#94A3B8] flex-shrink-0 mt-0.5" />
                  )}
                  <span className={isChecked ? 'line-through text-[#15803D]' : ''}>{step}</span>
                </div>
              );
            })}
          </ProcrastinatorBox>
        </ProcrastinatorBox>
      )}

      {plan.quickSnippet && plan.quickSnippet.trim().length > 0 && (
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-3 text-xs">
          <span className="font-semibold text-[#0F172A] block mb-1.5">{t.timer.starterSnippet}</span>
          <pre className="bg-[#F8FAFC] border border-[#E2E8F0] rounded p-2.5 overflow-x-auto font-mono text-[11px] text-[#0F172A] whitespace-pre-wrap">
            {plan.quickSnippet}
          </pre>
        </div>
      )}

      <ProcrastinatorBox className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {plan.filesToTouch && plan.filesToTouch.length > 0 && (
          <ProcrastinatorBox className="bg-white p-2.5 rounded-lg border border-[#E2E8F0]">
            <span className="font-semibold text-[#475569] flex items-center gap-1 mb-1">
              <FileCode className="w-3.5 h-3.5 text-[#2563EB]" /> {t.timer.filesToTouch}
            </span>
            <div className="flex flex-wrap gap-1">
              {plan.filesToTouch.map((f, i) => (
                <span key={i} className="px-2 py-0.5 bg-[#F1F5F9] text-[#0F172A] rounded font-mono text-[11px]">
                  {f}
                </span>
              ))}
            </div>
          </ProcrastinatorBox>
        )}

        {plan.pitfall && (
          <div className="bg-[#FEF3C7] border border-[#FDE68A] p-2.5 rounded-lg text-[#92400E]">
            <span className="font-semibold flex items-center gap-1 mb-0.5">
              <AlertCircle className="w-3.5 h-3.5 text-[#D97706]" /> {t.timer.pitfallTitle}
            </span>
            <p className="text-[11px] leading-relaxed">{plan.pitfall}</p>
          </div>
        )}
      </ProcrastinatorBox>

      {/* Q&A Interactivo con el Tech Lead */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-semibold text-[#0F172A] flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-[#2563EB]" />
            {t.conversations.timerQa.heading}
          </span>
          <span className="text-[11px] text-[#64748B]">{contextLabel}</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {t.conversations.timerQa.quickQuestions.map(q => (
            <button
              key={q}
              type="button"
              onClick={() => handleAskTechnical(q)}
              disabled={askingQa}
              className="px-2 py-1 text-[11px] bg-[#F8FAFC] hover:bg-[#EFF6FF] text-[#334155] hover:text-[#2563EB] border border-[#E2E8F0] rounded-md transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {qaMessages.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto pt-1">
            {qaMessages.map((m, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-lg text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[#EFF6FF] text-[#1D4ED8] ml-6'
                    : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] mr-4 space-y-2'
                }`}
              >
                <FormattedText text={m.content} />
                {m.referencedFiles && m.referencedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {m.referencedFiles.map((rf, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 bg-white border border-[#E2E8F0] rounded font-mono text-[10px] text-[#0F172A]"
                      >
                        {rf}
                      </span>
                    ))}
                  </div>
                )}
                {m.codeSnippet && m.codeSnippet.trim().length > 0 && (
                  <pre className="bg-white border border-[#E2E8F0] rounded p-2 overflow-x-auto font-mono text-[11px] text-[#0F172A] whitespace-pre-wrap">
                    {m.codeSnippet}
                  </pre>
                )}
              </div>
            ))}
            {askingQa && (
              <div className="text-xs text-[#64748B] italic px-1">{t.conversations.timerQa.thinking}</div>
            )}
          </div>
        )}

        <form
          onSubmit={e => {
            e.preventDefault();
            handleAskTechnical();
          }}
          className="flex gap-2"
        >
          <ProcrastinatorInput
            type="text"
            placeholder={t.conversations.timerQa.inputPlaceholder}
            value={qaInput}
            onChange={e => setQaInput(e.target.value)}
            disabled={askingQa}
          />
          <ProcrastinatorButton type="submit" variant="primary" disabled={!qaInput.trim() || askingQa}>
            <Send className="w-3.5 h-3.5" />
          </ProcrastinatorButton>
        </form>
      </div>
    </ProcrastinatorBox>
  );
};
