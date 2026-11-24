import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Check, Plus, Clock, ArrowRight, CornerDownRight, CheckCircle2 } from 'lucide-react';
import { Task, Project, UserSettings } from '../../types';
import { Timer } from '../Timer';
import { DailyCapacityCard } from '../DailyCapacityCard';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorButton } from '../ProcrastinatorButton';
import { ProcrastinatorBadge } from '../ProcrastinatorBadge';
import { ProcrastinatorInput } from '../ProcrastinatorInput';
import { ProcrastinatorText } from '../ProcrastinatorText';
import { api } from '../../services/api';
import { useI18n } from '../../i18n';

interface DailyFocusProps {
  tasks: Task[];
  projects: Project[];
  settings: UserSettings;
  onRefreshData: () => void;
  onOpenChat: () => void;
}

export const DailyFocus: React.FC<DailyFocusProps> = ({
  tasks,
  projects,
  settings,
  onRefreshData
}) => {
  const { t } = useI18n();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskMins, setNewTaskMins] = useState(30);
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [showAddForm, setShowAddForm] = useState(false);

  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter(
    tk => tk.scheduledDate === todayDateStr || tk.status === 'scheduled_today' || tk.status === 'in_progress'
  );
  const completedToday = tasks.filter(
    tk => tk.status === 'completed' && tk.completedAt && tk.completedAt.startsWith(todayDateStr)
  );
  const pendingToday = todayTasks.filter(tk => tk.status !== 'completed');

  const activeTask = pendingToday.find(tk => tk.status === 'in_progress') || pendingToday[0];
  const totalCapacityMinutes = Math.round(settings.defaultDailyHours * 60);
  const completedMinutes = completedToday.reduce(
    (sum, tk) => sum + (tk.actualMinutes || tk.estimatedMinutes),
    0
  );
  const progressPercent =
    totalCapacityMinutes > 0 ? Math.min(100, Math.round((completedMinutes / totalCapacityMinutes) * 100)) : 0;

  const handleTaskCompleted = async (taskId: string) => {
    try {
      await api.updateTask(taskId, {
        status: 'completed',
        completedAt: new Date().toISOString()
      });
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
      onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTimeLogged = async (taskId: string, additionalMinutes: number) => {
    try {
      await api.logTaskTime(taskId, additionalMinutes);
      onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartTask = async (taskId: string) => {
    try {
      for (const tk of tasks) {
        if (tk.status === 'in_progress' && tk.id !== taskId) {
          await api.updateTask(tk.id, { status: 'scheduled_today' });
        }
      }
      await api.updateTask(taskId, { status: 'in_progress' });
      onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeferTask = async (taskId: string) => {
    const target = tasks.find(x => x.id === taskId);
    try {
      await api.updateTask(taskId, {
        status: 'backlog',
        scheduledDate: undefined,
        deferredCount: (target?.deferredCount || 0) + 1
      });
      onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickAdjust = async (minutes: number) => {
    try {
      await api.adjustCapacity(minutes, false);
      onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateQuickTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      await api.createTask({
        projectId: selectedProjectId || projects[0]?.id || 'default',
        title: newTaskTitle.trim(),
        estimatedMinutes: newTaskMins,
        priority: 'high',
        difficulty: 'medium'
      });
      setNewTaskTitle('');
      setShowAddForm(false);
      onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const getProject = (id: string) => projects.find(p => p.id === id);

  return (
    <ProcrastinatorBox className="space-y-6 animate-fadeIn">
      <DailyCapacityCard
        totalCapacityMinutes={totalCapacityMinutes}
        completedMinutes={completedMinutes}
        pendingCount={pendingToday.length}
        progressPercent={progressPercent}
        onAdjustMinutes={handleQuickAdjust}
      />

      {activeTask ? (
        <ProcrastinatorBox className="space-y-2">
          <ProcrastinatorText variant="caption" className="font-semibold uppercase tracking-wider block">
            {t.daily.activeTaskHeading}
          </ProcrastinatorText>
          <Timer
            task={activeTask}
            project={getProject(activeTask.projectId)}
            onTaskCompleted={handleTaskCompleted}
            onTimeLogged={handleTimeLogged}
            onTaskUpdated={onRefreshData}
          />
        </ProcrastinatorBox>
      ) : (
        <ProcrastinatorBox variant="card" className="text-center space-y-2">
          <div className="w-10 h-10 bg-[#DCFCE7] text-[#16A34A] rounded-full flex items-center justify-center mx-auto mb-2">
            <Check className="w-5 h-5" />
          </div>
          <ProcrastinatorText variant="h3">{t.daily.dayCompletedTitle}</ProcrastinatorText>
          <ProcrastinatorText variant="caption" className="max-w-sm mx-auto block">
            {t.daily.dayCompletedSubtitle}
          </ProcrastinatorText>
          <div className="pt-2">
            <ProcrastinatorButton variant="primary" onClick={() => handleQuickAdjust(60)}>
              {t.daily.addExtraHourBacklog}
            </ProcrastinatorButton>
          </div>
        </ProcrastinatorBox>
      )}

      <ProcrastinatorBox variant="card">
        <ProcrastinatorBox className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
          <ProcrastinatorBox>
            <ProcrastinatorText variant="h3" className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#2563EB]" />
              {t.daily.queueTitle} ({pendingToday.length})
            </ProcrastinatorText>
            <ProcrastinatorText variant="caption">{t.daily.queueSubtitle}</ProcrastinatorText>
          </ProcrastinatorBox>

          <ProcrastinatorButton variant="secondary" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="w-4 h-4" /> {t.daily.quickMicroTask}
          </ProcrastinatorButton>
        </ProcrastinatorBox>

        {showAddForm && (
          <form onSubmit={handleCreateQuickTask} className="py-4 border-b border-[#E2E8F0] space-y-3">
            <ProcrastinatorBox className="flex flex-col sm:flex-row gap-2">
              <ProcrastinatorInput
                type="text"
                placeholder={t.daily.quickTaskPlaceholder}
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                autoFocus
              />
              <select
                value={newTaskMins}
                onChange={e => setNewTaskMins(Number(e.target.value))}
                className="bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A]"
              >
                <option value={20}>20m</option>
                <option value={30}>30m</option>
                <option value={45}>45m</option>
                <option value={60}>60m</option>
              </select>
              <select
                value={selectedProjectId}
                onChange={e => setSelectedProjectId(e.target.value)}
                className="bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A]"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ProcrastinatorButton variant="primary" type="submit">
                {t.daily.add}
              </ProcrastinatorButton>
            </ProcrastinatorBox>
          </form>
        )}

        <ProcrastinatorBox className="divide-y divide-[#F1F5F9] mt-2">
          {pendingToday.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#94A3B8]">{t.daily.emptyQueue}</div>
          ) : (
            pendingToday.map(task => {
              const project = getProject(task.projectId);
              const isCurrent = activeTask?.id === task.id;
              return (
                <ProcrastinatorBox
                  key={task.id}
                  className={`py-3 px-2 flex items-center justify-between gap-3 rounded-lg transition-colors ${
                    isCurrent ? 'bg-[#EFF6FF]' : 'hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => handleTaskCompleted(task.id)}
                      className="w-5 h-5 rounded border border-[#CBD5E1] hover:border-[#16A34A] hover:bg-[#DCFCE7] flex items-center justify-center text-transparent hover:text-[#16A34A] transition-colors flex-shrink-0"
                      title={t.daily.markDoneTitle}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#0F172A] truncate">{task.title}</span>
                        {project && <ProcrastinatorBadge variant="neutral">{project.name}</ProcrastinatorBadge>}
                      </div>
                      <div className="text-xs text-[#64748B] flex items-center gap-2 mt-0.5">
                        <span>{task.estimatedMinutes} min</span>
                        <span>•</span>
                        <span className="capitalize">{task.difficulty}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {!isCurrent && (
                      <ProcrastinatorButton variant="ghost" onClick={() => handleStartTask(task.id)}>
                        {t.daily.focusAction} <ArrowRight className="w-3.5 h-3.5" />
                      </ProcrastinatorButton>
                    )}

                    <button
                      onClick={() => handleDeferTask(task.id)}
                      className="p-1.5 text-[#94A3B8] hover:text-[#D97706] hover:bg-[#FEF3C7] rounded-lg transition-colors"
                      title={t.daily.deferTitle}
                    >
                      <CornerDownRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </ProcrastinatorBox>
              );
            })
          )}
        </ProcrastinatorBox>
      </ProcrastinatorBox>

      {completedToday.length > 0 && (
        <ProcrastinatorBox variant="subtle" className="space-y-2">
          <ProcrastinatorBox className="flex items-center justify-between text-xs font-semibold text-[#16A34A]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              {t.daily.completedToday} ({completedToday.length})
            </span>
            <span className="text-[#64748B]">
              {completedToday.reduce((s, tk) => s + (tk.actualMinutes || tk.estimatedMinutes), 0)}{' '}
              {t.daily.minutesDedicated}
            </span>
          </ProcrastinatorBox>

          <div className="divide-y divide-[#E2E8F0] text-xs">
            {completedToday.map(task => (
              <div key={task.id} className="py-2 flex items-center justify-between text-[#64748B]">
                <span className="line-through text-[#94A3B8] truncate">{task.title}</span>
                <span className="font-mono">{task.actualMinutes || task.estimatedMinutes}m</span>
              </div>
            ))}
          </div>
        </ProcrastinatorBox>
      )}
    </ProcrastinatorBox>
  );
};
