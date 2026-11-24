import React, { useState } from 'react';
import { Plus, Sparkles, X } from 'lucide-react';
import { Difficulty, Priority, Project, TaskPMEvaluation } from '../../types';
import { api } from '../../services/api';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorButton } from '../ProcrastinatorButton';
import { ProcrastinatorBadge } from '../ProcrastinatorBadge';
import { ProcrastinatorInput } from '../ProcrastinatorInput';
import { ProcrastinatorText } from '../ProcrastinatorText';
import { useI18n } from '../../i18n';
import { styles } from '../../style';

interface NewTaskPanelProps {
  projects: Project[];
  onClose: () => void;
  onCreated: () => void;
}

export const NewTaskPanel: React.FC<NewTaskPanelProps> = ({ projects, onClose, onCreated }) => {
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [epic, setEpic] = useState('General');
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [minutes, setMinutes] = useState(45);
  const [priority, setPriority] = useState<Priority>('medium');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [evaluation, setEvaluation] = useState<TaskPMEvaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const handleEvaluate = async () => {
    if (!title.trim()) return;
    setIsEvaluating(true);
    try {
      const result = await api.evaluateTask(title, desc, projectId);
      setEvaluation(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await api.createTask({
        projectId: projectId || projects[0]?.id || 'default',
        title: title.trim(),
        description: desc.trim(),
        epic: epic.trim() || 'General',
        estimatedMinutes: minutes,
        priority,
        difficulty
      });
      onCreated();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <ProcrastinatorBox variant="panel" className="animate-fadeIn">
      <ProcrastinatorBox className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
        <ProcrastinatorBox className="flex items-center gap-2">
          <Plus className="w-5 h-5 text-[#2563EB]" />
          <ProcrastinatorText variant="h2">{t.projects.newTaskTitle}</ProcrastinatorText>
        </ProcrastinatorBox>
        <button
          onClick={onClose}
          className="text-[#94A3B8] hover:text-[#0F172A] p-1 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </ProcrastinatorBox>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={styles.input.label}>{t.projects.projectLabel}</label>
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className={styles.input.select}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <ProcrastinatorInput
            label={t.projects.epicLabel}
            type="text"
            placeholder={t.projects.epicInputPlaceholder}
            value={epic}
            onChange={e => setEpic(e.target.value)}
          />
        </div>

        <div>
          <label className={styles.input.label}>{t.projects.taskTitleLabel}</label>
          <ProcrastinatorBox className="flex gap-2">
            <ProcrastinatorInput
              type="text"
              placeholder={t.projects.taskTitlePlaceholder}
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              autoFocus
            />
            <ProcrastinatorButton
              type="button"
              variant="secondary"
              onClick={handleEvaluate}
              disabled={!title.trim() || isEvaluating}
              className="flex-shrink-0 text-[#2563EB] bg-[#EFF6FF] border-[#DBEAFE]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isEvaluating ? t.projects.evaluating : t.projects.evaluateWithPm}
            </ProcrastinatorButton>
          </ProcrastinatorBox>
        </div>

        <div>
          <label className={styles.input.label}>{t.projects.detailsLabel}</label>
          <textarea
            placeholder={t.projects.detailsPlaceholder}
            value={desc}
            onChange={e => setDesc(e.target.value)}
            rows={2}
            className={styles.input.base}
          />
        </div>

        {evaluation && (
          <ProcrastinatorBox variant="subtle" className="space-y-2 animate-fadeIn text-xs">
            <ProcrastinatorBox className="flex items-center justify-between">
              <span className="font-bold text-[#0F172A] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                {t.projects.pmVerdict}
              </span>
              <ProcrastinatorBadge variant={evaluation.isUseful ? 'success' : 'warning'}>
                {evaluation.isUseful ? t.projects.usefulBadge : t.projects.distractionBadge}
              </ProcrastinatorBadge>
            </ProcrastinatorBox>

            <p className="text-[#475569] leading-relaxed">{evaluation.verdict}</p>

            <ProcrastinatorBox className="flex items-center justify-between pt-2 border-t border-[#E2E8F0] text-slate-600">
              <div>
                <span>
                  {t.projects.speedTime} <strong>{evaluation.estimatedMinutes} min</strong>
                </span>
                <span className="mx-2">•</span>
                <span>
                  {t.projects.priorityLabel} <strong className="capitalize">{evaluation.suggestedPriority}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMinutes(evaluation.estimatedMinutes);
                  setPriority(evaluation.suggestedPriority);
                }}
                className="text-[#2563EB] hover:underline font-semibold"
              >
                {t.projects.applySuggestions}
              </button>
            </ProcrastinatorBox>

            {evaluation.breakdownWarning && (
              <div className="p-2 bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] rounded-lg">
                {evaluation.breakdownWarning}
              </div>
            )}
          </ProcrastinatorBox>
        )}

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={styles.input.label}>{t.projects.timeLabel}</label>
            <select
              value={minutes}
              onChange={e => setMinutes(Number(e.target.value))}
              className={styles.input.select}
            >
              <option value={20}>20 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>60 min</option>
              <option value={90}>90 min</option>
            </select>
          </div>

          <div>
            <label className={styles.input.label}>{t.projects.priorityLabel.replace(':', '')}</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value as Priority)}
              className={styles.input.select}
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
              <option value="urgent">urgent</option>
            </select>
          </div>

          <div>
            <label className={styles.input.label}>{t.projects.difficultyLabel}</label>
            <select
              value={difficulty}
              onChange={e => setDifficulty(e.target.value as Difficulty)}
              className={styles.input.select}
            >
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="hard">hard</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
          <ProcrastinatorButton type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </ProcrastinatorButton>
          <ProcrastinatorButton variant="primary" type="submit">
            {t.projects.saveTask}
          </ProcrastinatorButton>
        </div>
      </form>
    </ProcrastinatorBox>
  );
};
