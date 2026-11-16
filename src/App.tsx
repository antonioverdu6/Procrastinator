import React, { useState, useEffect } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { DailyFocus } from './components/DailyFocus';
import { ProjectManager } from './components/ProjectManager';
import { Dashboard } from './components/Dashboard';
import { Chatbot } from './components/Chatbot';
import { SettingsModal } from './components/SettingsModal';
import { StorageService } from './services/storageService';
import { SchedulerEngine } from './services/schedulerEngine';
import { Task, Project, UserSettings, ProductivityStats } from './types';
import { styles } from './style';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('daily');
  const [tasks, setTasks] = useState<Task[]>(() => StorageService.getTasks());
  const [projects, setProjects] = useState<Project[]>(() => StorageService.getProjects());
  const [settings, setSettings] = useState<UserSettings>(() => StorageService.getSettings());
  const [stats, setStats] = useState<ProductivityStats>(() => SchedulerEngine.getStats());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const refreshData = () => {
    const loadedTasks = StorageService.getTasks();
    const loadedProjects = StorageService.getProjects();
    const loadedSettings = StorageService.getSettings();
    setTasks(loadedTasks);
    setProjects(loadedProjects);
    setSettings(loadedSettings);
    setStats(SchedulerEngine.getStats());
  };

  useEffect(() => {
    refreshData();
  }, []);

  return (
    <div className={styles.layout.container}>
      {/* Barra de Navegación */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        stats={stats}
      />

      {/* Vista Activa */}
      <main className={styles.layout.main}>
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
          <Dashboard />
        )}

        {currentTab === 'chat' && (
          <Chatbot
            settings={settings}
            onRefreshData={refreshData}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}
      </main>

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
    </div>
  );
};

export default App;
