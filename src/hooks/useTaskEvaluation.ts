import { useState } from 'react';
import { Priority, Difficulty, TaskPMEvaluation } from '../types';
import { api } from '../services/api';

interface UseTaskEvaluationProps {
  defaultProjectId?: string;
  onTaskCreated?: () => void;
}

export function useTaskEvaluation({ defaultProjectId = '', onTaskCreated }: UseTaskEvaluationProps = {}) {
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskProject, setTaskProject] = useState(defaultProjectId);
  const [taskMinutes, setTaskMinutes] = useState(45);
  const [taskPriority, setTaskPriority] = useState<Priority>('medium');
  const [taskDifficulty, setTaskDifficulty] = useState<Difficulty>('medium');
  const [evaluation, setEvaluation] = useState<TaskPMEvaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTaskTitle('');
    setTaskDesc('');
    setEvaluation(null);
    setTaskMinutes(45);
    setTaskPriority('medium');
    setTaskDifficulty('medium');
  };

  const evaluateWithPM = async () => {
    if (!taskTitle.trim() || isEvaluating) return;
    setIsEvaluating(true);
    try {
      const result = await api.evaluateTask(taskTitle, taskDesc, taskProject);
      setEvaluation(result);
    } catch (err) {
      console.error('Error evaluando tarea con PM:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const applySuggestions = () => {
    if (!evaluation) return;
    setTaskMinutes(evaluation.estimatedMinutes);
    setTaskPriority(evaluation.suggestedPriority);
  };

  const submitTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!taskTitle.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await api.createTask({
        projectId: taskProject || defaultProjectId || 'default',
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        estimatedMinutes: taskMinutes,
        priority: taskPriority,
        difficulty: taskDifficulty
      });

      resetForm();
      if (onTaskCreated) onTaskCreated();
      return true;
    } catch (err) {
      console.error('Error creando tarea:', err);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    taskTitle,
    setTaskTitle,
    taskDesc,
    setTaskDesc,
    taskProject,
    setTaskProject,
    taskMinutes,
    setTaskMinutes,
    taskPriority,
    setTaskPriority,
    taskDifficulty,
    setTaskDifficulty,
    evaluation,
    setEvaluation,
    isEvaluating,
    isSubmitting,
    evaluateWithPM,
    applySuggestions,
    submitTask,
    resetForm
  };
}
