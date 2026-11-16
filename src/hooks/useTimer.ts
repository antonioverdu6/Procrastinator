import { useState, useEffect, useRef } from 'react';
import { Task } from '../types';

interface UseTimerProps {
  task: Task;
  onTaskCompleted: (taskId: string) => void;
  onTimeLogged: (taskId: string, additionalMinutes: number) => void;
}

export function useTimer({ task, onTaskCompleted, onTimeLogged }: UseTimerProps) {
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

  const togglePlay = () => {
    setIsRunning(prev => !prev);
  };

  const complete = () => {
    setIsRunning(false);
    const minutesToAdd = Math.max(1, Math.round(secondsElapsed / 60));
    onTimeLogged(task.id, minutesToAdd);
    onTaskCompleted(task.id);
    setSecondsElapsed(0);
  };

  const switchBreak = () => {
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

  const progressPercent = targetSeconds > 0
    ? Math.min(100, Math.round((secondsElapsed / targetSeconds) * 100))
    : 0;

  return {
    isRunning,
    secondsElapsed,
    mode,
    isOvertime,
    targetSeconds,
    progressPercent,
    togglePlay,
    complete,
    switchBreak,
    formatTime
  };
}
