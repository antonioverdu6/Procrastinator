import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorText } from '../ProcrastinatorText';

interface ProjectProgressItem {
  id: string;
  name: string;
  completedHours: number;
  totalHours: number;
  percentage: number;
}

interface DashboardProjectListProps {
  projects: ProjectProgressItem[];
}

export const DashboardProjectList: React.FC<DashboardProjectListProps> = ({ projects }) => {
  return (
    <ProcrastinatorBox variant="card">
      <ProcrastinatorText variant="h3" className="flex items-center gap-2 mb-1">
        <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
        Progreso por Proyecto
      </ProcrastinatorText>
      <ProcrastinatorText variant="caption" className="mb-4 block">
        Horas completadas vs. objetivo total de cada proyecto.
      </ProcrastinatorText>

      <ProcrastinatorBox variant="grid-2">
        {projects.length === 0 ? (
          <div className="col-span-2 py-4 text-center text-xs text-[#94A3B8]">
            No hay proyectos activos registrados.
          </div>
        ) : (
          projects.map(proj => (
            <ProcrastinatorBox key={proj.id} variant="subtle" className="space-y-1.5">
              <ProcrastinatorBox variant="row-between" className="text-xs">
                <span className="font-semibold text-[#0F172A]">{proj.name}</span>
                <span className="text-[#64748B]">
                  {proj.completedHours}h / {proj.totalHours}h ({proj.percentage}%)
                </span>
              </ProcrastinatorBox>
              <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#16A34A] rounded-full transition-all duration-300"
                  style={{ width: `${proj.percentage}%` }}
                />
              </div>
            </ProcrastinatorBox>
          ))
        )}
      </ProcrastinatorBox>
    </ProcrastinatorBox>
  );
};
