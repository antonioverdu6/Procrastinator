import React, { useState, useEffect } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { DailyFocus } from './components/DailyFocus';
import { ProjectManager } from './components/ProjectManager';
import { Dashboard } from './components/Dashboard';
import { Chatbot } from './components/Chatbot';
import { SettingsModal } from './components/SettingsModal';
import { ProcrastinatorBox } from './components/ProcrastinatorBox';
import { api } from './services/api';
import { Task, Project, UserSettings, ProductivityStats } from './types';
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

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('daily');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [stats, setStats] = useState<ProductivityStats>(DEFAULT_STATS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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
      console.warn("Backend FastAPI no disponible aún, reintentando...", err);
      setIsBackendConnected(false);
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 10000); // Polling cada 10s para sincronización
    return () => clearInterval(interval);
  }, []);

  return (
    <ProcrastinatorBox className={styles.layout.container}>
      {/* Alerta si el backend de FastAPI se está iniciando */}
      {!isBackendConnected && (
        <div className="bg-[#FEF3C7] border-b border-[#FDE68A] text-[#92400E] text-xs px-4 py-2 text-center font-medium">
          Conectando con el servidor FastAPI en http://127.0.0.1:8000... (Asegúrate de ejecutar <code>python backend/run.py</code> o <code>iniciar.bat</code>)
        </div>
      )}

      {/* Barra de Navegación */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        stats={stats}
      />

      {/* Vista Activa */}
      <ProcrastinatorBox as="main" variant="canvas">
        {currentTab === 'daily' && (
          <DailyFocus
            tasks={tasks}
            projects={projects}
            settings={settings}
            onRefreshData={refreshData}
            onOpenChat={() => setCurrentTab('chat')}
          />
        )}

        {currentTab === 'projects' && (
          <ProjectManager
            projects={projects}
            tasks={tasks}
            onRefreshData={refreshData}
            onOpenChat={() => setCurrentTab('chat')}
          />
        )}

        {currentTab === 'dashboard' && (
          <Dashboard stats={stats} />
        )}

        {currentTab === 'chat' && (
          <Chatbot
            settings={settings}
            onRefreshData={refreshData}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}
      </ProcrastinatorBox>

      {/* Modal de Configuración */}
      <SettingsModal
        settings={settings}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={newSettings => {
          setSettings(newSettings);
          refreshData();
        }}
      />
    </ProcrastinatorBox>
  );
};

export default App;
