import React from 'react';
import { Target, FolderKanban, BarChart3, Bot, Settings, Flame } from 'lucide-react';
import { ProductivityStats } from '../../types';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorText } from '../ProcrastinatorText';
import { useI18n } from '../../i18n';
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
  const { t } = useI18n();

  const tabs = [
    { id: 'daily' as NavTab, label: t.navbar.tabs.daily, icon: Target },
    { id: 'projects' as NavTab, label: t.navbar.tabs.projects, icon: FolderKanban },
    { id: 'dashboard' as NavTab, label: t.navbar.tabs.dashboard, icon: BarChart3 },
    { id: 'chat' as NavTab, label: t.navbar.tabs.chat, icon: Bot }
  ];

  return (
    <ProcrastinatorBox as="header" className={styles.layout.header}>
      <ProcrastinatorBox className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        <ProcrastinatorBox className="flex items-center gap-2.5">
          <ProcrastinatorBox className="w-7 h-7 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-bold text-sm">
            P
          </ProcrastinatorBox>
          <ProcrastinatorBox className="flex items-center gap-2">
            <ProcrastinatorText variant="h2" className="text-base">
              Procrastinator
            </ProcrastinatorText>
            <span className="text-[11px] font-medium text-[#64748B] border-l border-[#E2E8F0] pl-2 hidden sm:inline">
              {t.navbar.subtitle}
            </span>
          </ProcrastinatorBox>
        </ProcrastinatorBox>

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

        <ProcrastinatorBox className="flex items-center gap-3">
          <ProcrastinatorBox
            className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#D97706]"
            title={t.navbar.streakTitle}
          >
            <Flame className="w-3.5 h-3.5 fill-[#D97706]" />
            <span>
              {stats.streakDays}
              {t.navbar.streakLabel}
            </span>
          </ProcrastinatorBox>

          <button
            onClick={onOpenSettings}
            className="p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg border border-transparent hover:border-[#E2E8F0] transition-colors"
            title={t.navbar.settingsTitle}
          >
            <Settings className="w-4 h-4" />
          </button>
        </ProcrastinatorBox>
      </ProcrastinatorBox>
    </ProcrastinatorBox>
  );
};
