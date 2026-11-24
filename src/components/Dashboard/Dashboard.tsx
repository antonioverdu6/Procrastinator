import React, { useEffect, useState } from 'react';
import { AlertCircle, BarChart3, Calendar, CheckCircle2 } from 'lucide-react';
import { ProductivityStats } from '../../types';
import { api } from '../../services/api';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorBadge } from '../ProcrastinatorBadge';
import { ProcrastinatorText } from '../ProcrastinatorText';
import { DashboardKpis } from '../DashboardKpis';
import { DashboardCharts } from '../DashboardCharts';
import { useI18n } from '../../i18n';

interface DashboardProps {
  stats?: ProductivityStats;
}

const PROJECT_PALETTE = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899', '#64748B'];

export const Dashboard: React.FC<DashboardProps> = ({ stats: initialStats }) => {
  const { t } = useI18n();
  const [stats, setStats] = useState<ProductivityStats | null>(initialStats || null);

  useEffect(() => {
    if (initialStats) {
      setStats(initialStats);
    } else {
      api.getStats().then(setStats).catch(console.error);
    }
  }, [initialStats]);

  const activeStats: ProductivityStats = stats || {
    streakDays: 1,
    totalHoursCompleted: 0,
    weeklyHoursCompleted: 0,
    todayPlannedMinutes: 150,
    todayWorkedMinutes: 0,
    todayCompletionRate: 0,
    procrastinationScore: 100,
    totalTasksFinished: 0,
    accuracyRatio: 1.0,
    weeklyActivity: [],
    projectProgress: [],
    priorityDistribution: [],
    difficultyDistribution: []
  };

  const projectProgress = activeStats.projectProgress || [];
  const priorityDistribution = activeStats.priorityDistribution || [];

  return (
    <ProcrastinatorBox className="space-y-6 animate-fadeIn">
      <ProcrastinatorBox className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <ProcrastinatorBox>
          <ProcrastinatorText variant="h1">{t.dashboard.title}</ProcrastinatorText>
          <ProcrastinatorText variant="caption">{t.dashboard.subtitle}</ProcrastinatorText>
        </ProcrastinatorBox>

        <ProcrastinatorBox className="flex items-center gap-2">
          <ProcrastinatorBadge variant="neutral">
            <Calendar className="w-3.5 h-3.5" /> {t.dashboard.last7Days}
          </ProcrastinatorBadge>
        </ProcrastinatorBox>
      </ProcrastinatorBox>

      <DashboardKpis stats={activeStats} />

      <DashboardCharts stats={activeStats} palette={PROJECT_PALETTE} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProcrastinatorBox variant="card" className="space-y-4">
          <ProcrastinatorBox className="pb-2 border-b border-[#E2E8F0]">
            <ProcrastinatorText variant="h3" className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
              {t.dashboard.projectProgressTitle}
            </ProcrastinatorText>
            <ProcrastinatorText variant="caption">{t.dashboard.projectProgressSubtitle}</ProcrastinatorText>
          </ProcrastinatorBox>

          <div className="space-y-3">
            {projectProgress.length === 0 ? (
              <div className="text-xs text-[#94A3B8] py-6 text-center">
                {t.dashboard.noProjectsRecorded}
              </div>
            ) : (
              projectProgress.map((proj, idx) => (
                <div key={proj.id} className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: PROJECT_PALETTE[idx % PROJECT_PALETTE.length] }}
                      />
                      <span className="font-semibold text-[#0F172A]">{proj.name}</span>
                    </div>
                    <span className="text-[#64748B] font-mono">
                      <strong>{proj.completedHours}h</strong> / {proj.totalHours}h ({proj.percentage}%)
                    </span>
                  </div>

                  <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${proj.percentage}%`,
                        backgroundColor: PROJECT_PALETTE[idx % PROJECT_PALETTE.length]
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </ProcrastinatorBox>

        <ProcrastinatorBox variant="card" className="space-y-4">
          <ProcrastinatorBox className="pb-2 border-b border-[#E2E8F0]">
            <ProcrastinatorText variant="h3" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#2563EB]" />
              {t.dashboard.priorityDistTitle}
            </ProcrastinatorText>
            <ProcrastinatorText variant="caption">{t.dashboard.priorityDistSubtitle}</ProcrastinatorText>
          </ProcrastinatorBox>

          <div className="space-y-3 pt-1">
            {priorityDistribution.map((item, idx) => {
              const maxCount = Math.max(...priorityDistribution.map(p => p.count), 1);
              const barPercent = Math.round((item.count / maxCount) * 100);
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#334155] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.label}
                    </span>
                    <span className="font-mono text-[#0F172A] font-semibold">
                      {item.count} {item.count === 1 ? t.dashboard.taskSingular : t.dashboard.taskPlural}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${item.count > 0 ? Math.max(8, barPercent) : 0}%`,
                        backgroundColor: item.color
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg text-xs text-[#1D4ED8] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#2563EB]" />
            <span>
              {t.dashboard.totalRecorded}{' '}
              <strong>
                {activeStats.totalTasksFinished} {t.dashboard.completedTasksWord}
              </strong>{' '}
              {t.dashboard.withAccuracyOf} <strong>{activeStats.accuracyRatio}x</strong>.
            </span>
          </div>
        </ProcrastinatorBox>
      </div>
    </ProcrastinatorBox>
  );
};
