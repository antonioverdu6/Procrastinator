import React from 'react';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorButton } from '../ProcrastinatorButton';
import { ProcrastinatorBadge } from '../ProcrastinatorBadge';
import { ProcrastinatorText } from '../ProcrastinatorText';
import { useI18n } from '../../i18n';

interface DailyCapacityCardProps {
  totalCapacityMinutes: number;
  completedMinutes: number;
  pendingCount: number;
  progressPercent: number;
  onAdjustMinutes: (minutes: number) => void;
}

export const DailyCapacityCard: React.FC<DailyCapacityCardProps> = ({
  totalCapacityMinutes,
  completedMinutes,
  pendingCount,
  progressPercent,
  onAdjustMinutes
}) => {
  const { lang, t } = useI18n();
  const locale = lang === 'en' ? 'en-US' : 'es-ES';

  return (
    <ProcrastinatorBox variant="card">
      <ProcrastinatorBox className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <ProcrastinatorBox>
          <ProcrastinatorBox className="flex items-center gap-2 mb-1">
            <ProcrastinatorBadge variant="primary">{t.daily.dayPlanBadge}</ProcrastinatorBadge>
            <ProcrastinatorText variant="caption">
              {new Date().toLocaleDateString(locale, {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
              })}
            </ProcrastinatorText>
          </ProcrastinatorBox>

          <ProcrastinatorText variant="h1">
            {t.daily.todayGoalTitle}{' '}
            <span className="text-[#2563EB]">{(totalCapacityMinutes / 60).toFixed(1)}h</span>
          </ProcrastinatorText>
          <ProcrastinatorText variant="caption" className="block mt-0.5">
            {pendingCount} {t.daily.todayGoalSubtitle}
          </ProcrastinatorText>
        </ProcrastinatorBox>

        <ProcrastinatorBox className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium text-[#64748B] mr-1">{t.daily.adjustLabel}</span>
          <ProcrastinatorButton variant="secondary" onClick={() => onAdjustMinutes(60)}>
            +1h
          </ProcrastinatorButton>
          <ProcrastinatorButton variant="secondary" onClick={() => onAdjustMinutes(30)}>
            +30m
          </ProcrastinatorButton>
          <ProcrastinatorButton variant="secondary" onClick={() => onAdjustMinutes(-30)}>
            -30m
          </ProcrastinatorButton>
          <ProcrastinatorButton variant="secondary" onClick={() => onAdjustMinutes(-60)}>
            -1h
          </ProcrastinatorButton>
        </ProcrastinatorBox>
      </ProcrastinatorBox>

      <ProcrastinatorBox className="mt-5 pt-4 border-t border-[#E2E8F0]">
        <ProcrastinatorBox className="flex justify-between text-xs text-[#475569] mb-1.5">
          <span>
            {t.daily.dailyProgress} <strong>{completedMinutes}m</strong> {t.daily.of}{' '}
            {totalCapacityMinutes}m
          </span>
          <span className="font-semibold text-[#0F172A]">{progressPercent}%</span>
        </ProcrastinatorBox>
        <ProcrastinatorBox className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#2563EB] rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </ProcrastinatorBox>
      </ProcrastinatorBox>
    </ProcrastinatorBox>
  );
};
