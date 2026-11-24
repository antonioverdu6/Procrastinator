import React, { useState, useEffect } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { DailyFocus } from './components/DailyFocus';
import { ProjectManager } from './components/ProjectManager';
import { Dashboard } from './components/Dashboard';
import { Chatbot } from './components/Chatbot';
import { SettingsModal } from './components/SettingsModal';
import { ProcrastinatorBox } from './components/ProcrastinatorBox';
import { I18nProvider, useI18n } from './i18n';
import { api } from './services/api';
import { Task, Project, UserSettings, ProductivityStats, ProjectPlanProposal } from './types';
import { styles } from './style';

const DEFAULT_SETTINGS: UserSettings = {
  defaultDailyHours: 2.5,
  aiProvider: 'gemini',
  apiKey: '',
  strictness: 'balanced',
  pomodoroWorkMins: 45,
  pomodoroBreakMins: 10,
  soundEnabled: true,
  autoBreakdownTasks: true,
  language: 'es',
  hasApiKey: false,
  hasGithubToken: false,
};

const DEFAULT_STATS: ProductivityStats = {
  streakDays: 1,
  totalHoursCompleted: 0,
  weeklyHoursCompleted: 0,
  todayPlannedMinutes: 150,
  todayWorkedMinutes: 0,
  todayCompletionRate: 0,
  procrastinationScore: 100,
  totalTasksFinished: 0,
  accuracyRatio: 1.0,
};

const AppShell: React.FC<{
  settings: UserSettings;
  onSettingsUpdated: (next: UserSettings) => void;
  tasks: Task[];
  projects: Project[];
  stats: ProductivityStats;
  isBackendConnected: boolean;
  refreshData: () => void;
}> = ({
  settings,
  onSettingsUpdated,
  tasks,
  projects,
  stats,
  isBackendConnected,
  refreshData
}) => {
  const { t } = useI18n();
  const [currentTab, setCurrentTab] = useState<NavTab>('daily');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [draftPlanProposal, setDraftPlanProposal] = useState<ProjectPlanProposal | null>(null);

  const handleOpenPlannerWithProposal = (proposal: ProjectPlanProposal) => {
    setDraftPlanProposal(proposal);
    setCurrentTab('projects');
  };

  return (
    <ProcrastinatorBox className={styles.layout.container}>
      {!isBackendConnected && (
        <div className="bg-[#FEF3C7] border-b border-[#FDE68A] text-[#92400E] text-xs px-4 py-2 text-center font-medium">
          {t.app.backendDisconnected}
        </div>
      )}

      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        stats={stats}
      />

      <ProcrastinatorBox as="main" variant="canvas">
        <div style={{ display: currentTab === 'daily' ? 'block' : 'none' }}>
          <DailyFocus
            tasks={tasks}
            projects={projects}
            settings={settings}
            onRefreshData={refreshData}
            onOpenChat={() => setCurrentTab('chat')}
          />
        </div>

        <div style={{ display: currentTab === 'projects' ? 'block' : 'none' }}>
          <ProjectManager
            projects={projects}
            tasks={tasks}
            onRefreshData={refreshData}
            onOpenChat={() => setCurrentTab('chat')}
            draftProposal={draftPlanProposal}
            onClearDraftProposal={() => setDraftPlanProposal(null)}
          />
        </div>

        <div style={{ display: currentTab === 'dashboard' ? 'block' : 'none' }}>
          <Dashboard stats={stats} />
        </div>

        <div style={{ display: currentTab === 'chat' ? 'block' : 'none' }}>
          <Chatbot
            settings={settings}
            onRefreshData={refreshData}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenPlannerWithProposal={handleOpenPlannerWithProposal}
            onGoToProjects={() => setCurrentTab('projects')}
          />
        </div>
      </ProcrastinatorBox>

      <SettingsModal
        settings={settings}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={newSettings => {
          onSettingsUpdated(newSettings);
          refreshData();
        }}
      />
    </ProcrastinatorBox>
  );
};

export const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [stats, setStats] = useState<ProductivityStats>(DEFAULT_STATS);
  const [isBackendConnected, setIsBackendConnected] = useState(true);

  const refreshData = async () => {
    try {
      const [loadedTasks, loadedProjects, loadedSettings, loadedStats] = await Promise.all([
        api.getTasks(),
        api.getProjects(),
        api.getSettings(),
        api.getStats()
      ]);
      setTasks(loadedTasks);
      setProjects(loadedProjects);
      setSettings(loadedSettings);
      setStats(loadedStats);
      setIsBackendConnected(true);
    } catch (err) {
      console.warn('Backend FastAPI no disponible aún, reintentando...', err);
      setIsBackendConnected(false);
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <I18nProvider language={settings.language || 'es'}>
      <AppShell
        settings={settings}
        onSettingsUpdated={setSettings}
        tasks={tasks}
        projects={projects}
        stats={stats}
        isBackendConnected={isBackendConnected}
        refreshData={refreshData}
      />
    </I18nProvider>
  );
};

export default App;
