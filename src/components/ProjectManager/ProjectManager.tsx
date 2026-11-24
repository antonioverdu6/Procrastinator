import React, { useState, useEffect } from 'react';
import { FolderKanban, GitBranch, Layers, Plus } from 'lucide-react';
import { Project, ProjectPlanProposal, Subtask, Task } from '../../types';
import { api } from '../../services/api';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorButton } from '../ProcrastinatorButton';
import { ProcrastinatorBadge } from '../ProcrastinatorBadge';
import { ProcrastinatorText } from '../ProcrastinatorText';
import { ProjectPlannerPanel } from '../ProjectPlannerPanel';
import { NewTaskPanel } from '../NewTaskPanel';
import { ProjectRepoCard } from '../ProjectRepoCard';
import { BacklogTaskRow } from '../BacklogTaskRow';
import { useI18n } from '../../i18n';
import { styles } from '../../style';

interface ProjectManagerProps {
  projects: Project[];
  tasks: Task[];
  onRefreshData: () => void;
  onOpenChat: () => void;
  draftProposal?: ProjectPlanProposal | null;
  onClearDraftProposal?: () => void;
}

function groupTasksByEpic(list: Task[]): [string, Task[]][] {
  const map = new Map<string, Task[]>();
  for (const tk of list) {
    const epic = tk.epic || 'General';
    if (!map.has(epic)) map.set(epic, []);
    map.get(epic)!.push(tk);
  }
  return Array.from(map.entries());
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({
  projects,
  tasks,
  onRefreshData,
  draftProposal,
  onClearDraftProposal
}) => {
  const { t } = useI18n();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [showNewProjectPanel, setShowNewProjectPanel] = useState(false);
  const [showNewTaskPanel, setShowNewTaskPanel] = useState(false);
  const [backlogGroupMode, setBacklogGroupMode] = useState<'epic' | 'flat'>('epic');
  const [breakingDownTaskId, setBreakingDownTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (draftProposal) {
      setShowNewProjectPanel(true);
      setShowNewTaskPanel(false);
    }
  }, [draftProposal]);

  const today = new Date().toISOString().split('T')[0];
  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;
  const filteredTasks = tasks.filter(tk => selectedProjectId === 'all' || tk.projectId === selectedProjectId);

  const backlogTasks = filteredTasks.filter(tk => tk.status === 'backlog');
  const scheduledTasks = filteredTasks.filter(
    tk => tk.status === 'scheduled_today' || tk.status === 'in_progress'
  );
  const completedTasks = filteredTasks.filter(tk => tk.status === 'completed');

  const getProject = (id: string) => projects.find(p => p.id === id);

  const handleMoveToToday = async (taskId: string) => {
    try {
      await api.updateTask(taskId, { status: 'scheduled_today', scheduledDate: today });
      onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await api.deleteTask(taskId);
      onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleBacklogSubtask = async (task: Task, subId: string) => {
    const subs: Subtask[] = (task.subtasks || []).map(s =>
      s.id === subId ? { ...s, done: !s.done } : s
    );
    try {
      await api.updateTask(task.id, { subtasks: subs });
      onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBreakdownTask = async (taskId: string) => {
    if (breakingDownTaskId) return;
    setBreakingDownTaskId(taskId);
    try {
      await api.breakdownTask(taskId);
      onRefreshData();
    } catch (err) {
      console.error(err);
    } finally {
      setBreakingDownTaskId(null);
    }
  };

  const backlogEpicGroups = groupTasksByEpic(backlogTasks);

  const renderTaskRow = (task: Task) => (
    <BacklogTaskRow
      key={task.id}
      task={task}
      project={getProject(task.projectId)}
      showEpicBadge={backlogGroupMode === 'flat'}
      isBreakingDown={breakingDownTaskId === task.id}
      onMoveToToday={handleMoveToToday}
      onDelete={handleDeleteTask}
      onBreakdown={handleBreakdownTask}
      onToggleSubtask={handleToggleBacklogSubtask}
    />
  );

  return (
    <ProcrastinatorBox className="space-y-6 animate-fadeIn">
      <ProcrastinatorBox className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <ProcrastinatorBox>
          <ProcrastinatorText variant="h1">{t.projects.title}</ProcrastinatorText>
          <ProcrastinatorText variant="caption">{t.projects.subtitle}</ProcrastinatorText>
        </ProcrastinatorBox>

        <ProcrastinatorBox className="flex items-center gap-2">
          <ProcrastinatorButton
            variant="secondary"
            onClick={() => {
              setShowNewProjectPanel(prev => !prev);
              setShowNewTaskPanel(false);
            }}
          >
            <FolderKanban className="w-4 h-4 text-[#2563EB]" /> {t.projects.newProject}
          </ProcrastinatorButton>
          <ProcrastinatorButton
            variant="primary"
            onClick={() => {
              setShowNewTaskPanel(prev => !prev);
              setShowNewProjectPanel(false);
            }}
          >
            <Plus className="w-4 h-4" /> {t.projects.newTask}
          </ProcrastinatorButton>
        </ProcrastinatorBox>
      </ProcrastinatorBox>

      {showNewProjectPanel && (
        <ProjectPlannerPanel
          draftProposal={draftProposal}
          onClearDraftProposal={onClearDraftProposal}
          onClose={() => setShowNewProjectPanel(false)}
          onCommitted={() => {
            setShowNewProjectPanel(false);
            onRefreshData();
          }}
        />
      )}

      {showNewTaskPanel && (
        <NewTaskPanel
          projects={projects}
          onClose={() => setShowNewTaskPanel(false)}
          onCreated={() => {
            setShowNewTaskPanel(false);
            onRefreshData();
          }}
        />
      )}

      <ProcrastinatorBox className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map(proj => {
          const projTasks = tasks.filter(tk => tk.projectId === proj.id);
          const completedCount = projTasks.filter(tk => tk.status === 'completed').length;
          const completedMins = projTasks
            .filter(tk => tk.status === 'completed')
            .reduce((s, tk) => s + (tk.actualMinutes || tk.estimatedMinutes), 0);
          const totalEstMins =
            projTasks.reduce((s, tk) => s + tk.estimatedMinutes, 0) ||
            (proj.targetHours ? proj.targetHours * 60 : 60);
          const percent = Math.min(100, Math.round((completedMins / totalEstMins) * 100));
          const isSelected = selectedProjectId === proj.id;

          return (
            <ProcrastinatorBox
              key={proj.id}
              onClick={() => setSelectedProjectId(isSelected ? 'all' : proj.id)}
              className={`p-5 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white border-[#2563EB] ring-2 ring-[#2563EB]/10'
                  : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1]'
              }`}
            >
              <ProcrastinatorBox className="flex items-start justify-between gap-2 mb-2">
                <ProcrastinatorText variant="h3" className="truncate">
                  {proj.name}
                </ProcrastinatorText>
                <ProcrastinatorBadge variant="neutral">
                  {completedCount}/{projTasks.length} {t.projects.doneCounter}
                </ProcrastinatorBadge>
              </ProcrastinatorBox>

              <ProcrastinatorText variant="caption" className="line-clamp-2 h-8 mb-3 block">
                {proj.description || t.common.noDescription}
              </ProcrastinatorText>

              {proj.repoUrl && (
                <div className="mb-2.5 flex items-center gap-1.5 text-[11px] text-[#2563EB] truncate">
                  <GitBranch className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">
                    {proj.repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//i, '')}
                  </span>
                </div>
              )}

              <ProcrastinatorBox className="space-y-1">
                <ProcrastinatorBox className="flex justify-between text-xs text-[#64748B]">
                  <span>{t.projects.progress}</span>
                  <span className="font-semibold text-[#0F172A]">{percent}%</span>
                </ProcrastinatorBox>
                <ProcrastinatorBox className="w-full h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#2563EB] rounded-full transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </ProcrastinatorBox>
              </ProcrastinatorBox>
            </ProcrastinatorBox>
          );
        })}
      </ProcrastinatorBox>

      {selectedProject && <ProjectRepoCard project={selectedProject} onUpdated={onRefreshData} />}

      <ProcrastinatorBox variant="card">
        <ProcrastinatorBox className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
          <ProcrastinatorBox className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedProjectId('all')}
              className={selectedProjectId === 'all' ? styles.button.tabActive : styles.button.tabInactive}
            >
              {t.projects.allFilter} ({tasks.length})
            </button>
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProjectId(p.id)}
                className={selectedProjectId === p.id ? styles.button.tabActive : styles.button.tabInactive}
              >
                {p.name}
              </button>
            ))}
          </ProcrastinatorBox>

          <ProcrastinatorBox className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 bg-[#F1F5F9] p-0.5 rounded-lg border border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setBacklogGroupMode('epic')}
                className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors ${
                  backlogGroupMode === 'epic'
                    ? 'bg-white text-[#0F172A] border border-[#E2E8F0]'
                    : 'text-[#64748B]'
                }`}
              >
                {t.projects.byEpicView}
              </button>
              <button
                type="button"
                onClick={() => setBacklogGroupMode('flat')}
                className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors ${
                  backlogGroupMode === 'flat'
                    ? 'bg-white text-[#0F172A] border border-[#E2E8F0]'
                    : 'text-[#64748B]'
                }`}
              >
                {t.projects.flatListView}
              </button>
            </div>

            <div className="text-xs text-[#64748B] flex items-center gap-2">
              <span>
                {t.projects.backlogLabel} <strong>{backlogTasks.length}</strong>
              </span>
              <span>•</span>
              <span>
                {t.projects.todayLabel} <strong>{scheduledTasks.length}</strong>
              </span>
              <span>•</span>
              <span>
                {t.projects.doneLabel} <strong>{completedTasks.length}</strong>
              </span>
            </div>
          </ProcrastinatorBox>
        </ProcrastinatorBox>

        {backlogTasks.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#94A3B8]">{t.projects.emptyBacklog}</div>
        ) : backlogGroupMode === 'epic' ? (
          <div className="space-y-4 mt-4">
            {backlogEpicGroups.map(([epicName, epicTasks]) => (
              <ProcrastinatorBox key={epicName} variant="epic-section">
                <ProcrastinatorBox variant="epic-header">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#2563EB]" />
                    <span className="text-xs font-bold text-[#0F172A]">{epicName}</span>
                  </div>
                  <span className="text-[11px] text-[#64748B]">
                    {epicTasks.length} {t.projects.tasksWord} •{' '}
                    {epicTasks.reduce((s, tk) => s + tk.estimatedMinutes, 0)}m
                  </span>
                </ProcrastinatorBox>
                <div className="divide-y divide-[#F1F5F9]">{epicTasks.map(renderTaskRow)}</div>
              </ProcrastinatorBox>
            ))}
          </div>
        ) : (
          <ProcrastinatorBox className="divide-y divide-[#F1F5F9] mt-2">
            {backlogTasks.map(renderTaskRow)}
          </ProcrastinatorBox>
        )}
      </ProcrastinatorBox>
    </ProcrastinatorBox>
  );
};
