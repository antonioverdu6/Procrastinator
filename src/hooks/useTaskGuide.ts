import { useState, useEffect } from 'react';
import { TaskActionPlan } from '../types';
import { api } from '../services/api';

export function useTaskGuide(taskId: string) {
  const [plan, setPlan] = useState<TaskActionPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setPlan(null);
    setShowPlan(false);
    setCheckedSteps({});
  }, [taskId]);

  const toggleActionPlan = async () => {
    if (plan) {
      setShowPlan(prev => !prev);
      return;
    }

    setLoadingPlan(true);
    setShowPlan(true);
    try {
      const generatedPlan = await api.getTaskActionPlan(taskId);
      setPlan(generatedPlan);
    } catch (err) {
      console.error('Error obteniendo guía de acción de tarea:', err);
    } finally {
      setLoadingPlan(false);
    }
  };

  const toggleStep = (idx: number) => {
    setCheckedSteps(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  return {
    plan,
    loadingPlan,
    showPlan,
    setShowPlan,
    checkedSteps,
    toggleActionPlan,
    toggleStep
  };
}
