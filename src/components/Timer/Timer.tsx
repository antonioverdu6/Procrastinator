import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, CheckCircle2, Coffee, AlertCircle, Sparkles, CheckSquare, Square, ChevronDown, ChevronUp, FileCode } from 'lucide-react';
import { Task, Project, TaskActionPlan } from '../../types';
import { AIService } from '../../services/aiService';
import { styles } from '../../style';

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
      const generatedPlan = await AIService.getTaskActionPlan(task, project);
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
    <div className={styles.card.base}>
      {/* Barra de progreso de la tarea */}
      <div className="w-full h-1 bg-[#F1F5F9] rounded-full overflow-hidden mb-4">
        <div
          className={`h-full transition-all duration-300 ${
            isOvertime ? 'bg-[#D97706]' : 'bg-[#2563EB]'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Datos de la tarea activa */}
        <div className="flex-1 min-w-0 w-full md:w-auto">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={mode === 'focus' ? styles.badge.primary : styles.badge.success}>
              {mode === 'focus' ? 'Enfoque activo' : 'Pausa de descanso'}
            </span>
            <span className="text-xs text-[#64748B]">
              Estimado: {task.estimatedMinutes}m | Registrado hoy: {task.actualMinutes}m
            </span>
          </div>

          <h3 className="text-lg font-bold text-[#0F172A] truncate">{task.title}</h3>
          {task.description && (
            <p className="text-xs text-[#64748B] truncate mt-0.5">{task.description}</p>
          )}

          {/* Botón para desglosar la tarea con la IA */}
          <div className="mt-2.5">
            <button
              onClick={handleFetchActionPlan}
              disabled={loadingPlan}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] bg-[#EFF6FF] hover:bg-[#DBEAFE] px-3 py-1.5 rounded-lg border border-[#DBEAFE] transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{loadingPlan ? 'Consultando al PM...' : showPlan ? 'Ocultar guía de ejecución' : '¿Qué tengo que hacer? (Guía IA)'}</span>
              {showPlan ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Cronómetro y Botones */}
        <div className="flex items-center gap-3">
          <div className="font-mono text-2xl font-bold tracking-tight text-[#0F172A] bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-1.5 rounded-lg min-w-[95px] text-center">
            {formatTime(secondsElapsed)}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleTogglePlay}
              className={isRunning ? styles.button.secondary : styles.button.primary}
              title={isRunning ? 'Pausar' : 'Iniciar'}
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isRunning ? 'Pausar' : 'Iniciar'}</span>
            </button>

            <button
              onClick={handleComplete}
              className={styles.button.success}
              title="Marcar tarea como completada"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Listo</span>
            </button>

            <button
              onClick={handleSwitchBreak}
              className={styles.button.ghost}
              title={mode === 'focus' ? 'Tomar pausa' : 'Volver al foco'}
            >
              <Coffee className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Despliegue de la Guía Paso a Paso con IA */}
      {showPlan && plan && (
        <div className="mt-5 pt-4 border-t border-[#E2E8F0] space-y-3 bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0] animate-fadeIn">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
              Plan de Acción del Lead PM
            </span>
            <p className="text-xs text-[#334155] mt-0.5 font-medium">{plan.summary}</p>
          </div>

          {/* Checklist interactivo */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Pasos a ejecutar (marca conforme avances):
            </span>
            <div className="space-y-1">
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
            </div>
          </div>

          {/* Archivos y Trampa a evitar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
            {plan.filesToTouch && plan.filesToTouch.length > 0 && (
              <div className="bg-white p-2.5 rounded-lg border border-[#E2E8F0]">
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
              </div>
            )}

            {plan.pitfall && (
              <div className="bg-[#FEF3C7] border border-[#FDE68A] p-2.5 rounded-lg text-[#92400E]">
                <span className="font-semibold flex items-center gap-1 mb-0.5">
                  <AlertCircle className="w-3.5 h-3.5 text-[#D97706]" /> Trampa a evitar:
                </span>
                <p className="text-[11px] leading-relaxed">{plan.pitfall}</p>
              </div>
            )}
          </div>
        </div>
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
    </div>
  );
};
