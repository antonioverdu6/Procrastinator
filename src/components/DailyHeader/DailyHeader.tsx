import React from 'react';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorButton } from '../ProcrastinatorButton';
import { ProcrastinatorBadge } from '../ProcrastinatorBadge';
import { ProcrastinatorText } from '../ProcrastinatorText';
import { Clock, Plus } from 'lucide-react';

interface DailyHeaderProps {
  totalCapacityMinutes: number;
  completedMinutes: number;
  progressPercent: number;
  onAdjustCapacity: (minutes: number) => void;
  onOpenQuickTaskModal: () => void;
}

export const DailyHeader: React.FC<DailyHeaderProps> = ({
  totalCapacityMinutes,
  completedMinutes,
  progressPercent,
  onAdjustCapacity,
  onOpenQuickTaskModal
}) => {
  const todayFormatted = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  return (
    <ProcrastinatorBox variant="card">
      <ProcrastinatorBox variant="header">
        <ProcrastinatorBox variant="stack-sm">
          <ProcrastinatorBox variant="row" className="mb-1">
            <ProcrastinatorBadge variant="primary">Plan del Día</ProcrastinatorBadge>
            <ProcrastinatorText variant="caption">
              {todayFormatted}
            </ProcrastinatorText>
          </ProcrastinatorBox>

          <ProcrastinatorText variant="h1">
            Objetivo de Hoy: <span className="text-[#2563EB]">{(totalCapacityMinutes / 60).toFixed(1)}h</span>
          </ProcrastinatorText>
          <ProcrastinatorText variant="caption" className="block mt-0.5">
            Límite óptimo para mantener el foco de alta intensidad sin quemarte.
          </ProcrastinatorText>
        </ProcrastinatorBox>

        {/* Acciones Rápidas */}
        <ProcrastinatorBox variant="row-wrap">
          <ProcrastinatorButton
            variant="ghost"
            onClick={() => onAdjustCapacity(30)}
            title="Añadir 30 minutos a la jornada"
          >
            <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>+30m</span>
          </ProcrastinatorButton>

          <ProcrastinatorButton
            variant="ghost"
            onClick={() => onAdjustCapacity(60)}
            title="Añadir 1 hora a la jornada"
          >
            <span>+1h extra</span>
          </ProcrastinatorButton>

          <ProcrastinatorButton
            variant="ghost"
            onClick={() => onAdjustCapacity(-60)}
            title="Restar 1 hora si estás cansado"
          >
            <span>-1h hoy</span>
          </ProcrastinatorButton>

          <ProcrastinatorButton
            variant="primary"
            onClick={onOpenQuickTaskModal}
          >
            <Plus className="w-4 h-4" />
            <span>Añadir Tarea</span>
          </ProcrastinatorButton>
        </ProcrastinatorBox>
      </ProcrastinatorBox>

      {/* Barra de Progreso General del Día */}
      <ProcrastinatorBox variant="stack-sm" className="mt-5">
        <ProcrastinatorBox variant="row-between" className="text-xs text-[#64748B]">
          <span>
            Tiempo completado hoy: <strong>{Math.round(completedMinutes)} min</strong> ({progressPercent}%)
          </span>
          <span>
            Objetivo: <strong>{totalCapacityMinutes} min</strong>
          </span>
        </ProcrastinatorBox>
        <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#2563EB] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </ProcrastinatorBox>
    </ProcrastinatorBox>
  );
};
