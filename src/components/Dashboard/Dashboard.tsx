import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ProductivityStats } from '../../types';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorText } from '../ProcrastinatorText';
import { DashboardKpiGrid } from '../DashboardKpiGrid';
import { DashboardWeeklyChart } from '../DashboardWeeklyChart';
import { DashboardProjectList } from '../DashboardProjectList';

interface FullStats extends ProductivityStats {
  weeklyActivity?: any[];
  projectProgress?: any[];
}

interface DashboardProps {
  stats?: FullStats;
}

const DEFAULT_STATS: FullStats = {
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
  projectProgress: []
};

export const Dashboard: React.FC<DashboardProps> = ({ stats: propStats }) => {
  const [stats, setStats] = useState<FullStats>(propStats || DEFAULT_STATS);

  useEffect(() => {
    if (propStats) {
      setStats(propStats);
      return;
    }

    const loadStats = async () => {
      try {
        const data = await api.getStats();
        setStats(data);
      } catch (err) {
        console.warn('Error cargando stats para el dashboard:', err);
      }
    };

    loadStats();
  }, [propStats]);

  return (
    <ProcrastinatorBox variant="page">
      {/* Header */}
      <ProcrastinatorBox variant="stack-sm">
        <ProcrastinatorText variant="h1">Dashboard de Rendimiento</ProcrastinatorText>
        <ProcrastinatorText variant="caption">
          Métricas de tiempo real trabajado, constancia y precisión de tus estimaciones.
        </ProcrastinatorText>
      </ProcrastinatorBox>

      {/* Grid de KPIs */}
      <DashboardKpiGrid stats={stats} />

      {/* Gráfico de Barras: Horas Planificadas vs Reales */}
      <DashboardWeeklyChart data={stats.weeklyActivity || []} />

      {/* Grid Secundario: Progreso de Proyectos */}
      <DashboardProjectList projects={stats.projectProgress || []} />
    </ProcrastinatorBox>
  );
};
