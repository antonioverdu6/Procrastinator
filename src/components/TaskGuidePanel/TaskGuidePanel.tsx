import React from 'react';
import { TaskActionPlan } from '../../types';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorButton } from '../ProcrastinatorButton';
import { ProcrastinatorText } from '../ProcrastinatorText';
import { Sparkles, CheckSquare, Square, ChevronDown, ChevronUp, FileCode, AlertCircle } from 'lucide-react';

interface TaskGuidePanelProps {
  plan: TaskActionPlan | null;
  loadingPlan: boolean;
  showPlan: boolean;
  onTogglePlan: () => void;
  checkedSteps: Record<number, boolean>;
  onToggleStep: (idx: number) => void;
}

export const TaskGuidePanel: React.FC<TaskGuidePanelProps> = ({
  plan,
  loadingPlan,
  showPlan,
  onTogglePlan,
  checkedSteps,
  onToggleStep
}) => {
  return (
    <ProcrastinatorBox className="mt-3">
      <ProcrastinatorButton
        variant="secondary"
        onClick={onTogglePlan}
        disabled={loadingPlan}
        className="text-xs font-semibold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] border-[#DBEAFE]"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>
          {loadingPlan
            ? 'Analizando tarea con el PM...'
            : plan
            ? showPlan
              ? 'Ocultar Guía de Pasos'
              : 'Ver Guía de Pasos'
            : '¿Qué tengo que hacer exactamente? (IA)'}
        </span>
        {plan && (
          showPlan ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />
        )}
      </ProcrastinatorButton>

      {/* Despliegue de la Guía Paso a Paso */}
      {showPlan && plan && (
        <ProcrastinatorBox variant="subtle" className="mt-3 border-[#DBEAFE] space-y-4">
          {/* Resumen */}
          <ProcrastinatorBox variant="stack-sm">
            <ProcrastinatorText variant="caption" className="font-semibold uppercase tracking-wider text-[#2563EB] block mb-1">
              Objetivo Concreto
            </ProcrastinatorText>
            <p className="text-sm text-[#0F172A] font-medium leading-relaxed">
              {plan.summary}
            </p>
          </ProcrastinatorBox>

          {/* Checklist de Micro-Pasos */}
          <ProcrastinatorBox variant="stack-sm">
            <ProcrastinatorText variant="caption" className="font-semibold uppercase tracking-wider text-[#64748B] block">
              Micro-Pasos para no atascarte:
            </ProcrastinatorText>
            <div className="space-y-1.5">
              {plan.steps.map((step, idx) => {
                const isChecked = Boolean(checkedSteps[idx]);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onToggleStep(idx)}
                    className="w-full flex items-start gap-2.5 p-2 rounded-lg text-left hover:bg-white transition-colors"
                  >
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-[#16A34A] mt-0.5 flex-shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-[#94A3B8] mt-0.5 flex-shrink-0" />
                    )}
                    <span className={`text-xs ${isChecked ? 'line-through text-[#94A3B8]' : 'text-[#334155]'}`}>
                      {step}
                    </span>
                  </button>
                );
              })}
            </div>
          </ProcrastinatorBox>

          <ProcrastinatorBox variant="grid-2" className="pt-2 border-t border-[#E2E8F0]">
            {/* Archivos a Tocar */}
            {plan.filesToTouch && plan.filesToTouch.length > 0 && (
              <ProcrastinatorBox variant="stack-sm">
                <span className="text-xs font-semibold text-[#64748B] flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-[#2563EB]" />
                  Archivos sugeridos:
                </span>
                <div className="flex flex-wrap gap-1">
                  {plan.filesToTouch.map((file, i) => (
                    <code key={i} className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-[#E2E8F0] text-[#0F172A]">
                      {file}
                    </code>
                  ))}
                </div>
              </ProcrastinatorBox>
            )}

            {/* Fricciones a Evitar */}
            {plan.pitfall && (
              <ProcrastinatorBox variant="stack-sm">
                <span className="text-xs font-semibold text-[#D97706] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Alerta de sobreingeniería:
                </span>
                <p className="text-xs text-[#475569] leading-relaxed">
                  {plan.pitfall}
                </p>
              </ProcrastinatorBox>
            )}
          </ProcrastinatorBox>
        </ProcrastinatorBox>
      )}
    </ProcrastinatorBox>
  );
};
