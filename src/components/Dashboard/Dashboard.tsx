import React from 'react';
import { SchedulerEngine } from '../../services/schedulerEngine';
import { Flame, Clock, Target, Award, TrendingUp, CheckCircle2 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { styles } from '../../style';

export const Dashboard: React.FC = () => {
  const stats = SchedulerEngine.getStats();

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <span className={styles.badge.success}>Excelente Enfoque</span>;
    if (score >= 60) return <span className={styles.badge.warning}>Constancia Media</span>;
    return <span className={styles.badge.danger}>Fricción Alta</span>;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className={styles.typography.h1}>Dashboard de Rendimiento</h2>
        <p className={styles.typography.caption}>
          Métricas de tiempo real trabajado, constancia y precisión de tus estimaciones.
        </p>
      </div>

      {/* Grid de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Racha */}
        <div className={styles.card.base}>
          <div className="flex items-center justify-between text-[#64748B] mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Racha Activa</span>
            <Flame className="w-4 h-4 text-[#D97706] fill-[#D97706]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">
            {stats.streakDays} <span className="text-sm font-normal text-[#64748B]">días</span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">Cumpliendo el objetivo diario sin interrupción.</p>
        </div>

        {/* Índice Anti-Fricción */}
        <div className={styles.card.base}>
          <div className="flex items-center justify-between text-[#64748B] mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Índice Anti-Fricción</span>
            <Award className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">
            {stats.procrastinationScore} <span className="text-sm font-normal text-[#64748B]">/100</span>
          </div>
          <div className="mt-1">{getScoreBadge(stats.procrastinationScore)}</div>
        </div>

        {/* Horas Últimos 7 Días */}
        <div className={styles.card.base}>
          <div className="flex items-center justify-between text-[#64748B] mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Últimos 7 Días</span>
            <Clock className="w-4 h-4 text-[#16A34A]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">
            {stats.weeklyHoursCompleted} <span className="text-sm font-normal text-[#64748B]">horas</span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">Total histórico: <strong>{stats.totalHoursCompleted}h</strong></p>
        </div>

        {/* Ratio Estimación */}
        <div className={styles.card.base}>
          <div className="flex items-center justify-between text-[#64748B] mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Precisión Estimada</span>
            <Target className="w-4 h-4 text-[#64748B]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">
            {stats.accuracyRatio}x
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            {stats.accuracyRatio > 1.2 ? 'Tiendes a subestimar el tiempo.' : 'Ritmo equilibrado.'}
          </p>
        </div>
      </div>

      {/* Gráfico de Barras: Horas Planificadas vs Reales */}
      <div className={styles.card.base}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#2563EB]" />
              Horas Planificadas vs. Horas Reales (Última semana)
            </h3>
            <p className="text-xs text-[#64748B]">Tiempo frente al código comparado con el objetivo marcado.</p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#CBD5E1]" />
              <span className="text-[#64748B]">Planificado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#2563EB]" />
              <span className="text-[#0F172A] font-medium">Real</span>
            </div>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.weeklyActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="dayName" stroke="#64748B" fontSize={12} tickLine={false} />
              <YAxis stroke="#64748B" fontSize={12} tickLine={false} unit="h" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E2E8F0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                  fontSize: '12px'
                }}
              />
              <Bar dataKey="plannedHours" name="Planificado" fill="#CBD5E1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="actualHours" name="Real" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid Secundario: Progreso de Proyectos */}
      <div className={styles.card.base}>
        <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2 mb-1">
          <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
          Progreso por Proyecto
        </h3>
        <p className="text-xs text-[#64748B] mb-4">Horas completadas vs. objetivo total de cada proyecto.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {stats.projectProgress.map(proj => (
            <div key={proj.id} className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[#0F172A]">{proj.name}</span>
                <span className="text-[#64748B]">{proj.completedHours}h / {proj.totalHours}h ({proj.percentage}%)</span>
              </div>
              <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#2563EB] rounded-full"
                  style={{ width: `${proj.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
