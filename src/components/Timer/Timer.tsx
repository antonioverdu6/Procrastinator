import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, CheckCircle2, Coffee, AlertCircle, Sparkles, CheckSquare, Square, ChevronDown, ChevronUp, FileCode } from 'lucide-react';
import { Task, Project, TaskActionPlan } from '../../types';
import { api } from '../../services/api';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorButton } from '../ProcrastinatorButton';
import { ProcrastinatorBadge } from '../ProcrastinatorBadge';
import { ProcrastinatorText } from '../ProcrastinatorText';

interface TimerProps {
  task: Task;
  project?: Project;
  onTaskCompleted: (taskId: string) => void;
  onTimeLogged: (taskId: string, additionalMinutes: number) => void;
}

export const Timer: React.FC<TimerProps> = ({ task, project, onTaskCompleted, onTimeLogged }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const timerRef = useRef<number | null>(null);

  // Estados de la Guía de Acción generada por IA
  const [plan, setPlan] = useState<TaskActionPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});

  const targetSeconds = (task.estimatedMinutes || 30) * 60;
  const isOvertime = mode === 'focus' && secondsElapsed > targetSeconds;

  useEffect(() => {
    setIsRunning(false);
    setSecondsElapsed(0);
    setMode('focus');
    setPlan(null);
    setShowPlan(false);
    setCheckedSteps({});
  }, [task.id]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = window.setInterval(() => {
        setSecondsElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  const handleTogglePlay = () => {
    setIsRunning(!isRunning);
  };

  const handleComplete = () => {
    setIsRunning(false);
    const minutesToAdd = Math.max(1, Math.round(secondsElapsed / 60));
    onTimeLogged(task.id, minutesToAdd);
    onTaskCompleted(task.id);
    setSecondsElapsed(0);
  };

  const handleSwitchBreak = () => {
    setIsRunning(false);
    if (mode === 'focus') {
      const minutesToAdd = Math.round(secondsElapsed / 60);
      if (minutesToAdd > 0) onTimeLogged(task.id, minutesToAdd);
      setMode('break');
      setSecondsElapsed(0);
    } else {
      setMode('focus');
      setSecondsElapsed(0);
    }
  };

  const handleFetchActionPlan = async () => {
    if (plan) {
      setShowPlan(!showPlan);
      return;
    }

    setLoadingPlan(true);
    setShowPlan(true);
    try {
      const generatedPlan = await api.getTaskActionPlan(task.id);
      setPlan(generatedPlan);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPlan(false);
    }
  };

  const toggleStep = (idx: number) => {
    setCheckedSteps(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const progressPercent = Math.min(100, Math.round((secondsElapsed / targetSeconds) * 100));

  return (
    <ProcrastinatorBox variant="card">
      {/* Barra de progreso de la tarea */}
      <ProcrastinatorBox className="w-full h-1 bg-[#F1F5F9] rounded-full overflow-hidden mb-4">
        <div
          className={`h-full transition-all duration-300 ${
            isOvertime ? 'bg-[#D97706]' : 'bg-[#2563EB]'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </ProcrastinatorBox>

      <ProcrastinatorBox className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Datos de la tarea activa */}
        <ProcrastinatorBox className="flex-1 min-w-0 w-full md:w-auto">
          <ProcrastinatorBox className="flex items-center gap-2 mb-1 flex-wrap">
            <ProcrastinatorBadge variant={mode === 'focus' ? 'primary' : 'success'}>
              {mode === 'focus' ? 'Enfoque activo' : 'Pausa de descanso'}
            </ProcrastinatorBadge>
            <ProcrastinatorText variant="caption">
              Estimado: {task.estimatedMinutes}m | Registrado hoy: {task.actualMinutes}m
            </ProcrastinatorText>
          </ProcrastinatorBox>

          <ProcrastinatorText variant="h2" className="truncate">
            {task.title}
          </ProcrastinatorText>
          {task.description && (
            <ProcrastinatorText variant="caption" className="truncate block mt-0.5">
              {task.description}
            </ProcrastinatorText>
          )}

          {/* Botón para desglosar la tarea con la IA */}
          <ProcrastinatorBox className="mt-2.5">
            <ProcrastinatorButton
              variant="secondary"
              onClick={handleFetchActionPlan}
              disabled={loadingPlan}
              className="text-xs font-semibold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] border-[#DBEAFE]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{loadingPlan ? 'Consultando al PM...' : showPlan ? 'Ocultar guía de ejecución' : '¿Qué tengo que hacer? (Guía IA)'}</span>
              {showPlan ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </ProcrastinatorButton>
          </ProcrastinatorBox>
        </ProcrastinatorBox>

        {/* Cronómetro y Botones */}
        <ProcrastinatorBox className="flex items-center gap-3">
          <ProcrastinatorBox className="font-mono text-2xl font-bold tracking-tight text-[#0F172A] bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-1.5 rounded-lg min-w-[95px] text-center">
            {formatTime(secondsElapsed)}
          </ProcrastinatorBox>

          <ProcrastinatorBox className="flex items-center gap-1.5">
            <ProcrastinatorButton
              variant={isRunning ? 'secondary' : 'primary'}
              onClick={handleTogglePlay}
              title={isRunning ? 'Pausar' : 'Iniciar'}
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isRunning ? 'Pausar' : 'Iniciar'}</span>
            </ProcrastinatorButton>

            <ProcrastinatorButton
              variant="success"
              onClick={handleComplete}
              title="Marcar tarea como completada"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Listo</span>
            </ProcrastinatorButton>

            <ProcrastinatorButton
              variant="ghost"
              onClick={handleSwitchBreak}
              title={mode === 'focus' ? 'Tomar pausa' : 'Volver al foco'}
            >
              <Coffee className="w-4 h-4" />
            </ProcrastinatorButton>
          </ProcrastinatorBox>
        </ProcrastinatorBox>
      </ProcrastinatorBox>

      {/* Despliegue de la Guía Paso a Paso con IA */}
      {showPlan && plan && (
        <ProcrastinatorBox variant="subtle" className="mt-5 pt-4 border-t border-[#E2E8F0] space-y-3 animate-fadeIn">
          <ProcrastinatorBox>
            <ProcrastinatorBadge variant="primary">
              Plan de Acción del Lead PM
            </ProcrastinatorBadge>
            <ProcrastinatorText variant="body" className="mt-1 font-medium">
              {plan.summary}
            </ProcrastinatorText>
          </ProcrastinatorBox>

          {/* Checklist interactivo */}
          <ProcrastinatorBox className="space-y-1.5">
            <ProcrastinatorText variant="caption" className="font-semibold uppercase tracking-wider block">
              Pasos a ejecutar (marca conforme avances):
            </ProcrastinatorText>
            <ProcrastinatorBox className="space-y-1">
              {plan.steps.map((step, idx) => {
                const isChecked = Boolean(checkedSteps[idx]);
                return (
                  <div
                    key={idx}
                    onClick={() => toggleStep(idx)}
                    className={`flex items-start gap-2.5 p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                      isChecked ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-white hover:bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0]'
                    }`}
                  >
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-[#16A34A] flex-shrink-0 mt-0.5" />
                    ) : (
                      <Square className="w-4 h-4 text-[#94A3B8] flex-shrink-0 mt-0.5" />
                    )}
                    <span className={isChecked ? 'line-through text-[#15803D]' : ''}>{step}</span>
                  </div>
                );
              })}
            </ProcrastinatorBox>
          </ProcrastinatorBox>

          {/* Archivos y Trampa a evitar */}
          <ProcrastinatorBox className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
            {plan.filesToTouch && plan.filesToTouch.length > 0 && (
              <ProcrastinatorBox className="bg-white p-2.5 rounded-lg border border-[#E2E8F0]">
                <span className="font-semibold text-[#475569] flex items-center gap-1 mb-1">
                  <FileCode className="w-3.5 h-3.5 text-[#2563EB]" /> Archivos o módulos a tocar:
                </span>
                <div className="flex flex-wrap gap-1">
                  {plan.filesToTouch.map((f, i) => (
                    <span key={i} className="px-2 py-0.5 bg-[#F1F5F9] text-[#0F172A] rounded font-mono text-[11px]">
                      {f}
                    </span>
                  ))}
                </div>
              </ProcrastinatorBox>
            )}

            {plan.pitfall && (
              <div className="bg-[#FEF3C7] border border-[#FDE68A] p-2.5 rounded-lg text-[#92400E]">
                <span className="font-semibold flex items-center gap-1 mb-0.5">
                  <AlertCircle className="w-3.5 h-3.5 text-[#D97706]" /> Trampa a evitar:
                </span>
                <p className="text-[11px] leading-relaxed">{plan.pitfall}</p>
              </div>
            )}
          </ProcrastinatorBox>
        </ProcrastinatorBox>
      )}

      {/* Alerta de fricción / atasco */}
      {isOvertime && (
        <div className="mt-4 p-3 bg-[#FEF3C7] border border-[#FDE68A] rounded-lg flex items-center gap-2.5 text-xs text-[#92400E] animate-fadeIn">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#D97706]" />
          <div>
            <strong>Llevas más tiempo del previsto ({task.estimatedMinutes} min).</strong> Si estás atascado en un detalle secundario, haz un commit rápido, toma un descanso o abre la guía de ejecución arriba.
          </div>
        </div>
      )}
    </ProcrastinatorBox>
  );
};
