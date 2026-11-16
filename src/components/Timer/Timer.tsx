import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, CheckCircle2, Coffee, AlertCircle } from 'lucide-react';
import { Task } from '../../types';
import { styles } from '../../style';

interface TimerProps {
  task: Task;
  onTaskCompleted: (taskId: string) => void;
  onTimeLogged: (taskId: string, additionalMinutes: number) => void;
}

export const Timer: React.FC<TimerProps> = ({ task, onTaskCompleted, onTimeLogged }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const timerRef = useRef<number | null>(null);

  const targetSeconds = (task.estimatedMinutes || 30) * 60;
  const isOvertime = mode === 'focus' && secondsElapsed > targetSeconds;

  useEffect(() => {
    setIsRunning(false);
    setSecondsElapsed(0);
    setMode('focus');
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
          <div className="flex items-center gap-2 mb-1">
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

      {/* Alerta de fricción / atasco */}
      {isOvertime && (
        <div className="mt-4 p-3 bg-[#FEF3C7] border border-[#FDE68A] rounded-lg flex items-center gap-2.5 text-xs text-[#92400E] animate-fadeIn">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#D97706]" />
          <div>
            <strong>Llevas más tiempo del previsto ({task.estimatedMinutes} min).</strong> Si estás atascado en un detalle secundario, haz un commit rápido, toma un descanso o divide la tarea.
          </div>
        </div>
      )}
    </div>
  );
};
