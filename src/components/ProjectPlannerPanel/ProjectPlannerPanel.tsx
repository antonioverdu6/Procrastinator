import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  Layers,
  Plus,
  Send,
  Sparkles,
  X
} from 'lucide-react';
import { PlanScope, ProjectPlanProposal, ProposedTask } from '../../types';
import { api } from '../../services/api';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorButton } from '../ProcrastinatorButton';
import { ProcrastinatorBadge } from '../ProcrastinatorBadge';
import { ProcrastinatorInput } from '../ProcrastinatorInput';
import { ProcrastinatorText } from '../ProcrastinatorText';
import { formatMsg, useI18n } from '../../i18n';
import { styles } from '../../style';

interface ProjectPlannerPanelProps {
  draftProposal?: ProjectPlanProposal | null;
  onClearDraftProposal?: () => void;
  onClose: () => void;
  onCommitted: () => void;
}

function groupProposedByEpic(list: ProposedTask[]): [string, ProposedTask[]][] {
  const map = new Map<string, ProposedTask[]>();
  for (const t of list) {
    const epic = t.epic || 'General';
    if (!map.has(epic)) map.set(epic, []);
    map.get(epic)!.push(t);
  }
  return Array.from(map.entries());
}

export const ProjectPlannerPanel: React.FC<ProjectPlannerPanelProps> = ({
  draftProposal,
  onClearDraftProposal,
  onClose,
  onCommitted
}) => {
  const { t } = useI18n();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [stack, setStack] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [scope, setScope] = useState<PlanScope>('standard');

  const [proposedTasks, setProposedTasks] = useState<ProposedTask[]>([]);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [subtaskDrafts, setSubtaskDrafts] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  const [refineInput, setRefineInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [refineMessages, setRefineMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);

  useEffect(() => {
    if (draftProposal) {
      setName(draftProposal.projectName);
      setDesc(draftProposal.projectDescription);
      setProposedTasks(draftProposal.tasks);
      setStep(2);
      setRefineMessages([
        {
          role: 'assistant',
          text: formatMsg(t.conversations.plannerIntro.importedFromCopilot, {
            count: draftProposal.tasks.length
          })
        }
      ]);
      onClearDraftProposal?.();
    }
  }, [draftProposal]);

  const handleStartRoadmap = async () => {
    if (!name.trim()) return;
    setIsGenerating(true);
    try {
      const generated = await api.generateRoadmap(name, desc, scope, stack);
      setProposedTasks(generated);
      setStep(2);
      const epicsCount = new Set(generated.map(tk => tk.epic || 'General')).size;
      const calcHours = Math.max(
        1,
        Math.round((generated.reduce((s, tk) => s + tk.estimatedMinutes, 0) / 60) * 10) / 10
      );
      setRefineMessages([
        {
          role: 'assistant',
          text: formatMsg(t.conversations.plannerIntro.generatedRoadmap, {
            name,
            epics: epicsCount,
            tasks: generated.length,
            hours: calcHours
          })
        }
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refineInput.trim() || isRefining) return;
    const userText = refineInput.trim();
    setRefineInput('');
    setRefineMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsRefining(true);
    try {
      const result = await api.refineRoadmap(name, desc, proposedTasks, userText);
      setProposedTasks(result.updatedTasks);
      setRefineMessages(prev => [...prev, { role: 'assistant', text: result.reply }]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefining(false);
    }
  };

  const updateTask = (id: string, field: keyof ProposedTask, value: any) => {
    setProposedTasks(prev => prev.map(tk => (tk.id === id ? { ...tk, [field]: value } : tk)));
  };

  const deleteTask = (id: string) => {
    setProposedTasks(prev => prev.filter(tk => tk.id !== id));
  };

  const addManualTask = () => {
    const newId = `prop-${Date.now()}`;
    setProposedTasks(prev => [
      ...prev,
      {
        id: newId,
        epic: 'General',
        title: t.projects.addTaskBtn,
        description: '',
        estimatedMinutes: 35,
        priority: 'medium',
        difficulty: 'medium',
        subtasks: []
      }
    ]);
    setExpandedIds(prev => ({ ...prev, [newId]: true }));
  };

  const addSubtask = (taskId: string) => {
    const title = (subtaskDrafts[taskId] || '').trim();
    if (!title) return;
    setProposedTasks(prev =>
      prev.map(tk =>
        tk.id === taskId
          ? { ...tk, subtasks: [...(tk.subtasks || []), { id: `${taskId}-sub-${Date.now()}`, title, done: false }] }
          : tk
      )
    );
    setSubtaskDrafts(prev => ({ ...prev, [taskId]: '' }));
  };

  const removeSubtask = (taskId: string, subId: string) => {
    setProposedTasks(prev =>
      prev.map(tk =>
        tk.id === taskId ? { ...tk, subtasks: (tk.subtasks || []).filter(s => s.id !== subId) } : tk
      )
    );
  };

  const handleConfirm = async () => {
    if (!name.trim() || isCommitting) return;
    setIsCommitting(true);
    const calcHours = Math.max(
      1,
      Math.round((proposedTasks.reduce((s, tk) => s + (Number(tk.estimatedMinutes) || 0), 0) / 60) * 10) / 10
    );
    try {
      await api.commitProjectPlan({
        name: name.trim(),
        description: desc.trim(),
        color: '#2563EB',
        targetHours: calcHours,
        repoUrl: repoUrl.trim(),
        tasks: proposedTasks
      });
      onCommitted();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCommitting(false);
    }
  };

  const epicGroups = groupProposedByEpic(proposedTasks);
  const totalMins = proposedTasks.reduce((s, tk) => s + (Number(tk.estimatedMinutes) || 0), 0);
  const totalSubs = proposedTasks.reduce((s, tk) => s + (tk.subtasks?.length || 0), 0);

  return (
    <ProcrastinatorBox variant="panel" className="animate-fadeIn">
      <ProcrastinatorBox className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
        <ProcrastinatorBox className="flex items-center gap-2">
          <FolderKanban className="w-5 h-5 text-[#2563EB]" />
          <ProcrastinatorText variant="h2">
            {step === 1 ? t.projects.plannerTitle : `${t.projects.plannerEditTitle} ${name}`}
          </ProcrastinatorText>
        </ProcrastinatorBox>
        <button
          onClick={onClose}
          className="text-[#94A3B8] hover:text-[#0F172A] p-1 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </ProcrastinatorBox>

      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ProcrastinatorInput
              label={t.projects.projectNameLabel}
              type="text"
              placeholder={t.projects.projectNamePlaceholder}
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
            />
            <ProcrastinatorInput
              label={t.projects.stackLabel}
              type="text"
              placeholder={t.projects.stackPlaceholder}
              value={stack}
              onChange={e => setStack(e.target.value)}
            />
          </div>

          <div>
            <label className={styles.input.label}>{t.projects.descLabel}</label>
            <textarea
              placeholder={t.projects.descPlaceholder}
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={4}
              className={styles.input.base}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ProcrastinatorInput
              label={t.projects.repoUrlLabel}
              type="text"
              placeholder={t.projects.repoInputPlaceholder}
              value={repoUrl}
              onChange={e => setRepoUrl(e.target.value)}
            />
            <div>
              <label className={styles.input.label}>{t.projects.scopeLabel}</label>
              <select
                value={scope}
                onChange={e => setScope(e.target.value as PlanScope)}
                className={styles.input.select}
              >
                <option value="mvp">{t.projects.scopeOptions.mvp}</option>
                <option value="standard">{t.projects.scopeOptions.standard}</option>
                <option value="detailed">{t.projects.scopeOptions.detailed}</option>
              </select>
            </div>
          </div>

          <ProcrastinatorBox variant="subtle" className="py-2.5 px-3 text-xs text-[#475569]">
            <span className="font-semibold text-[#0F172A]">{t.projects.autoHoursTitle}</span>{' '}
            <span>{t.projects.autoHoursDesc}</span>
          </ProcrastinatorBox>

          <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                if (!name.trim()) return;
                await api.createProject({
                  name: name.trim(),
                  description: desc.trim(),
                  color: '#2563EB',
                  targetHours: 0,
                  repoUrl: repoUrl.trim(),
                  status: 'active'
                });
                onCommitted();
              }}
              disabled={!name.trim()}
              className="text-xs text-[#64748B] hover:text-[#0F172A] hover:underline"
            >
              {t.projects.createEmpty}
            </button>

            <div className="flex gap-2">
              <ProcrastinatorButton type="button" variant="ghost" onClick={onClose}>
                {t.common.cancel}
              </ProcrastinatorButton>
              <ProcrastinatorButton
                type="button"
                variant="primary"
                onClick={handleStartRoadmap}
                disabled={!name.trim() || isGenerating}
              >
                <Sparkles className="w-4 h-4" />
                <span>{isGenerating ? t.projects.planningLoading : t.projects.planWithPm}</span>
                <ArrowRight className="w-4 h-4" />
              </ProcrastinatorButton>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <ProcrastinatorBox variant="subtle" className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <ProcrastinatorBadge variant="primary">
                {epicGroups.length} {t.projects.epicsModules}
              </ProcrastinatorBadge>
              <span className="text-[#334155]">
                <strong>{proposedTasks.length}</strong> {t.projects.tasksWord} •{' '}
                <strong>{totalSubs}</strong> {t.projects.subtasksWord}
              </span>
              <span className="text-[#64748B]">
                {t.projects.pmCalculatedGoal} <strong>{(totalMins / 60).toFixed(1)}h</strong> ({totalMins}m)
              </span>
            </div>

            <ProcrastinatorButton type="button" variant="secondary" onClick={addManualTask} className="text-xs py-1 px-2.5">
              <Plus className="w-3.5 h-3.5" />
              <span>{t.projects.addTaskBtn}</span>
            </ProcrastinatorButton>
          </ProcrastinatorBox>

          <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
            {epicGroups.map(([epicName, epicTasks]) => (
              <ProcrastinatorBox key={epicName} variant="epic-section">
                <ProcrastinatorBox variant="epic-header">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#2563EB]" />
                    <span className="text-xs font-bold text-[#0F172A]">{epicName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
                    <span>
                      {epicTasks.length} {t.projects.tasksWord}
                    </span>
                    <span>•</span>
                    <span>{epicTasks.reduce((s, tk) => s + tk.estimatedMinutes, 0)}m</span>
                  </div>
                </ProcrastinatorBox>

                <div className="divide-y divide-[#F1F5F9]">
                  {epicTasks.map(tk => {
                    const isExpanded = Boolean(expandedIds[tk.id]);
                    const subs = tk.subtasks || [];
                    return (
                      <div key={tk.id} className="p-3 bg-white space-y-2 text-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => setExpandedIds(prev => ({ ...prev, [tk.id]: !prev[tk.id] }))}
                              className="text-[#64748B] hover:text-[#0F172A] p-0.5"
                            >
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                            <input
                              type="text"
                              value={tk.title}
                              onChange={e => updateTask(tk.id, 'title', e.target.value)}
                              className="flex-1 bg-transparent border-b border-transparent hover:border-[#CBD5E1] focus:border-[#2563EB] focus:outline-none font-medium text-[#0F172A] px-1 py-0.5"
                            />
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0 pl-6 sm:pl-0">
                            <button
                              type="button"
                              onClick={() => setExpandedIds(prev => ({ ...prev, [tk.id]: !prev[tk.id] }))}
                              className="px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0] text-[11px]"
                            >
                              {subs.length} {t.projects.subtasksCount}
                            </button>
                            <select
                              value={tk.priority}
                              onChange={e => updateTask(tk.id, 'priority', e.target.value)}
                              className="bg-[#F8FAFC] border border-[#E2E8F0] rounded px-1.5 py-0.5 text-[11px]"
                            >
                              <option value="urgent">urgent</option>
                              <option value="high">high</option>
                              <option value="medium">medium</option>
                              <option value="low">low</option>
                            </select>
                            <input
                              type="number"
                              value={tk.estimatedMinutes}
                              onChange={e => updateTask(tk.id, 'estimatedMinutes', Number(e.target.value))}
                              className="w-12 bg-[#F1F5F9] border border-[#E2E8F0] rounded px-1 py-0.5 text-center font-mono"
                            />
                            <span className="text-[#94A3B8]">m</span>
                            <button
                              type="button"
                              onClick={() => deleteTask(tk.id)}
                              className="p-1 text-[#94A3B8] hover:text-[#DC2626] rounded transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="pl-6 space-y-2 pt-1">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <input
                                type="text"
                                value={tk.epic}
                                onChange={e => updateTask(tk.id, 'epic', e.target.value)}
                                placeholder={t.projects.epicPlaceholder}
                                className="bg-[#F8FAFC] border border-[#E2E8F0] rounded px-2 py-1 text-[11px] text-[#334155]"
                              />
                              <input
                                type="text"
                                value={tk.description}
                                onChange={e => updateTask(tk.id, 'description', e.target.value)}
                                placeholder={t.projects.criteriaPlaceholder}
                                className="sm:col-span-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded px-2 py-1 text-[11px] text-[#334155]"
                              />
                            </div>

                            <div className="space-y-1">
                              {subs.map(st => (
                                <div
                                  key={st.id}
                                  className="flex items-center justify-between gap-2 px-2 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded text-[11px]"
                                >
                                  <span className="text-[#334155]">• {st.title}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeSubtask(tk.id, st.id)}
                                    className="text-[#94A3B8] hover:text-[#DC2626]"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                              <div className="flex gap-1.5 pt-1">
                                <input
                                  type="text"
                                  placeholder={t.projects.addSubtaskPlaceholder}
                                  value={subtaskDrafts[tk.id] || ''}
                                  onChange={e => setSubtaskDrafts(prev => ({ ...prev, [tk.id]: e.target.value }))}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      addSubtask(tk.id);
                                    }
                                  }}
                                  className="flex-1 bg-white border border-[#E2E8F0] rounded px-2 py-1 text-[11px]"
                                />
                                <ProcrastinatorButton
                                  type="button"
                                  variant="secondary"
                                  onClick={() => addSubtask(tk.id)}
                                  className="text-[11px] py-1 px-2"
                                >
                                  {t.projects.addStepBtn}
                                </ProcrastinatorButton>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ProcrastinatorBox>
            ))}
          </div>

          <div className="border border-[#E2E8F0] rounded-xl p-3 bg-white space-y-2">
            <div className="text-xs font-semibold text-[#0F172A] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
              {t.projects.refineHeading}
            </div>

            <div className="space-y-2 max-h-32 overflow-y-auto text-xs">
              {refineMessages.map((m, i) => (
                <div
                  key={i}
                  className={`p-2 rounded-lg ${
                    m.role === 'user'
                      ? 'bg-[#EFF6FF] text-[#1D4ED8] ml-6'
                      : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] mr-6'
                  }`}
                >
                  {m.text}
                </div>
              ))}
              {isRefining && <div className="text-xs text-[#64748B] italic">{t.projects.refiningStatus}</div>}
            </div>

            <form onSubmit={handleRefine} className="flex gap-2">
              <ProcrastinatorInput
                type="text"
                placeholder={t.projects.refinePlaceholder}
                value={refineInput}
                onChange={e => setRefineInput(e.target.value)}
                disabled={isRefining}
              />
              <ProcrastinatorButton type="submit" variant="primary" disabled={!refineInput.trim() || isRefining}>
                <Send className="w-3.5 h-3.5" />
              </ProcrastinatorButton>
            </form>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-[#E2E8F0]">
            <ProcrastinatorButton type="button" variant="ghost" onClick={() => setStep(1)}>
              {t.common.back}
            </ProcrastinatorButton>

            <ProcrastinatorButton
              type="button"
              variant="success"
              onClick={handleConfirm}
              disabled={proposedTasks.length === 0 || isCommitting}
            >
              <Check className="w-4 h-4" />
              <span>
                {isCommitting
                  ? t.projects.savingBacklog
                  : `${t.projects.commitProjectBtn} ${proposedTasks.length} ${t.projects.tasksWord}`}
              </span>
            </ProcrastinatorButton>
          </div>
        </div>
      )}
    </ProcrastinatorBox>
  );
};
