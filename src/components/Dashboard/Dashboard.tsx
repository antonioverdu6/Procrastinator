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
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorBadge } from '../ProcrastinatorBadge';
import { ProcrastinatorText } from '../ProcrastinatorText';

export const Dashboard: React.FC = () => {
  const stats = SchedulerEngine.getStats();

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <ProcrastinatorBadge variant="success">Excelente Enfoque</ProcrastinatorBadge>;
    if (score >= 60) return <ProcrastinatorBadge variant="warning">Constancia Media</ProcrastinatorBadge>;
    return <ProcrastinatorBadge variant="danger">Fricción Alta</ProcrastinatorBadge>;
  };

  return (
    <ProcrastinatorBox className="space-y-6 animate-fadeIn">
      {/* Header */}
      <ProcrastinatorBox>
        <ProcrastinatorText variant="h1">Dashboard de Rendimiento</ProcrastinatorText>
        <ProcrastinatorText variant="caption">
          Métricas de tiempo real trabajado, constancia y precisión de tus estimaciones.
        </ProcrastinatorText>
      </ProcrastinatorBox>

      {/* Grid de KPIs */}
      <ProcrastinatorBox className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Racha */}
        <ProcrastinatorBox variant="card">
          <ProcrastinatorBox className="flex items-center justify-between text-[#64748B] mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Racha Activa</span>
            <Flame className="w-4 h-4 text-[#D97706] fill-[#D97706]" />
          </ProcrastinatorBox>
          <ProcrastinatorBox className="text-2xl font-bold text-[#0F172A]">
            {stats.streakDays} <span className="text-sm font-normal text-[#64748B]">días</span>
          </ProcrastinatorBox>
          <ProcrastinatorText variant="caption" className="mt-1 block">Cumpliendo el objetivo diario sin interrupción.</ProcrastinatorText>
        </ProcrastinatorBox>

        {/* Índice Anti-Fricción */}
        <ProcrastinatorBox variant="card">
          <ProcrastinatorBox className="flex items-center justify-between text-[#64748B] mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Índice Anti-Fricción</span>
            <Award className="w-4 h-4 text-[#2563EB]" />
          </ProcrastinatorBox>
          <ProcrastinatorBox className="text-2xl font-bold text-[#0F172A]">
            {stats.procrastinationScore} <span className="text-sm font-normal text-[#64748B]">/100</span>
          </ProcrastinatorBox>
          <ProcrastinatorBox className="mt-1">{getScoreBadge(stats.procrastinationScore)}</ProcrastinatorBox>
        </ProcrastinatorBox>

        {/* Horas Últimos 7 Días */}
        <ProcrastinatorBox variant="card">
          <ProcrastinatorBox className="flex items-center justify-between text-[#64748B] mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Últimos 7 Días</span>
            <Clock className="w-4 h-4 text-[#16A34A]" />
          </ProcrastinatorBox>
          <ProcrastinatorBox className="text-2xl font-bold text-[#0F172A]">
            {stats.weeklyHoursCompleted} <span className="text-sm font-normal text-[#64748B]">horas</span>
          </ProcrastinatorBox>
          <ProcrastinatorText variant="caption" className="mt-1 block">Total histórico: <strong>{stats.totalHoursCompleted}h</strong></ProcrastinatorText>
        </ProcrastinatorBox>

        {/* Ratio Estimación */}
        <ProcrastinatorBox variant="card">
          <ProcrastinatorBox className="flex items-center justify-between text-[#64748B] mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Precisión Estimada</span>
            <Target className="w-4 h-4 text-[#64748B]" />
          </ProcrastinatorBox>
          <ProcrastinatorBox className="text-2xl font-bold text-[#0F172A]">
            {stats.accuracyRatio}x
          </ProcrastinatorBox>
          <ProcrastinatorText variant="caption" className="mt-1 block">
            {stats.accuracyRatio > 1.2 ? 'Tiendes a subestimar el tiempo.' : 'Ritmo equilibrado.'}
          </ProcrastinatorText>
        </ProcrastinatorBox>
      </ProcrastinatorBox>

      {/* Gráfico de Barras: Horas Planificadas vs Reales */}
      <ProcrastinatorBox variant="card">
        <ProcrastinatorBox className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <ProcrastinatorBox>
            <ProcrastinatorText variant="h3" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#2563EB]" />
              Horas Planificadas vs. Horas Reales (Última semana)
            </ProcrastinatorText>
            <ProcrastinatorText variant="caption">Tiempo frente al código comparado con el objetivo marcado.</ProcrastinatorText>
          </ProcrastinatorBox>

          <ProcrastinatorBox className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#CBD5E1]" />
              <span className="text-[#64748B]">Planificado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#2563EB]" />
              <span className="text-[#0F172A] font-medium">Real</span>
            </div>
          </ProcrastinatorBox>
        </ProcrastinatorBox>

        <ProcrastinatorBox className="h-64 w-full">
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
        </ProcrastinatorBox>
      </ProcrastinatorBox>

      {/* Grid Secundario: Progreso de Proyectos */}
      <ProcrastinatorBox variant="card">
        <ProcrastinatorText variant="h3" className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
          Progreso por Proyecto
        </ProcrastinatorText>
        <ProcrastinatorText variant="caption" className="mb-4 block">Horas completadas vs. objetivo total de cada proyecto.</ProcrastinatorText>

        <ProcrastinatorBox className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {stats.projectProgress.map(proj => (
            <ProcrastinatorBox key={proj.id} variant="subtle" className="space-y-1.5">
              <ProcrastinatorBox className="flex justify-between text-xs">
                <span className="font-semibold text-[#0F172A]">{proj.name}</span>
                <span className="text-[#64748B]">{proj.completedHours}h / {proj.totalHours}h ({proj.percentage}%)</span>
              </ProcrastinatorBox>
              <ProcrastinatorBox className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#2563EB] rounded-full"
                  style={{ width: `${proj.percentage}%` }}
                />
              </ProcrastinatorBox>
            </ProcrastinatorBox>
          ))}
        </ProcrastinatorBox>
      </ProcrastinatorBox>
    </ProcrastinatorBox>
  );
};
