import React from 'react';
import { CheckCircle2, Clock, Flame, Layers, Target } from 'lucide-react';
import { ProductivityStats } from '../../types';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorBadge } from '../ProcrastinatorBadge';
import { ProcrastinatorText } from '../ProcrastinatorText';
import { useI18n } from '../../i18n';

interface DashboardKpisProps {
  stats: ProductivityStats;
}

export const DashboardKpis: React.FC<DashboardKpisProps> = ({ stats }) => {
  const { t } = useI18n();
  const epicsClosed = stats.epicsClosed ?? 0;
  const epicsTotal = stats.epicsTotal ?? 0;

  return (
    <ProcrastinatorBox className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Horas Curradas (7d) */}
      <ProcrastinatorBox variant="card" className="space-y-2">
        <ProcrastinatorBox className="flex items-center justify-between text-[#64748B]">
          <span className="text-xs font-semibold uppercase tracking-wider">{t.dashboard.weeklyHoursTitle}</span>
          <Clock className="w-4 h-4 text-[#2563EB]" />
        </ProcrastinatorBox>
        <ProcrastinatorBox className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
          {stats.weeklyHoursCompleted}{' '}
          <span className="text-sm font-normal text-[#64748B]">{t.dashboard.hoursUnit}</span>
        </ProcrastinatorBox>
        <ProcrastinatorText variant="caption" className="block text-[#64748B]">
          {t.dashboard.historicalTotal} <strong>{stats.totalHoursCompleted}h</strong>
        </ProcrastinatorText>
      </ProcrastinatorBox>

      {/* Épicas Cerradas */}
      <ProcrastinatorBox variant="card" className="space-y-2">
        <ProcrastinatorBox className="flex items-center justify-between text-[#64748B]">
          <span className="text-xs font-semibold uppercase tracking-wider">{t.dashboard.epicsClosedTitle}</span>
          <Layers className="w-4 h-4 text-[#16A34A]" />
        </ProcrastinatorBox>
        <ProcrastinatorBox className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-[#0F172A] tracking-tight">{epicsClosed}</span>
          <span className="text-xs font-medium text-[#64748B]">
            {t.dashboard.epicsOfTotal} {epicsTotal}
          </span>
        </ProcrastinatorBox>
        <ProcrastinatorBox>
          <ProcrastinatorBadge variant={epicsClosed > 0 ? 'success' : 'neutral'}>
            <CheckCircle2 className="w-3 h-3" />
            <span>
              {stats.totalTasksFinished} {t.dashboard.tasksCompletedBadge}
            </span>
          </ProcrastinatorBadge>
        </ProcrastinatorBox>
      </ProcrastinatorBox>

      {/* Racha Activa */}
      <ProcrastinatorBox variant="card" className="space-y-2">
        <ProcrastinatorBox className="flex items-center justify-between text-[#64748B]">
          <span className="text-xs font-semibold uppercase tracking-wider">{t.dashboard.streakTitle}</span>
          <Flame className="w-4 h-4 text-[#D97706] fill-[#D97706]" />
        </ProcrastinatorBox>
        <ProcrastinatorBox className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
          {stats.streakDays} <span className="text-sm font-normal text-[#64748B]">{t.dashboard.daysUnit}</span>
        </ProcrastinatorBox>
        <ProcrastinatorText variant="caption" className="block text-[#64748B]">
          {t.dashboard.streakCaption}
        </ProcrastinatorText>
      </ProcrastinatorBox>

      {/* Precisión Estimada */}
      <ProcrastinatorBox variant="card" className="space-y-2">
        <ProcrastinatorBox className="flex items-center justify-between text-[#64748B]">
          <span className="text-xs font-semibold uppercase tracking-wider">{t.dashboard.accuracyTitle}</span>
          <Target className="w-4 h-4 text-[#2563EB]" />
        </ProcrastinatorBox>
        <ProcrastinatorBox className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
          {stats.accuracyRatio}x
        </ProcrastinatorBox>
        <ProcrastinatorText variant="caption" className="block text-[#64748B]">
          {stats.accuracyRatio > 1.2
            ? t.dashboard.accuracyHigh
            : stats.accuracyRatio < 0.8
            ? t.dashboard.accuracyLow
            : t.dashboard.accuracyBalanced}
        </ProcrastinatorText>
      </ProcrastinatorBox>
    </ProcrastinatorBox>
  );
};
