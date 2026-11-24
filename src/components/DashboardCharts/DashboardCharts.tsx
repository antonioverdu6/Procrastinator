import React, { useState } from 'react';
import { BarChart3, PieChart as PieIcon, TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { ProductivityStats } from '../../types';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorText } from '../ProcrastinatorText';
import { useI18n } from '../../i18n';

interface DashboardChartsProps {
  stats: ProductivityStats;
  palette: string[];
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ stats, palette }) => {
  const { t } = useI18n();
  const [activeChartView, setActiveChartView] = useState<'area' | 'bar'>('area');

  const weeklyActivity = stats.weeklyActivity || [];
  const projectProgress = stats.projectProgress || [];

  const hasProjectData = projectProgress.some(p => p.completedHours > 0);
  const pieData =
    projectProgress.length > 0
      ? projectProgress.map((p, idx) => ({
          name: p.name,
          value: hasProjectData ? (p.completedHours > 0 ? p.completedHours : 0.05) : p.totalHours || 1,
          realHours: p.completedHours,
          totalHours: p.totalHours,
          percentage: p.percentage,
          color: palette[idx % palette.length]
        }))
      : [
          {
            name: t.dashboard.noProjects,
            value: 1,
            realHours: 0,
            totalHours: 0,
            percentage: 0,
            color: '#CBD5E1'
          }
        ];

  const CustomAreaTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const actual = payload.find((p: any) => p.dataKey === 'actualHours')?.value || 0;
    const planned = payload.find((p: any) => p.dataKey === 'plannedHours')?.value || 0;
    const diff = Math.round((actual - planned) * 10) / 10;

    return (
      <div className="bg-white border border-[#CBD5E1] p-3 rounded-lg text-xs space-y-1.5 shadow-none">
        <p className="font-bold text-[#0F172A]">{label}</p>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-[#2563EB]">
            <span className="w-2 h-2 rounded-full bg-[#2563EB]" /> {t.dashboard.realHours}:
          </span>
          <span className="font-mono font-semibold text-[#0F172A]">{actual}h</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-[#64748B]">
            <span className="w-2 h-2 rounded-full bg-[#CBD5E1]" /> {t.dashboard.dayGoal}
          </span>
          <span className="font-mono text-[#64748B]">{planned}h</span>
        </div>
        <div className="pt-1.5 border-t border-[#E2E8F0] flex items-center justify-between">
          <span className="text-[#64748B]">{t.dashboard.balance}</span>
          <span className={`font-semibold ${diff >= 0 ? 'text-[#16A34A]' : 'text-[#D97706]'}`}>
            {diff >= 0 ? `+${diff}h` : `${diff}h`}
          </span>
        </div>
      </div>
    );
  };

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const point = payload[0]?.payload;
    return (
      <div className="bg-white border border-[#CBD5E1] p-3 rounded-lg text-xs space-y-1.5 shadow-none">
        <p className="font-bold text-[#0F172A]">{label}</p>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#64748B]">{t.dashboard.compliance}</span>
          <span className="font-mono font-bold text-[#2563EB]">{point?.completionPercent || 0}%</span>
        </div>
        <div className="text-[11px] text-[#64748B]">
          {point?.actualHours || 0}h {t.dashboard.completedOfPlanned} {point?.plannedHours || 0}h{' '}
          {t.dashboard.plannedWord}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <ProcrastinatorBox variant="card" className="lg:col-span-2 space-y-4">
        <ProcrastinatorBox className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E2E8F0]">
          <ProcrastinatorBox>
            <ProcrastinatorText variant="h3" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#2563EB]" />
              {activeChartView === 'area' ? t.dashboard.chartHoursTitle : t.dashboard.chartRateTitle}
            </ProcrastinatorText>
            <ProcrastinatorText variant="caption">
              {activeChartView === 'area'
                ? t.dashboard.chartHoursSubtitle
                : t.dashboard.chartRateSubtitle}
            </ProcrastinatorText>
          </ProcrastinatorBox>

          <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-lg border border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setActiveChartView('area')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activeChartView === 'area'
                  ? 'bg-white text-[#0F172A] font-semibold'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-[#2563EB]" /> {t.dashboard.hoursTab}
            </button>
            <button
              type="button"
              onClick={() => setActiveChartView('bar')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activeChartView === 'bar'
                  ? 'bg-white text-[#0F172A] font-semibold'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-[#16A34A]" /> {t.dashboard.complianceTab}
            </button>
          </div>
        </ProcrastinatorBox>

        <div className="h-72 w-full pt-2">
          {activeChartView === 'area' ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradientActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="gradientPlanned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#94A3B8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="dayName" stroke="#64748B" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} unit="h" />
                <Tooltip content={<CustomAreaTooltip />} />
                <Area
                  type="monotone"
                  dataKey="plannedHours"
                  stroke="#94A3B8"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fill="url(#gradientPlanned)"
                  name={t.dashboard.plannedGoal}
                />
                <Area
                  type="monotone"
                  dataKey="actualHours"
                  stroke="#2563EB"
                  strokeWidth={2.5}
                  fill="url(#gradientActual)"
                  name={t.dashboard.realHours}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="dayName" stroke="#64748B" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} unit="%" domain={[0, 150]} />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar dataKey="completionPercent" radius={[4, 4, 0, 0]} name={t.dashboard.complianceTab}>
                  {weeklyActivity.map((entry, index) => {
                    const pct = entry.completionPercent || 0;
                    const fillColor = pct >= 100 ? '#16A34A' : pct >= 50 ? '#2563EB' : '#94A3B8';
                    return <Cell key={`cell-${index}`} fill={fillColor} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-[#64748B] pt-2 border-t border-[#F1F5F9]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
              <span className="text-[#0F172A] font-medium">{t.dashboard.realHours}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 border-t-2 border-dashed border-[#94A3B8]" />
              <span>{t.dashboard.plannedGoal}</span>
            </div>
          </div>
          <span>
            {t.dashboard.standardGoal}{' '}
            <strong>
              {(stats.todayPlannedMinutes / 60).toFixed(1)}h {t.dashboard.perDay}
            </strong>
          </span>
        </div>
      </ProcrastinatorBox>

      <ProcrastinatorBox variant="card" className="flex flex-col justify-between space-y-4">
        <ProcrastinatorBox className="pb-2 border-b border-[#E2E8F0]">
          <ProcrastinatorText variant="h3" className="flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-[#2563EB]" />
            {t.dashboard.projectEffortTitle}
          </ProcrastinatorText>
          <ProcrastinatorText variant="caption">{t.dashboard.projectEffortSubtitle}</ProcrastinatorText>
        </ProcrastinatorBox>

        <div className="relative h-48 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`donut-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white border border-[#CBD5E1] p-2.5 rounded-lg text-xs space-y-1 shadow-none">
                      <p className="font-semibold text-[#0F172A]">{data.name}</p>
                      <p className="text-[#64748B]">
                        {t.dashboard.completedWord} <strong>{data.realHours}h</strong> ({data.percentage}%)
                      </p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-bold text-[#0F172A]">{stats.totalHoursCompleted}h</span>
            <span className="text-[10px] text-[#64748B] font-medium uppercase tracking-wider">
              {t.dashboard.totalLabel}
            </span>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-[#F1F5F9] max-h-36 overflow-y-auto">
          {pieData.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="truncate text-[#0F172A] font-medium">{item.name}</span>
              </div>
              <div className="text-right flex-shrink-0 text-[#64748B]">
                <strong>{item.realHours}h</strong> ({item.percentage}%)
              </div>
            </div>
          ))}
        </div>
      </ProcrastinatorBox>
    </div>
  );
};
