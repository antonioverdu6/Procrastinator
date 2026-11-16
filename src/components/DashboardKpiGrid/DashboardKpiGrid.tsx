import React from 'react';
import { Flame, Award, Clock, Target } from 'lucide-react';
import { ProductivityStats } from '../../types';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorBadge } from '../ProcrastinatorBadge';
import { ProcrastinatorText } from '../ProcrastinatorText';

interface DashboardKpiGridProps {
  stats: ProductivityStats;
}

export const DashboardKpiGrid: React.FC<DashboardKpiGridProps> = ({ stats }) => {
  const getScoreBadge = (score: number) => {
    if (score >= 80) return <ProcrastinatorBadge variant="success">Excelente Enfoque</ProcrastinatorBadge>;
    if (score >= 60) return <ProcrastinatorBadge variant="warning">Constancia Media</ProcrastinatorBadge>;
    return <ProcrastinatorBadge variant="danger">Fricción Alta</ProcrastinatorBadge>;
  };

  return (
    <ProcrastinatorBox variant="grid-4">
      {/* Racha */}
      <ProcrastinatorBox variant="card">
        <ProcrastinatorBox variant="row-between" className="text-[#64748B] mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">Racha Activa</span>
          <Flame className="w-4 h-4 text-[#D97706] fill-[#D97706]" />
        </ProcrastinatorBox>
        <div className="text-2xl font-bold text-[#0F172A]">
          {stats.streakDays} <span className="text-sm font-normal text-[#64748B]">días</span>
        </div>
        <ProcrastinatorText variant="caption" className="mt-1 block">
          Cumpliendo el objetivo diario sin interrupción.
        </ProcrastinatorText>
      </ProcrastinatorBox>

      {/* Índice Anti-Fricción */}
      <ProcrastinatorBox variant="card">
        <ProcrastinatorBox variant="row-between" className="text-[#64748B] mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">Índice Anti-Fricción</span>
          <Award className="w-4 h-4 text-[#2563EB]" />
        </ProcrastinatorBox>
        <div className="text-2xl font-bold text-[#0F172A]">
          {stats.procrastinationScore} <span className="text-sm font-normal text-[#64748B]">/100</span>
        </div>
        <div className="mt-1">{getScoreBadge(stats.procrastinationScore)}</div>
      </ProcrastinatorBox>

      {/* Horas Últimos 7 Días */}
      <ProcrastinatorBox variant="card">
        <ProcrastinatorBox variant="row-between" className="text-[#64748B] mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">Últimos 7 Días</span>
          <Clock className="w-4 h-4 text-[#16A34A]" />
        </ProcrastinatorBox>
        <div className="text-2xl font-bold text-[#0F172A]">
          {stats.weeklyHoursCompleted} <span className="text-sm font-normal text-[#64748B]">horas</span>
        </div>
        <ProcrastinatorText variant="caption" className="mt-1 block">
          Total histórico: <strong>{stats.totalHoursCompleted}h</strong>
        </ProcrastinatorText>
      </ProcrastinatorBox>

      {/* Ratio Estimación */}
      <ProcrastinatorBox variant="card">
        <ProcrastinatorBox variant="row-between" className="text-[#64748B] mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">Precisión Estimada</span>
          <Target className="w-4 h-4 text-[#64748B]" />
        </ProcrastinatorBox>
        <div className="text-2xl font-bold text-[#0F172A]">
          {stats.accuracyRatio}x
        </div>
        <ProcrastinatorText variant="caption" className="mt-1 block">
          {stats.accuracyRatio > 1.2 ? 'Tiendes a subestimar el tiempo.' : 'Ritmo equilibrado.'}
        </ProcrastinatorText>
      </ProcrastinatorBox>
    </ProcrastinatorBox>
  );
};
