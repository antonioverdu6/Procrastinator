import React, { useEffect, useState } from 'react';
import { ProductivityStats } from '../../types';
import { api } from '../../services/api';
import {
  Flame,
  Clock,
  Target,
  Award,
  TrendingUp,
  CheckCircle2,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorBadge } from '../ProcrastinatorBadge';
import { ProcrastinatorText } from '../ProcrastinatorText';

interface DashboardProps {
  stats?: ProductivityStats;
}

const PROJECT_PALETTE = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899', '#64748B'];

export const Dashboard: React.FC<DashboardProps> = ({ stats: initialStats }) => {
  const [stats, setStats] = useState<ProductivityStats | null>(initialStats || null);
  const [activeChartView, setActiveChartView] = useState<'area' | 'bar'>('area');

  useEffect(() => {
    if (initialStats) {
      setStats(initialStats);
    } else {
      api.getStats().then(setStats).catch(console.error);
    }
  }, [initialStats]);

  const activeStats = stats || {
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

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <ProcrastinatorBadge variant="success">Excelente Enfoque</ProcrastinatorBadge>;
    if (score >= 60) return <ProcrastinatorBadge variant="warning">Constancia Media</ProcrastinatorBadge>;
    return <ProcrastinatorBadge variant="danger">Fricción Alta</ProcrastinatorBadge>;
  };

  const weeklyActivity = activeStats.weeklyActivity || [];
  const projectProgress = activeStats.projectProgress || [];
  const priorityDistribution = activeStats.priorityDistribution || [];

  // Datos para el Donut Chart de proyectos
  const hasProjectData = projectProgress.some(p => p.completedHours > 0);
  const pieData = projectProgress.length > 0
    ? projectProgress.map((p, idx) => ({
        name: p.name,
        value: hasProjectData ? (p.completedHours > 0 ? p.completedHours : 0.05) : (p.totalHours || 1),
        realHours: p.completedHours,
        totalHours: p.totalHours,
        percentage: p.percentage,
        color: PROJECT_PALETTE[idx % PROJECT_PALETTE.length]
      }))
    : [{ name: 'Sin proyectos', value: 1, realHours: 0, totalHours: 0, percentage: 0, color: '#CBD5E1' }];

  // Custom tooltip para el Area Chart
  const CustomAreaTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const actual = payload.find((p: any) => p.dataKey === 'actualHours')?.value || 0;
      const planned = payload.find((p: any) => p.dataKey === 'plannedHours')?.value || 0;
      const diff = Math.round((actual - planned) * 10) / 10;

      return (
        <div className="bg-white border border-[#CBD5E1] p-3 rounded-lg text-xs space-y-1.5 shadow-none">
          <p className="font-bold text-[#0F172A]">{label}</p>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-[#2563EB]">
              <span className="w-2 h-2 rounded-full bg-[#2563EB]" /> Horas reales:
            </span>
            <span className="font-mono font-semibold text-[#0F172A]">{actual}h</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-[#64748B]">
              <span className="w-2 h-2 rounded-full bg-[#CBD5E1]" /> Meta del día:
            </span>
            <span className="font-mono text-[#64748B]">{planned}h</span>
          </div>
          <div className="pt-1.5 border-t border-[#E2E8F0] flex items-center justify-between">
            <span className="text-[#64748B]">Balance:</span>
            <span className={`font-semibold ${diff >= 0 ? 'text-[#16A34A]' : 'text-[#D97706]'}`}>
              {diff >= 0 ? `+${diff}h` : `${diff}h`}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip para el Bar Chart de cumplimiento
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0]?.payload;
      const pct = point?.completionPercent || 0;
      const actual = point?.actualHours || 0;
      const planned = point?.plannedHours || 0;

      return (
        <div className="bg-white border border-[#CBD5E1] p-3 rounded-lg text-xs space-y-1.5 shadow-none">
          <p className="font-bold text-[#0F172A]">{label}</p>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#64748B]">Cumplimiento:</span>
            <span className="font-mono font-bold text-[#2563EB]">{pct}%</span>
          </div>
          <div className="text-[11px] text-[#64748B]">
            {actual}h completadas de {planned}h planificadas
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <ProcrastinatorBox className="space-y-6 animate-fadeIn">
      {/* Header */}
      <ProcrastinatorBox className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <ProcrastinatorBox>
          <ProcrastinatorText variant="h1">Dashboard de Rendimiento</ProcrastinatorText>
          <ProcrastinatorText variant="caption">
            Telemetría de tiempo real frente al código, consistencia semanal y reparto de esfuerzo.
          </ProcrastinatorText>
        </ProcrastinatorBox>

        <ProcrastinatorBox className="flex items-center gap-2">
          <ProcrastinatorBadge variant="neutral">
            <Calendar className="w-3.5 h-3.5" /> Últimos 7 días
          </ProcrastinatorBadge>
        </ProcrastinatorBox>
      </ProcrastinatorBox>

      {/* Grid de KPIs principales */}
      <ProcrastinatorBox className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Racha Activa */}
        <ProcrastinatorBox variant="card" className="space-y-2">
          <ProcrastinatorBox className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-semibold uppercase tracking-wider">Racha Activa</span>
            <Flame className="w-4 h-4 text-[#D97706] fill-[#D97706]" />
          </ProcrastinatorBox>
          <ProcrastinatorBox className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
            {activeStats.streakDays} <span className="text-sm font-normal text-[#64748B]">días</span>
          </ProcrastinatorBox>
          <ProcrastinatorText variant="caption" className="block text-[#64748B]">
            Sin perder el hábito de avanzar cada jornada.
          </ProcrastinatorText>
        </ProcrastinatorBox>

        {/* Índice Anti-Fricción */}
        <ProcrastinatorBox variant="card" className="space-y-2">
          <ProcrastinatorBox className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-semibold uppercase tracking-wider">Índice Anti-Fricción</span>
            <Award className="w-4 h-4 text-[#2563EB]" />
          </ProcrastinatorBox>
          <ProcrastinatorBox className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
              {activeStats.procrastinationScore}
            </span>
            <span className="text-xs font-medium text-[#64748B]">/100</span>
          </ProcrastinatorBox>
          <ProcrastinatorBox>{getScoreBadge(activeStats.procrastinationScore)}</ProcrastinatorBox>
        </ProcrastinatorBox>

        {/* Horas Últimos 7 Días */}
        <ProcrastinatorBox variant="card" className="space-y-2">
          <ProcrastinatorBox className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-semibold uppercase tracking-wider">Horas Semanales</span>
            <Clock className="w-4 h-4 text-[#16A34A]" />
          </ProcrastinatorBox>
          <ProcrastinatorBox className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
            {activeStats.weeklyHoursCompleted} <span className="text-sm font-normal text-[#64748B]">horas</span>
          </ProcrastinatorBox>
          <ProcrastinatorText variant="caption" className="block text-[#64748B]">
            Total acumulado histórico: <strong>{activeStats.totalHoursCompleted}h</strong>
          </ProcrastinatorText>
        </ProcrastinatorBox>

        {/* Ratio de Precisión */}
        <ProcrastinatorBox variant="card" className="space-y-2">
          <ProcrastinatorBox className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-semibold uppercase tracking-wider">Precisión Estimada</span>
            <Target className="w-4 h-4 text-[#2563EB]" />
          </ProcrastinatorBox>
          <ProcrastinatorBox className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
            {activeStats.accuracyRatio}x
          </ProcrastinatorBox>
          <ProcrastinatorText variant="caption" className="block text-[#64748B]">
            {activeStats.accuracyRatio > 1.2
              ? 'Tiendes a subestimar; el PM ajusta tus micro-tareas.'
              : activeStats.accuracyRatio < 0.8
              ? 'Sobreestimas tiempos; ritmo más ágil de lo esperado.'
              : 'Estimación equilibrada con alta fidelidad.'}
          </ProcrastinatorText>
        </ProcrastinatorBox>
      </ProcrastinatorBox>

      {/* SECCIÓN PRINCIPAL: Gráficos de Alto Rendimiento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GRÁFICO 1: Evolución Semanal (Área suavizada + Toggle a Cumplimiento) */}
        <ProcrastinatorBox variant="card" className="lg:col-span-2 space-y-4">
          <ProcrastinatorBox className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E2E8F0]">
            <ProcrastinatorBox>
              <ProcrastinatorText variant="h3" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#2563EB]" />
                {activeChartView === 'area'
                  ? 'Curva de Enfoque: Horas Reales vs. Meta'
                  : 'Tasa de Cumplimiento Diario (%)'}
              </ProcrastinatorText>
              <ProcrastinatorText variant="caption">
                {activeChartView === 'area'
                  ? 'Volumen de horas dedicadas cada día comparado con tu objetivo diario.'
                  : 'Porcentaje alcanzado respecto al plan establecido.'}
              </ProcrastinatorText>
            </ProcrastinatorBox>

            {/* Toggle de vista de gráfico */}
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
                <TrendingUp className="w-3.5 h-3.5 text-[#2563EB]" /> Horas
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
                <BarChart3 className="w-3.5 h-3.5 text-[#16A34A]" /> Cumplimiento
              </button>
            </div>
          </ProcrastinatorBox>

          {/* Gráfico 1 - Renderizado con Recharts */}
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
                    name="Meta Diaria"
                  />
                  <Area
                    type="monotone"
                    dataKey="actualHours"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    fill="url(#gradientActual)"
                    name="Horas Reales"
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
                  <Bar
                    dataKey="completionPercent"
                    radius={[4, 4, 0, 0]}
                    name="Cumplimiento"
                  >
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

          {/* Leyenda de apoyo */}
          <div className="flex items-center justify-between text-xs text-[#64748B] pt-2 border-t border-[#F1F5F9]">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                <span className="text-[#0F172A] font-medium">Horas Reales</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 border-t-2 border-dashed border-[#94A3B8]" />
                <span>Meta Planificada</span>
              </div>
            </div>
            <span>Meta estándar: <strong>{(activeStats.todayPlannedMinutes / 60).toFixed(1)}h / día</strong></span>
          </div>
        </ProcrastinatorBox>

        {/* GRÁFICO 2: Donut Chart de Distribución por Proyecto */}
        <ProcrastinatorBox variant="card" className="flex flex-col justify-between space-y-4">
          <ProcrastinatorBox className="pb-2 border-b border-[#E2E8F0]">
            <ProcrastinatorText variant="h3" className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-[#2563EB]" />
              Esfuerzo por Proyecto
            </ProcrastinatorText>
            <ProcrastinatorText variant="caption">
              Reparto de horas dedicadas entre tus desarrollos.
            </ProcrastinatorText>
          </ProcrastinatorBox>

          {/* Donut Container con etiqueta central */}
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
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white border border-[#CBD5E1] p-2.5 rounded-lg text-xs space-y-1 shadow-none">
                          <p className="font-semibold text-[#0F172A]">{data.name}</p>
                          <p className="text-[#64748B]">
                            Completadas: <strong>{data.realHours}h</strong> ({data.percentage}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Texto en el centro del Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold text-[#0F172A]">{activeStats.totalHoursCompleted}h</span>
              <span className="text-[10px] text-[#64748B] font-medium uppercase tracking-wider">Total</span>
            </div>
          </div>

          {/* Desglose de proyectos en lista */}
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

      {/* SECCIÓN SECUNDARIA: Progreso por Proyecto y Desglose por Prioridad */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Barras de Progreso por Proyecto */}
        <ProcrastinatorBox variant="card" className="space-y-4">
          <ProcrastinatorBox className="pb-2 border-b border-[#E2E8F0]">
            <ProcrastinatorText variant="h3" className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
              Avance hacia la Meta de Cada Proyecto
            </ProcrastinatorText>
            <ProcrastinatorText variant="caption">
              Progreso acumulado frente al objetivo estimado de horas.
            </ProcrastinatorText>
          </ProcrastinatorBox>

          <div className="space-y-3">
            {projectProgress.length === 0 ? (
              <div className="text-xs text-[#94A3B8] py-6 text-center">
                No hay proyectos registrados todavía. Crea uno en la sección de Proyectos.
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

        {/* Desglose del Backlog por Prioridad */}
        <ProcrastinatorBox variant="card" className="space-y-4">
          <ProcrastinatorBox className="pb-2 border-b border-[#E2E8F0]">
            <ProcrastinatorText variant="h3" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#2563EB]" />
              Distribución de Tareas por Prioridad
            </ProcrastinatorText>
            <ProcrastinatorText variant="caption">
              Equilibrio de urgencia y peso técnico en tu cartera de tareas.
            </ProcrastinatorText>
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
                      {item.count} {item.count === 1 ? 'tarea' : 'tareas'}
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
              Total tareas registradas: <strong>{activeStats.totalTasksFinished} completadas</strong> con un ratio de exactitud de <strong>{activeStats.accuracyRatio}x</strong>.
            </span>
          </div>
        </ProcrastinatorBox>
      </div>
    </ProcrastinatorBox>
  );
};
