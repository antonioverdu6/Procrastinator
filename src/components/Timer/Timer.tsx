import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Coffee,
  GitBranch,
  Pause,
  Play,
  Sparkles
} from 'lucide-react';
import { Task, Project, TaskActionPlan, Subtask, TaskAskMessage } from '../../types';
import { api } from '../../services/api';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorButton } from '../ProcrastinatorButton';
import { ProcrastinatorBadge } from '../ProcrastinatorBadge';
import { ProcrastinatorText } from '../ProcrastinatorText';
import { SubtaskChecklist } from '../SubtaskChecklist';
import { TaskTechnicalGuide } from '../TaskTechnicalGuide';
import { useI18n } from '../../i18n';

interface TimerProps {
  task: Task;
  project?: Project;
  onTaskCompleted: (taskId: string) => void;
  onTimeLogged: (taskId: string, additionalMinutes: number) => void;
  onTaskUpdated?: () => void;
}

const TIMER_STORAGE_KEY = 'procrastinator_timer_session';

interface PersistedTimerState {
  taskId: string;
  isRunning: boolean;
  startTimestamp: number | null;
  accumulatedSeconds: number;
  mode: 'focus' | 'break';
  lastUpdated: number;
}

const loadTimerState = (taskId: string): PersistedTimerState | null => {
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedTimerState;
    return parsed.taskId === taskId ? parsed : null;
  } catch {
    return null;
  }
};

const saveTimerState = (state: PersistedTimerState) => {
  try {
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore localStorage write errors
  }
};

export const Timer: React.FC<TimerProps> = ({
  task,
  project,
  onTaskCompleted,
  onTimeLogged,
  onTaskUpdated
}) => {
  const { t } = useI18n();
  const [isRunning, setIsRunning] = useState(false);
  const [startTimestamp, setStartTimestamp] = useState<number | null>(null);
  const [accumulatedSeconds, setAccumulatedSeconds] = useState(0);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');

  const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks || []);
  const [plan, setPlan] = useState<TaskActionPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [qaMessages, setQaMessages] = useState<TaskAskMessage[]>([]);

  const targetSeconds = (task.estimatedMinutes || 30) * 60;
  const isOvertime = mode === 'focus' && secondsElapsed > targetSeconds;

  useEffect(() => {
    setSubtasks(task.subtasks || []);
  }, [task.id, task.subtasks]);

  useEffect(() => {
    const saved = loadTimerState(task.id);
    if (saved) {
      let currentSeconds = saved.accumulatedSeconds;
      if (saved.isRunning && saved.startTimestamp) {
        currentSeconds += Math.max(0, Math.floor((Date.now() - saved.startTimestamp) / 1000));
      }
      setIsRunning(saved.isRunning);
      setStartTimestamp(saved.startTimestamp);
      setAccumulatedSeconds(saved.accumulatedSeconds);
      setSecondsElapsed(currentSeconds);
      setMode(saved.mode);
    } else {
      setIsRunning(false);
      setStartTimestamp(null);
      setAccumulatedSeconds(0);
      setSecondsElapsed(0);
      setMode('focus');
    }
    setPlan(null);
    setShowPlan(false);
    setQaMessages([]);
  }, [task.id]);

  useEffect(() => {
    if (!isRunning || !startTimestamp) return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((Date.now() - startTimestamp) / 1000));
      setSecondsElapsed(accumulatedSeconds + diff);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isRunning, startTimestamp, accumulatedSeconds]);

  const handleTogglePlay = () => {
    if (isRunning) {
      const diff = startTimestamp ? Math.max(0, Math.floor((Date.now() - startTimestamp) / 1000)) : 0;
      const total = accumulatedSeconds + diff;
      setIsRunning(false);
      setStartTimestamp(null);
      setAccumulatedSeconds(total);
      setSecondsElapsed(total);
      saveTimerState({
        taskId: task.id,
        isRunning: false,
        startTimestamp: null,
        accumulatedSeconds: total,
        mode,
        lastUpdated: Date.now()
      });
    } else {
      const now = Date.now();
      setIsRunning(true);
      setStartTimestamp(now);
      saveTimerState({
        taskId: task.id,
        isRunning: true,
        startTimestamp: now,
        accumulatedSeconds,
        mode,
        lastUpdated: now
      });
    }
  };

  const handleComplete = () => {
    setIsRunning(false);
    const finalSeconds =
      isRunning && startTimestamp
        ? accumulatedSeconds + Math.max(0, Math.floor((Date.now() - startTimestamp) / 1000))
        : secondsElapsed;
    onTimeLogged(task.id, Math.max(1, Math.round(finalSeconds / 60)));
    onTaskCompleted(task.id);
    try {
      localStorage.removeItem(TIMER_STORAGE_KEY);
    } catch {
      // Ignore
    }
    setStartTimestamp(null);
    setAccumulatedSeconds(0);
    setSecondsElapsed(0);
  };

  const handleSwitchBreak = () => {
    const finalSeconds =
      isRunning && startTimestamp
        ? accumulatedSeconds + Math.max(0, Math.floor((Date.now() - startTimestamp) / 1000))
        : secondsElapsed;
    setIsRunning(false);
    setStartTimestamp(null);
    setAccumulatedSeconds(0);
    setSecondsElapsed(0);
    const nextMode = mode === 'focus' ? 'break' : 'focus';
    setMode(nextMode);
    if (mode === 'focus') {
      const mins = Math.round(finalSeconds / 60);
      if (mins > 0) onTimeLogged(task.id, mins);
    }
    saveTimerState({
      taskId: task.id,
      isRunning: false,
      startTimestamp: null,
      accumulatedSeconds: 0,
      mode: nextMode,
      lastUpdated: Date.now()
    });
  };

  const handleToggleSubtask = async (subId: string) => {
    const updated = subtasks.map(s => (s.id === subId ? { ...s, done: !s.done } : s));
    setSubtasks(updated);
    try {
      await api.updateTask(task.id, { subtasks: updated });
      onTaskUpdated?.();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFetchActionPlan = async () => {
    if (plan) {
      setShowPlan(!showPlan);
      return;
    }
    setLoadingPlan(true);
    setShowPlan(true);
    try {
      const generatedPlan = await api.getTaskActionPlan(task.id);
      setPlan(generatedPlan);
      if (subtasks.length === 0 && generatedPlan.steps.length > 0) {
        const persisted: Subtask[] = generatedPlan.steps.map((step, i) => ({
          id: `${task.id}-sub-${i + 1}`,
          title: step.replace(/^\d+\.\s*/, ''),
          done: false
        }));
        setSubtasks(persisted);
        await api.updateTask(task.id, { subtasks: persisted });
        onTaskUpdated?.();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPlan(false);
    }
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const progressPercent = Math.min(100, Math.round((secondsElapsed / targetSeconds) * 100));

  return (
    <ProcrastinatorBox variant="card">
      <ProcrastinatorBox className="w-full h-1 bg-[#F1F5F9] rounded-full overflow-hidden mb-4">
        <div
          className={`h-full transition-all duration-300 ${isOvertime ? 'bg-[#D97706]' : 'bg-[#2563EB]'}`}
          style={{ width: `${progressPercent}%` }}
        />
      </ProcrastinatorBox>

      <ProcrastinatorBox className="flex flex-col md:flex-row items-center justify-between gap-4">
        <ProcrastinatorBox className="flex-1 min-w-0 w-full md:w-auto">
          <ProcrastinatorBox className="flex items-center gap-2 mb-1 flex-wrap">
            <ProcrastinatorBadge variant={mode === 'focus' ? 'primary' : 'success'}>
              {mode === 'focus' ? t.timer.focusActive : t.timer.breakMode}
            </ProcrastinatorBadge>
            {task.epic && task.epic !== 'General' && (
              <ProcrastinatorBadge variant="neutral">{task.epic}</ProcrastinatorBadge>
            )}
            {project && <ProcrastinatorBadge variant="neutral">{project.name}</ProcrastinatorBadge>}
            {project?.repoUrl && (
              <ProcrastinatorBadge variant="primary">
                <GitBranch className="w-3 h-3" />
                <span>{t.timer.repoConnected}</span>
              </ProcrastinatorBadge>
            )}
            <ProcrastinatorText variant="caption">
              {t.timer.estimated} {task.estimatedMinutes}m | {t.timer.loggedToday} {task.actualMinutes}m
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

          <ProcrastinatorBox className="mt-2.5">
            <ProcrastinatorButton
              variant="secondary"
              onClick={handleFetchActionPlan}
              disabled={loadingPlan}
              className="text-xs font-semibold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] border-[#DBEAFE]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {loadingPlan ? t.timer.analyzingRepo : showPlan ? t.timer.hideGuide : t.timer.openGuide}
              </span>
              {showPlan ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </ProcrastinatorButton>
          </ProcrastinatorBox>
        </ProcrastinatorBox>

        <ProcrastinatorBox className="flex items-center gap-3">
          <ProcrastinatorBox className="font-mono text-2xl font-bold tracking-tight text-[#0F172A] bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-1.5 rounded-lg min-w-[95px] text-center">
            {formatTime(secondsElapsed)}
          </ProcrastinatorBox>

          <ProcrastinatorBox className="flex items-center gap-1.5">
            <ProcrastinatorButton
              variant={isRunning ? 'secondary' : 'primary'}
              onClick={handleTogglePlay}
              title={isRunning ? t.timer.pause : t.timer.start}
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isRunning ? t.timer.pause : t.timer.start}</span>
            </ProcrastinatorButton>

            <ProcrastinatorButton variant="success" onClick={handleComplete} title={t.timer.doneTitle}>
              <CheckCircle2 className="w-4 h-4" />
              <span>{t.timer.done}</span>
            </ProcrastinatorButton>

            <ProcrastinatorButton
              variant="ghost"
              onClick={handleSwitchBreak}
              title={mode === 'focus' ? t.timer.breakTitle : t.timer.backToFocusTitle}
            >
              <Coffee className="w-4 h-4" />
            </ProcrastinatorButton>
          </ProcrastinatorBox>
        </ProcrastinatorBox>
      </ProcrastinatorBox>

      <SubtaskChecklist subtasks={subtasks} onToggle={handleToggleSubtask} />

      {showPlan && plan && (
        <TaskTechnicalGuide
          task={task}
          project={project}
          plan={plan}
          hasPersistedSubtasks={subtasks.length > 0}
          qaMessages={qaMessages}
          onAppendQaMessages={entries => setQaMessages(prev => [...prev, ...entries])}
        />
      )}

      {isOvertime && (
        <div className="mt-4 p-3 bg-[#FEF3C7] border border-[#FDE68A] rounded-lg flex items-center gap-2.5 text-xs text-[#92400E] animate-fadeIn">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#D97706]" />
          <div>
            <strong>
              {t.timer.overtimeTitle} ({task.estimatedMinutes} min).
            </strong>{' '}
            {t.timer.overtimeBody}
          </div>
        </div>
      )}
    </ProcrastinatorBox>
  );
};
