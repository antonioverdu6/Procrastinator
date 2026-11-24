import React, { useState } from 'react';
import { BarChart3, CheckCircle2, Clock, Layers } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { ProductivityStats } from '../../types';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorBadge } from '../ProcrastinatorBadge';
import { ProcrastinatorText } from '../ProcrastinatorText';
import { useI18n } from '../../i18n';

interface DashboardChartsProps {
  stats: ProductivityStats;
  palette: string[];
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ stats }) => {
  const { t } = useI18n();
  const [chartMode, setChartMode] = useState<'hours' | 'tasks'>('hours');

  const weeklyActivity = stats.weeklyActivity || [];
  const epicProgress = stats.epicProgress || [];
  const epicsClosed = stats.epicsClosed ?? 0;
  const epicsTotal = stats.epicsTotal ?? epicProgress.length;

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const point = payload[0]?.payload;
    return (
      <div className="bg-white border border-[#CBD5E1] p-3 rounded-lg text-xs space-y-1 shadow-none">
        <p className="font-bold text-[#0F172A]">
          {label} ({point?.date})
        </p>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#64748B]">{t.dashboard.realHours}:</span>
          <span className="font-mono font-bold text-[#2563EB]">{point?.actualHours || 0}h</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#64748B]">{t.dashboard.tasksDoneTooltip}</span>
          <span className="font-mono font-semibold text-[#16A34A]">{point?.completedTasks || 0}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Gráfico de Barras limpio: Horas Curradas / Tareas Cerradas por día */}
      <ProcrastinatorBox variant="card" className="lg:col-span-2 space-y-4">
        <ProcrastinatorBox className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E2E8F0]">
          <ProcrastinatorBox>
            <ProcrastinatorText variant="h3" className="flex items-center gap-2">
              {chartMode === 'hours' ? (
                <Clock className="w-4 h-4 text-[#2563EB]" />
              ) : (
                <BarChart3 className="w-4 h-4 text-[#16A34A]" />
              )}
              {chartMode === 'hours' ? t.dashboard.chartWorkedHoursTitle : t.dashboard.chartTasksTitle}
            </ProcrastinatorText>
            <ProcrastinatorText variant="caption">
              {chartMode === 'hours'
                ? t.dashboard.chartWorkedHoursSubtitle
                : t.dashboard.chartTasksSubtitle}
            </ProcrastinatorText>
          </ProcrastinatorBox>

          <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-lg border border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setChartMode('hours')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                chartMode === 'hours'
                  ? 'bg-white text-[#0F172A] font-semibold'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-[#2563EB]" /> {t.dashboard.hoursTab}
            </button>
            <button
              type="button"
              onClick={() => setChartMode('tasks')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                chartMode === 'tasks'
                  ? 'bg-white text-[#0F172A] font-semibold'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-[#16A34A]" /> {t.dashboard.tasksTab}
            </button>
          </div>
        </ProcrastinatorBox>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="dayName" stroke="#64748B" fontSize={12} tickLine={false} />
              <YAxis
                stroke="#64748B"
                fontSize={12}
                tickLine={false}
                unit={chartMode === 'hours' ? 'h' : ''}
                allowDecimals={chartMode === 'hours'}
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar
                dataKey={chartMode === 'hours' ? 'actualHours' : 'completedTasks'}
                radius={[6, 6, 0, 0]}
                maxBarSize={44}
              >
                {weeklyActivity.map((entry, idx) => {
                  const val = chartMode === 'hours' ? entry.actualHours : entry.completedTasks || 0;
                  const color =
                    val <= 0 ? '#E2E8F0' : chartMode === 'hours' ? '#2563EB' : '#16A34A';
                  return <Cell key={`bar-${idx}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ProcrastinatorBox>

      {/* Panel de Épicas Cerradas y En Curso */}
      <ProcrastinatorBox variant="card" className="flex flex-col space-y-4">
        <ProcrastinatorBox className="pb-2 border-b border-[#E2E8F0] flex items-start justify-between gap-2">
          <div>
            <ProcrastinatorText variant="h3" className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#2563EB]" />
              {t.dashboard.epicsStatusTitle}
            </ProcrastinatorText>
            <ProcrastinatorText variant="caption">{t.dashboard.epicsStatusSubtitle}</ProcrastinatorText>
          </div>
          <ProcrastinatorBadge variant={epicsClosed > 0 ? 'success' : 'neutral'}>
            {epicsClosed}/{epicsTotal}
          </ProcrastinatorBadge>
        </ProcrastinatorBox>

        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {epicProgress.length === 0 ? (
            <div className="text-xs text-[#94A3B8] py-8 text-center">{t.dashboard.noEpicsYet}</div>
          ) : (
            epicProgress.map((ep, idx) => (
              <div
                key={`${ep.projectId}-${ep.epic}-${idx}`}
                className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-semibold text-[#0F172A] truncate">{ep.epic}</div>
                    <div className="text-[11px] text-[#64748B] truncate">{ep.projectName}</div>
                  </div>
                  <ProcrastinatorBadge variant={ep.closed ? 'success' : 'neutral'}>
                    {ep.closed ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{t.dashboard.epicClosedBadge}</span>
                      </>
                    ) : (
                      <span>{t.dashboard.epicOpenBadge}</span>
                    )}
                  </ProcrastinatorBadge>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                  <span>
                    {ep.completedTasks}/{ep.totalTasks} {t.dashboard.taskPlural}
                  </span>
                  <span className="font-mono">{ep.workedHours}h</span>
                </div>

                <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      ep.closed ? 'bg-[#16A34A]' : 'bg-[#2563EB]'
                    }`}
                    style={{ width: `${ep.percentage}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </ProcrastinatorBox>
    </div>
  );
};
