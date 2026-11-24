import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  CheckCircle2,
  Coffee,
  AlertCircle,
  Sparkles,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  FileCode,
  ListChecks,
  Send,
  GitBranch,
  MessageSquare
} from 'lucide-react';
import { Task, Project, TaskActionPlan, Subtask, TaskAskMessage } from '../../types';
import { api } from '../../services/api';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorButton } from '../ProcrastinatorButton';
import { ProcrastinatorBadge } from '../ProcrastinatorBadge';
import { ProcrastinatorInput } from '../ProcrastinatorInput';
import { ProcrastinatorText } from '../ProcrastinatorText';

interface TimerProps {
  task: Task;
  project?: Project;
  onTaskCompleted: (taskId: string) => void;
  onTimeLogged: (taskId: string, additionalMinutes: number) => void;
  onTaskUpdated?: () => void;
}

const TIMER_STORAGE_KEY = 'procrastinator_timer_session';

interface PersistedTimerState {
  taskId: string;
  isRunning: boolean;
  startTimestamp: number | null;
  accumulatedSeconds: number;
  mode: 'focus' | 'break';
  lastUpdated: number;
}

const loadTimerState = (taskId: string): PersistedTimerState | null => {
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedTimerState;
    if (parsed.taskId !== taskId) return null;
    return parsed;
  } catch {
    return null;
  }
};

const saveTimerState = (state: PersistedTimerState) => {
  try {
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore localStorage write errors
  }
};

export const Timer: React.FC<TimerProps> = ({
  task,
  project,
  onTaskCompleted,
  onTimeLogged,
  onTaskUpdated
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [startTimestamp, setStartTimestamp] = useState<number | null>(null);
  const [accumulatedSeconds, setAccumulatedSeconds] = useState(0);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');

  // Subtareas persistidas de la tarea
  const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks || []);

  // Estados de la Guía Técnica generada por IA + Q&A interactivo
  const [plan, setPlan] = useState<TaskActionPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});

  // Q&A técnico dentro de la guía
  const [qaMessages, setQaMessages] = useState<TaskAskMessage[]>([]);
  const [qaInput, setQaInput] = useState('');
  const [askingQa, setAskingQa] = useState(false);

  const targetSeconds = (task.estimatedMinutes || 30) * 60;
  const isOvertime = mode === 'focus' && secondsElapsed > targetSeconds;

  useEffect(() => {
    setSubtasks(task.subtasks || []);
  }, [task.id, task.subtasks]);

  // Restaurar estado persistido al cambiar de tarea
  useEffect(() => {
    const saved = loadTimerState(task.id);
    if (saved) {
      let currentSeconds = saved.accumulatedSeconds;
      if (saved.isRunning && saved.startTimestamp) {
        const diff = Math.max(0, Math.floor((Date.now() - saved.startTimestamp) / 1000));
        currentSeconds += diff;
      }
      setIsRunning(saved.isRunning);
      setStartTimestamp(saved.startTimestamp);
      setAccumulatedSeconds(saved.accumulatedSeconds);
      setSecondsElapsed(currentSeconds);
      setMode(saved.mode);
    } else {
      setIsRunning(false);
      setStartTimestamp(null);
      setAccumulatedSeconds(0);
      setSecondsElapsed(0);
      setMode('focus');
    }
    setPlan(null);
    setShowPlan(false);
    setCheckedSteps({});
    setQaMessages([]);
    setQaInput('');
  }, [task.id]);

  // Tick periódico basado en marcas de tiempo reales
  useEffect(() => {
    if (!isRunning || !startTimestamp) return;

    const tick = () => {
      const diff = Math.max(0, Math.floor((Date.now() - startTimestamp) / 1000));
      setSecondsElapsed(accumulatedSeconds + diff);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isRunning, startTimestamp, accumulatedSeconds]);

  const handleTogglePlay = () => {
    if (isRunning) {
      const diff = startTimestamp ? Math.max(0, Math.floor((Date.now() - startTimestamp) / 1000)) : 0;
      const total = accumulatedSeconds + diff;
      setIsRunning(false);
      setStartTimestamp(null);
      setAccumulatedSeconds(total);
      setSecondsElapsed(total);

      saveTimerState({
        taskId: task.id,
        isRunning: false,
        startTimestamp: null,
        accumulatedSeconds: total,
        mode,
        lastUpdated: Date.now()
      });
    } else {
      const now = Date.now();
      setIsRunning(true);
      setStartTimestamp(now);

      saveTimerState({
        taskId: task.id,
        isRunning: true,
        startTimestamp: now,
        accumulatedSeconds,
        mode,
        lastUpdated: now
      });
    }
  };

  const handleComplete = () => {
    setIsRunning(false);
    const finalSeconds = isRunning && startTimestamp
      ? accumulatedSeconds + Math.max(0, Math.floor((Date.now() - startTimestamp) / 1000))
      : secondsElapsed;

    const minutesToAdd = Math.max(1, Math.round(finalSeconds / 60));
    onTimeLogged(task.id, minutesToAdd);
    onTaskCompleted(task.id);

    try {
      localStorage.removeItem(TIMER_STORAGE_KEY);
    } catch {
      // Ignore
    }

    setStartTimestamp(null);
    setAccumulatedSeconds(0);
    setSecondsElapsed(0);
  };

  const handleSwitchBreak = () => {
    const finalSeconds = isRunning && startTimestamp
      ? accumulatedSeconds + Math.max(0, Math.floor((Date.now() - startTimestamp) / 1000))
      : secondsElapsed;

    setIsRunning(false);
    setStartTimestamp(null);
    setAccumulatedSeconds(0);
    setSecondsElapsed(0);

    const nextMode = mode === 'focus' ? 'break' : 'focus';
    setMode(nextMode);

    if (mode === 'focus') {
      const minutesToAdd = Math.round(finalSeconds / 60);
      if (minutesToAdd > 0) onTimeLogged(task.id, minutesToAdd);
    }

    saveTimerState({
      taskId: task.id,
      isRunning: false,
      startTimestamp: null,
      accumulatedSeconds: 0,
      mode: nextMode,
      lastUpdated: Date.now()
    });
  };

  const handleToggleSubtask = async (subId: string) => {
    const updated = subtasks.map(s => (s.id === subId ? { ...s, done: !s.done } : s));
    setSubtasks(updated);
    try {
      await api.updateTask(task.id, { subtasks: updated });
      onTaskUpdated?.();
    } catch (err) {
      console.error(err);
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

      if (subtasks.length === 0 && generatedPlan.steps.length > 0) {
        const persisted: Subtask[] = generatedPlan.steps.map((step, i) => ({
          id: `${task.id}-sub-${i + 1}`,
          title: step.replace(/^\d+\.\s*/, ''),
          done: false
        }));
        setSubtasks(persisted);
        await api.updateTask(task.id, { subtasks: persisted });
        onTaskUpdated?.();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPlan(false);
    }
  };

  const handleAskTechnical = async (customQuestion?: string) => {
    const q = (customQuestion || qaInput).trim();
    if (!q || askingQa) return;

    const userEntry: TaskAskMessage = { role: 'user', content: q };
    const nextHistory = [...qaMessages, userEntry];
    setQaMessages(nextHistory);
    setQaInput('');
    setAskingQa(true);

    try {
      const res = await api.askTaskTechnicalQuestion(
        task.id,
        q,
        qaMessages.map(m => ({ role: m.role, content: m.content }))
      );
      setQaMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: res.answer,
          referencedFiles: res.referencedFiles,
          codeSnippet: res.codeSnippet
        }
      ]);
    } catch (err) {
      console.error(err);
      setQaMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'No pude consultar al asistente técnico en este momento.' }
      ]);
    } finally {
      setAskingQa(false);
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
  const doneSubtasksCount = subtasks.filter(s => s.done).length;

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
            {task.epic && task.epic !== 'General' && (
              <ProcrastinatorBadge variant="neutral">{task.epic}</ProcrastinatorBadge>
            )}
            {project && (
              <ProcrastinatorBadge variant="neutral">{project.name}</ProcrastinatorBadge>
            )}
            {project?.repoUrl && (
              <ProcrastinatorBadge variant="primary">
                <GitBranch className="w-3 h-3" />
                <span>Repo conectado</span>
              </ProcrastinatorBadge>
            )}
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

          {/* Botón para abrir Guía Técnica + Q&A */}
          <ProcrastinatorBox className="mt-2.5">
            <ProcrastinatorButton
              variant="secondary"
              onClick={handleFetchActionPlan}
              disabled={loadingPlan}
              className="text-xs font-semibold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] border-[#DBEAFE]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {loadingPlan
                  ? 'Analizando proyecto y repo...'
                  : showPlan
                  ? 'Ocultar guía técnica'
                  : '¿Cómo lo resuelvo? (Guía técnica IA)'}
              </span>
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

      {/* Subtareas persistidas del Ticket */}
      {subtasks.length > 0 && (
        <ProcrastinatorBox variant="subtle" className="mt-4 space-y-2">
          <ProcrastinatorBox className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#0F172A] flex items-center gap-1.5">
              <ListChecks className="w-4 h-4 text-[#2563EB]" />
              Subtareas del Ticket ({doneSubtasksCount}/{subtasks.length})
            </span>
            <span className="text-[#64748B]">Guardado en proyecto</span>
          </ProcrastinatorBox>

          <div className="space-y-1">
            {subtasks.map(sub => (
              <div
                key={sub.id}
                onClick={() => handleToggleSubtask(sub.id)}
                className={`flex items-start gap-2.5 p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                  sub.done
                    ? 'bg-[#DCFCE7] text-[#15803D]'
                    : 'bg-white hover:bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0]'
                }`}
              >
                {sub.done ? (
                  <CheckSquare className="w-4 h-4 text-[#16A34A] flex-shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-4 h-4 text-[#94A3B8] flex-shrink-0 mt-0.5" />
                )}
                <span className={sub.done ? 'line-through text-[#15803D]' : ''}>{sub.title}</span>
              </div>
            ))}
          </div>
        </ProcrastinatorBox>
      )}

      {/* Despliegue de la Guía Técnica Profunda + Q&A interactivo */}
      {showPlan && plan && (
        <ProcrastinatorBox variant="subtle" className="mt-4 pt-4 border-t border-[#E2E8F0] space-y-4 animate-fadeIn">
          <ProcrastinatorBox className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <ProcrastinatorBadge variant="primary">Guía Técnica del Lead PM</ProcrastinatorBadge>
              {plan.repoContextUsed && plan.repoLabel && (
                <ProcrastinatorBadge variant="success">
                  <GitBranch className="w-3 h-3" />
                  <span>Leído de {plan.repoLabel}</span>
                </ProcrastinatorBadge>
              )}
            </div>

            <ProcrastinatorText variant="body" className="font-medium block">
              {plan.summary}
            </ProcrastinatorText>

            {plan.architectureNotes && (
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-3 text-xs text-[#334155] leading-relaxed">
                <span className="font-semibold text-[#0F172A] block mb-1">Cómo resolverlo (arquitectura y flujo):</span>
                {plan.architectureNotes}
              </div>
            )}
          </ProcrastinatorBox>

          {/* Checklist si no había subtareas persistidas */}
          {subtasks.length === 0 && (
            <ProcrastinatorBox className="space-y-1.5">
              <ProcrastinatorText variant="caption" className="font-semibold uppercase tracking-wider block">
                Pasos a ejecutar:
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
          )}

          {/* Snippet inicial si existe */}
          {plan.quickSnippet && plan.quickSnippet.trim().length > 0 && (
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-3 text-xs">
              <span className="font-semibold text-[#0F172A] block mb-1.5">Esqueleto / punto de partida:</span>
              <pre className="bg-[#F8FAFC] border border-[#E2E8F0] rounded p-2.5 overflow-x-auto font-mono text-[11px] text-[#0F172A] whitespace-pre-wrap">
                {plan.quickSnippet}
              </pre>
            </div>
          )}

          {/* Archivos y Trampa a evitar */}
          <ProcrastinatorBox className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
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

          {/* Q&A Interactivo con el Tech Lead (contexto del proyecto y repo GitHub) */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-semibold text-[#0F172A] flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#2563EB]" />
                Preguntar cómo resolver esta tarea
              </span>
              <span className="text-[11px] text-[#64748B]">
                {project?.repoUrl ? `Con contexto de ${project.name} + repo GitHub` : `Con contexto de ${project?.name || 'proyecto'}`}
              </span>
            </div>

            {/* Preguntas rápidas */}
            <div className="flex flex-wrap gap-1.5">
              {[
                '¿Cómo lo estructuro exactamente paso a paso?',
                'Dame un ejemplo de código para empezar',
                '¿Qué archivos debo tocar y qué casos límite validar?'
              ].map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleAskTechnical(q)}
                  disabled={askingQa}
                  className="px-2 py-1 text-[11px] bg-[#F8FAFC] hover:bg-[#EFF6FF] text-[#334155] hover:text-[#2563EB] border border-[#E2E8F0] rounded-md transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Historial Q&A */}
            {qaMessages.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto pt-1">
                {qaMessages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg text-xs leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-[#EFF6FF] text-[#1D4ED8] ml-6'
                        : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] mr-4 space-y-2'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.content}</div>
                    {m.referencedFiles && m.referencedFiles.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {m.referencedFiles.map((rf, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-white border border-[#E2E8F0] rounded font-mono text-[10px] text-[#0F172A]">
                            {rf}
                          </span>
                        ))}
                      </div>
                    )}
                    {m.codeSnippet && m.codeSnippet.trim().length > 0 && (
                      <pre className="bg-white border border-[#E2E8F0] rounded p-2 overflow-x-auto font-mono text-[11px] text-[#0F172A] whitespace-pre-wrap">
                        {m.codeSnippet}
                      </pre>
                    )}
                  </div>
                ))}
                {askingQa && (
                  <div className="text-xs text-[#64748B] italic px-1">Analizando código y preparando respuesta...</div>
                )}
              </div>
            )}

            <form
              onSubmit={e => {
                e.preventDefault();
                handleAskTechnical();
              }}
              className="flex gap-2"
            >
              <ProcrastinatorInput
                type="text"
                placeholder="Pregunta lo que necesites (ej: '¿Cómo conecto este endpoint con el estado del frontend?')..."
                value={qaInput}
                onChange={e => setQaInput(e.target.value)}
                disabled={askingQa}
              />
              <ProcrastinatorButton
                type="submit"
                variant="primary"
                disabled={!qaInput.trim() || askingQa}
              >
                <Send className="w-3.5 h-3.5" />
              </ProcrastinatorButton>
            </form>
          </div>
        </ProcrastinatorBox>
      )}

      {/* Alerta de fricción / atasco */}
      {isOvertime && (
        <div className="mt-4 p-3 bg-[#FEF3C7] border border-[#FDE68A] rounded-lg flex items-center gap-2.5 text-xs text-[#92400E] animate-fadeIn">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#D97706]" />
          <div>
            <strong>Llevas más tiempo del previsto ({task.estimatedMinutes} min).</strong> Si estás atascado en un detalle secundario, haz un commit rápido, toma un descanso o pregunta en la guía técnica arriba.
          </div>
        </div>
      )}
    </ProcrastinatorBox>
  );
};
