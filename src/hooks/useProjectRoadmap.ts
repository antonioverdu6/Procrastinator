import { useState } from 'react';
import { ProposedTask } from '../types';
import { api } from '../services/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface UseProjectRoadmapProps {
  onSuccess?: () => void;
}

export function useProjectRoadmap({ onSuccess }: UseProjectRoadmapProps = {}) {
  const [projectStep, setProjectStep] = useState<1 | 2>(1);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjHours, setNewProjHours] = useState(25);
  const [proposedTasks, setProposedTasks] = useState<ProposedTask[]>([]);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);
  const [refineInput, setRefineInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [refineMessages, setRefineMessages] = useState<ChatMessage[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const resetWizard = () => {
    setProjectStep(1);
    setNewProjName('');
    setNewProjDesc('');
    setNewProjHours(25);
    setProposedTasks([]);
    setRefineInput('');
    setRefineMessages([]);
    setIsGeneratingRoadmap(false);
    setIsRefining(false);
    setIsSaving(false);
  };

  const startRoadmap = async () => {
    if (!newProjName.trim() || isGeneratingRoadmap) return;
    setIsGeneratingRoadmap(true);
    try {
      const generated = await api.generateRoadmap(newProjName, newProjDesc, newProjHours);
      setProposedTasks(generated);
      setProjectStep(2);
      setRefineMessages([
        {
          role: 'assistant',
          text: `He preparado un desglose inicial de ${generated.length} micro-tareas para "${newProjName}". Puedes editar cualquier tarea directamente en la lista o escribirme abajo si quieres cambiar o quitar algo.`
        }
      ]);
    } catch (err) {
      console.error('Error generando roadmap con PM:', err);
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  const refineWithPM = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!refineInput.trim() || isRefining) return;

    const userText = refineInput.trim();
    setRefineInput('');
    setRefineMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsRefining(true);

    try {
      const result = await api.refineRoadmap(
        newProjName,
        newProjDesc,
        proposedTasks,
        userText
      );

      setProposedTasks(result.updatedTasks);
      setRefineMessages(prev => [...prev, { role: 'assistant', text: result.reply }]);
    } catch (err) {
      console.error('Error refinando roadmap:', err);
    } finally {
      setIsRefining(false);
    }
  };

  const updateProposedTask = (id: string, field: keyof ProposedTask, value: any) => {
    setProposedTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const deleteProposedTask = (id: string) => {
    setProposedTasks(prev => prev.filter(t => t.id !== id));
  };

  const confirmProject = async () => {
    if (!newProjName.trim() || isSaving) return;
    setIsSaving(true);

    try {
      const createdProj = await api.createProject({
        name: newProjName.trim(),
        description: newProjDesc.trim(),
        color: '#2563EB',
        targetHours: newProjHours,
        status: 'active'
      });

      for (const pt of proposedTasks) {
        await api.createTask({
          projectId: createdProj.id,
          title: pt.title,
          description: pt.description,
          estimatedMinutes: pt.estimatedMinutes,
          priority: pt.priority,
          difficulty: pt.difficulty
        });
      }

      resetWizard();
      if (onSuccess) onSuccess();
      return true;
    } catch (err) {
      console.error('Error confirmando proyecto:', err);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const createEmptyProject = async () => {
    if (!newProjName.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await api.createProject({
        name: newProjName.trim(),
        description: newProjDesc.trim(),
        color: '#2563EB',
        targetHours: newProjHours,
        status: 'active'
      });
      resetWizard();
      if (onSuccess) onSuccess();
      return true;
    } catch (err) {
      console.error('Error creando proyecto vacío:', err);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    projectStep,
    setProjectStep,
    newProjName,
    setNewProjName,
    newProjDesc,
    setNewProjDesc,
    newProjHours,
    setNewProjHours,
    proposedTasks,
    isGeneratingRoadmap,
    refineInput,
    setRefineInput,
    isRefining,
    refineMessages,
    isSaving,
    startRoadmap,
    refineWithPM,
    updateProposedTask,
    deleteProposedTask,
    confirmProject,
    createEmptyProject,
    resetWizard
  };
}
