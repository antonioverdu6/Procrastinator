import { useState } from 'react';
import confetti from 'canvas-confetti';
import { Task } from '../types';
import { api } from '../services/api';

interface UseDailyFocusProps {
  tasks: Task[];
  defaultProjectId?: string;
  onRefreshData: () => void;
}

export function useDailyFocus({ tasks, defaultProjectId, onRefreshData }: UseDailyFocusProps) {
  const [quickTitle, setQuickTitle] = useState('');
  const [quickMins, setQuickMins] = useState(30);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(defaultProjectId || '');

  const triggerCelebration = () => {
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.7 }
    });
  };

  const completeTask = async (taskId: string) => {
    try {
      await api.updateTask(taskId, {
        status: 'completed',
        completedAt: new Date().toISOString()
      });
      triggerCelebration();
      onRefreshData();
    } catch (err) {
      console.error('Error completando tarea:', err);
    }
  };

  const logTime = async (taskId: string, additionalMinutes: number) => {
    try {
      await api.logTaskTime(taskId, additionalMinutes);
      onRefreshData();
    } catch (err) {
      console.error('Error registrando tiempo:', err);
    }
  };

  const startTask = async (taskId: string) => {
    try {
      // Pausar cualquier otra que esté in_progress
      for (const t of tasks) {
        if (t.status === 'in_progress' && t.id !== taskId) {
          await api.updateTask(t.id, { status: 'scheduled_today' });
        }
      }
      await api.updateTask(taskId, { status: 'in_progress' });
      onRefreshData();
    } catch (err) {
      console.error('Error iniciando tarea:', err);
    }
  };

  const deferTask = async (taskId: string) => {
    const t = tasks.find(x => x.id === taskId);
    try {
      await api.updateTask(taskId, {
        status: 'backlog',
        scheduledDate: undefined,
        deferredCount: (t?.deferredCount || 0) + 1
      });
      onRefreshData();
    } catch (err) {
      console.error('Error posponiendo tarea al backlog:', err);
    }
  };

  const adjustCapacity = async (minutes: number) => {
    try {
      await api.adjustCapacity(minutes, false);
      onRefreshData();
    } catch (err) {
      console.error('Error ajustando capacidad:', err);
    }
  };

  const createQuickTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickTitle.trim()) return;

    try {
      await api.createTask({
        projectId: selectedProjectId || defaultProjectId || 'default',
        title: quickTitle.trim(),
        estimatedMinutes: quickMins,
        priority: 'high',
        difficulty: 'medium'
      });
      setQuickTitle('');
      setShowAddForm(false);
      onRefreshData();
    } catch (err) {
      console.error('Error creando tarea rápida:', err);
    }
  };

  return {
    quickTitle,
    setQuickTitle,
    quickMins,
    setQuickMins,
    showAddForm,
    setShowAddForm,
    selectedProjectId,
    setSelectedProjectId,
    completeTask,
    logTime,
    startTask,
    deferTask,
    adjustCapacity,
    createQuickTask
  };
}
