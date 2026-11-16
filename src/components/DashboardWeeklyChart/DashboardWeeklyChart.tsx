import React from 'react';
import { TrendingUp } from 'lucide-react';
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
import { ProcrastinatorText } from '../ProcrastinatorText';

interface WeeklyActivityItem {
  date: string;
  dayName: string;
  plannedHours: number;
  actualHours: number;
}

interface DashboardWeeklyChartProps {
  data: WeeklyActivityItem[];
}

export const DashboardWeeklyChart: React.FC<DashboardWeeklyChartProps> = ({ data }) => {
  return (
    <ProcrastinatorBox variant="card">
      <ProcrastinatorBox variant="row-between" className="mb-4">
        <ProcrastinatorBox variant="stack-sm">
          <ProcrastinatorText variant="h3" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#2563EB]" />
            Horas Planificadas vs. Horas Reales (Última semana)
          </ProcrastinatorText>
          <ProcrastinatorText variant="caption">
            Tiempo frente al código comparado con el objetivo marcado.
          </ProcrastinatorText>
        </ProcrastinatorBox>

        <ProcrastinatorBox variant="row" className="gap-3 text-xs">
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

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="dayName" stroke="#64748B" fontSize={12} tickLine={false} />
            <YAxis stroke="#64748B" fontSize={12} tickLine={false} unit="h" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderColor: '#CBD5E1',
                borderRadius: '8px',
                boxShadow: 'none',
                fontSize: '12px'
              }}
            />
            <Bar dataKey="plannedHours" name="Planificado" fill="#CBD5E1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="actualHours" name="Real" fill="#2563EB" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ProcrastinatorBox>
  );
};
