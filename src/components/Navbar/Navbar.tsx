import React from 'react';
import { Target, FolderKanban, BarChart3, Bot, Settings, Flame } from 'lucide-react';
import { ProductivityStats } from '../../types';
import { styles } from '../../style';

export type NavTab = 'daily' | 'projects' | 'dashboard' | 'chat';

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenSettings: () => void;
  stats: ProductivityStats;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  onOpenSettings,
  stats
}) => {
  const tabs = [
    { id: 'daily' as NavTab, label: 'Objetivo Diario', icon: Target },
    { id: 'projects' as NavTab, label: 'Proyectos & Backlog', icon: FolderKanban },
    { id: 'dashboard' as NavTab, label: 'Rendimiento', icon: BarChart3 },
    { id: 'chat' as NavTab, label: 'Copiloto', icon: Bot },
  ];

  return (
    <header className={styles.layout.header}>
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Logotipo Minimalista */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-bold text-sm shadow-sm">
            D
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#0F172A] text-base tracking-tight">DevPace</span>
            <span className="text-[11px] font-medium text-[#64748B] border-l border-[#E2E8F0] pl-2 hidden sm:inline">
              Anti-Procrastinación
            </span>
          </div>
        </div>

        {/* Pestañas de Navegación */}
        <nav className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-xl border border-[#E2E8F0]">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={isActive ? styles.button.tabActive : styles.button.tabInactive}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Indicadores Derecha */}
        <div className="flex items-center gap-3">
          {/* Racha */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#D97706] shadow-sm"
            title="Días consecutivos cumpliendo tu objetivo diario"
          >
            <Flame className="w-3.5 h-3.5 fill-[#D97706]" />
            <span>{stats.streakDays}d racha</span>
          </div>

          {/* Ajustes */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg border border-transparent hover:border-[#E2E8F0] transition-colors"
            title="Configuración"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
