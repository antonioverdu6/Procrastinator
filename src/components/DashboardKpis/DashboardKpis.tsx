import React from 'react';
import { Award, Clock, Flame, Target } from 'lucide-react';
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

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <ProcrastinatorBadge variant="success">{t.dashboard.scoreExcellent}</ProcrastinatorBadge>;
    if (score >= 60) return <ProcrastinatorBadge variant="warning">{t.dashboard.scoreMedium}</ProcrastinatorBadge>;
    return <ProcrastinatorBadge variant="danger">{t.dashboard.scoreLow}</ProcrastinatorBadge>;
  };

  return (
    <ProcrastinatorBox className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      <ProcrastinatorBox variant="card" className="space-y-2">
        <ProcrastinatorBox className="flex items-center justify-between text-[#64748B]">
          <span className="text-xs font-semibold uppercase tracking-wider">{t.dashboard.antiFrictionTitle}</span>
          <Award className="w-4 h-4 text-[#2563EB]" />
        </ProcrastinatorBox>
        <ProcrastinatorBox className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
            {stats.procrastinationScore}
          </span>
          <span className="text-xs font-medium text-[#64748B]">/100</span>
        </ProcrastinatorBox>
        <ProcrastinatorBox>{getScoreBadge(stats.procrastinationScore)}</ProcrastinatorBox>
      </ProcrastinatorBox>

      <ProcrastinatorBox variant="card" className="space-y-2">
        <ProcrastinatorBox className="flex items-center justify-between text-[#64748B]">
          <span className="text-xs font-semibold uppercase tracking-wider">{t.dashboard.weeklyHoursTitle}</span>
          <Clock className="w-4 h-4 text-[#16A34A]" />
        </ProcrastinatorBox>
        <ProcrastinatorBox className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
          {stats.weeklyHoursCompleted}{' '}
          <span className="text-sm font-normal text-[#64748B]">{t.dashboard.hoursUnit}</span>
        </ProcrastinatorBox>
        <ProcrastinatorText variant="caption" className="block text-[#64748B]">
          {t.dashboard.historicalTotal} <strong>{stats.totalHoursCompleted}h</strong>
        </ProcrastinatorText>
      </ProcrastinatorBox>

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
