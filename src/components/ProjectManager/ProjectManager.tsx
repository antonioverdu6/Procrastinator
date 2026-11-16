import React, { useState } from 'react';
import { Project, Task, Priority, Difficulty, TaskPMEvaluation, ProposedTask } from '../../types';
import { api } from '../../services/api';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorButton } from '../ProcrastinatorButton';
import { ProcrastinatorBadge } from '../ProcrastinatorBadge';
import { ProcrastinatorInput } from '../ProcrastinatorInput';
import { ProcrastinatorText } from '../ProcrastinatorText';
import { FolderKanban, Plus, Trash2, ArrowUpRight, Sparkles, Send, Check, ArrowRight, X } from 'lucide-react';
import { styles } from '../../style';

interface ProjectManagerProps {
  projects: Project[];
  tasks: Task[];
  onRefreshData: () => void;
  onOpenChat: () => void;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({
  projects,
  tasks,
  onRefreshData
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [showNewProjectPanel, setShowNewProjectPanel] = useState(false);
  const [showNewTaskPanel, setShowNewTaskPanel] = useState(false);

  // States para nuevo proyecto y asistente de desglose
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjHours, setNewProjHours] = useState(25);
  const [projectStep, setProjectStep] = useState<1 | 2>(1);
  const [proposedTasks, setProposedTasks] = useState<ProposedTask[]>([]);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);
  const [refineInput, setRefineInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [refineMessages, setRefineMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);

  // States para nueva tarea y evaluación del PM
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskProject, setTaskProject] = useState(projects[0]?.id || '');
  const [taskMinutes, setTaskMinutes] = useState(45);
  const [taskPriority, setTaskPriority] = useState<Priority>('medium');
  const [taskDifficulty, setTaskDifficulty] = useState<Difficulty>('medium');
  const [evaluation, setEvaluation] = useState<TaskPMEvaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const filteredTasks = tasks.filter(t => {
    if (selectedProjectId === 'all') return true;
    return t.projectId === selectedProjectId;
  });

  const backlogTasks = filteredTasks.filter(t => t.status === 'backlog');
  const scheduledTasks = filteredTasks.filter(t => t.status === 'scheduled_today' || t.status === 'in_progress');
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');

  const getProject = (id: string) => projects.find(p => p.id === id);

  // EVALUAR TAREA CON EL PM
  const handleEvaluateTask = async () => {
    if (!taskTitle.trim()) return;
    setIsEvaluating(true);
    try {
      const result = await api.evaluateTask(taskTitle, taskDesc, taskProject);
      setEvaluation(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleApplyPMEvaluation = () => {
    if (!evaluation) return;
    setTaskMinutes(evaluation.estimatedMinutes);
    setTaskPriority(evaluation.suggestedPriority);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    try {
      await api.createTask({
        projectId: taskProject || projects[0]?.id || 'default',
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        estimatedMinutes: taskMinutes,
        priority: taskPriority,
        difficulty: taskDifficulty
      });

      setTaskTitle('');
      setTaskDesc('');
      setEvaluation(null);
      setShowNewTaskPanel(false);
      onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  // PASO 1 A PASO 2 EN NUEVO PROYECTO (GENERAR TAREAS CON PM)
  const handleStartProjectRoadmap = async () => {
    if (!newProjName.trim()) return;
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
      console.error(err);
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  // REFINAR TAREAS CON EL PM MEDIANTE CONVERSACIÓN
  const handleRefineRoadmap = async (e: React.FormEvent) => {
    e.preventDefault();
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
      console.error(err);
    } finally {
      setIsRefining(false);
    }
  };

  const handleUpdateProposedTask = (id: string, field: keyof ProposedTask, value: any) => {
    setProposedTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleDeleteProposedTask = (id: string) => {
    setProposedTasks(prev => prev.filter(t => t.id !== id));
  };

  // CONFIRMAR PROYECTO Y VOLCAR TAREAS AL BACKLOG
  const handleConfirmProject = async () => {
    if (!newProjName.trim()) return;

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

      setNewProjName('');
      setNewProjDesc('');
      setProposedTasks([]);
      setProjectStep(1);
      setRefineMessages([]);
      setShowNewProjectPanel(false);
      onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMoveToToday = async (taskId: string) => {
    try {
      await api.updateTask(taskId, {
        status: 'scheduled_today',
        scheduledDate: today
      });
      onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await api.deleteTask(taskId);
      onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <ProcrastinatorBox className="space-y-6 animate-fadeIn">
      {/* Header */}
      <ProcrastinatorBox className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <ProcrastinatorBox>
          <ProcrastinatorText variant="h1">Proyectos & Backlog</ProcrastinatorText>
          <ProcrastinatorText variant="caption">
            Desglosa tus aplicaciones en micro-tareas evaluadas por el PM para alimentar tu objetivo diario.
          </ProcrastinatorText>
        </ProcrastinatorBox>

        <ProcrastinatorBox className="flex items-center gap-2">
          <ProcrastinatorButton
            variant="secondary"
            onClick={() => {
              setProjectStep(1);
              setShowNewProjectPanel(prev => !prev);
              setShowNewTaskPanel(false);
            }}
          >
            <FolderKanban className="w-4 h-4 text-[#2563EB]" /> Nuevo Proyecto
          </ProcrastinatorButton>
          <ProcrastinatorButton
            variant="primary"
            onClick={() => {
              setEvaluation(null);
              setShowNewTaskPanel(prev => !prev);
              setShowNewProjectPanel(false);
            }}
          >
            <Plus className="w-4 h-4" /> Nueva Tarea
          </ProcrastinatorButton>
        </ProcrastinatorBox>
      </ProcrastinatorBox>

      {/* PANEL INTEGRADO: NUEVO PROYECTO (Diseño 100% plano, sin modales ni sombras) */}
      {showNewProjectPanel && (
        <ProcrastinatorBox variant="panel" className="animate-fadeIn">
          <ProcrastinatorBox className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <ProcrastinatorBox className="flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-[#2563EB]" />
              <ProcrastinatorText variant="h2">
                {projectStep === 1 ? 'Crear Nuevo Proyecto' : `Desglose & Ajuste: ${newProjName}`}
              </ProcrastinatorText>
            </ProcrastinatorBox>
            <button
              onClick={() => {
                setShowNewProjectPanel(false);
                setProjectStep(1);
              }}
              className="text-[#94A3B8] hover:text-[#0F172A] p-1 rounded-lg transition-colors"
              title="Cerrar panel"
            >
              <X className="w-5 h-5" />
            </button>
          </ProcrastinatorBox>

          {/* PASO 1: Datos básicos y disparo de IA */}
          {projectStep === 1 && (
            <div className="space-y-4">
              <div>
                <ProcrastinatorInput
                  label="Nombre del Proyecto"
                  type="text"
                  placeholder="Ej. App de Facturación Simple, Bot de Scraping..."
                  value={newProjName}
                  onChange={e => setNewProjName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className={styles.input.label}>Descripción / Qué quieres construir</label>
                <textarea
                  placeholder="Describe las funcionalidades clave, tecnologías que quieres usar o qué problema resuelve..."
                  value={newProjDesc}
                  onChange={e => setNewProjDesc(e.target.value)}
                  rows={3}
                  className={styles.input.base}
                />
              </div>

              <div>
                <ProcrastinatorInput
                  label="Meta aproximada de horas"
                  type="number"
                  value={newProjHours}
                  onChange={e => setNewProjHours(Number(e.target.value))}
                  min={5}
                  max={200}
                />
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
                <button
                  type="button"
                  onClick={async () => {
                    if (!newProjName.trim()) return;
                    await api.createProject({
                      name: newProjName.trim(),
                      description: newProjDesc.trim(),
                      color: '#2563EB',
                      targetHours: newProjHours,
                      status: 'active'
                    });
                    setNewProjName('');
                    setNewProjDesc('');
                    setShowNewProjectPanel(false);
                    onRefreshData();
                  }}
                  disabled={!newProjName.trim()}
                  className="text-xs text-[#64748B] hover:text-[#0F172A] hover:underline"
                >
                  Crear vacío sin tareas
                </button>

                <div className="flex gap-2">
                  <ProcrastinatorButton
                    type="button"
                    variant="ghost"
                    onClick={() => setShowNewProjectPanel(false)}
                  >
                    Cancelar
                  </ProcrastinatorButton>
                  <ProcrastinatorButton
                    type="button"
                    variant="primary"
                    onClick={handleStartProjectRoadmap}
                    disabled={!newProjName.trim() || isGeneratingRoadmap}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isGeneratingRoadmap ? 'Desglosando proyecto con IA...' : 'Desglosar y Planificar Tareas con PM'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </ProcrastinatorButton>
                </div>
              </div>
            </div>
          )}

          {/* PASO 2: Lista de tareas propuestas con edición directa y chat conversacional */}
          {projectStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-[#64748B]">
                <span>El PM propone <strong>{proposedTasks.length} micro-tareas</strong>. Puedes editarlas directamente o conversar para adaptarlas:</span>
              </div>

              {/* Lista de tareas propuestas (editables directamente) */}
              <div className="space-y-2 max-h-56 overflow-y-auto border border-[#E2E8F0] rounded-xl p-2 bg-[#F8FAFC]">
                {proposedTasks.map((t, idx) => (
                  <div key={t.id} className="p-2.5 bg-white border border-[#E2E8F0] rounded-lg flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono text-[#94A3B8] font-bold">{idx + 1}.</span>
                    <input
                      type="text"
                      value={t.title}
                      onChange={e => handleUpdateProposedTask(t.id, 'title', e.target.value)}
                      className="flex-1 bg-transparent border-b border-transparent hover:border-[#CBD5E1] focus:border-[#2563EB] focus:outline-none font-medium text-[#0F172A] px-1 py-0.5"
                    />
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <input
                        type="number"
                        value={t.estimatedMinutes}
                        onChange={e => handleUpdateProposedTask(t.id, 'estimatedMinutes', Number(e.target.value))}
                        className="w-14 bg-[#F1F5F9] border border-[#E2E8F0] rounded px-1.5 py-0.5 text-center font-mono"
                        title="Minutos"
                      />
                      <span className="text-[#94A3B8]">m</span>
                      <button
                        onClick={() => handleDeleteProposedTask(t.id)}
                        className="p-1 text-[#94A3B8] hover:text-[#DC2626] rounded transition-colors"
                        title="Quitar tarea"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mini Chat con el PM para afinar el desglose */}
              <div className="border border-[#E2E8F0] rounded-xl p-3 bg-white space-y-2">
                <div className="text-xs font-semibold text-[#0F172A] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                  Conversar con el PM para afinar las tareas:
                </div>

                <div className="space-y-2 max-h-32 overflow-y-auto text-xs">
                  {refineMessages.map((m, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded-lg ${
                        m.role === 'user'
                          ? 'bg-[#EFF6FF] text-[#1D4ED8] ml-6'
                          : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] mr-6'
                      }`}
                    >
                      {m.text}
                    </div>
                  ))}
                  {isRefining && (
                    <div className="text-xs text-[#64748B] italic">Ajustando tareas con el PM...</div>
                  )}
                </div>

                <form onSubmit={handleRefineRoadmap} className="flex gap-2">
                  <ProcrastinatorInput
                    type="text"
                    placeholder="Ej: 'Quita los pagos y pon login con Google', 'Hazlas de 25 min máximo'..."
                    value={refineInput}
                    onChange={e => setRefineInput(e.target.value)}
                    disabled={isRefining}
                  />
                  <ProcrastinatorButton
                    type="submit"
                    variant="primary"
                    disabled={!refineInput.trim() || isRefining}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </ProcrastinatorButton>
                </form>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-[#E2E8F0]">
                <ProcrastinatorButton
                  type="button"
                  variant="ghost"
                  onClick={() => setProjectStep(1)}
                >
                  Atrás
                </ProcrastinatorButton>

                <ProcrastinatorButton
                  type="button"
                  variant="success"
                  onClick={handleConfirmProject}
                  disabled={proposedTasks.length === 0}
                >
                  <Check className="w-4 h-4" />
                  <span>Crear Proyecto y Guardar {proposedTasks.length} Tareas en el Backlog</span>
                </ProcrastinatorButton>
              </div>
            </div>
          )}
        </ProcrastinatorBox>
      )}

      {/* PANEL INTEGRADO: NUEVA TAREA (Diseño 100% plano, sin modales ni sombras) */}
      {showNewTaskPanel && (
        <ProcrastinatorBox variant="panel" className="animate-fadeIn">
          <ProcrastinatorBox className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <ProcrastinatorBox className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#2563EB]" />
              <ProcrastinatorText variant="h2">Nueva Tarea con Revisión del PM</ProcrastinatorText>
            </ProcrastinatorBox>
            <button
              onClick={() => {
                setShowNewTaskPanel(false);
                setEvaluation(null);
              }}
              className="text-[#94A3B8] hover:text-[#0F172A] p-1 rounded-lg transition-colors"
              title="Cerrar panel"
            >
              <X className="w-5 h-5" />
            </button>
          </ProcrastinatorBox>

          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label className={styles.input.label}>Proyecto</label>
              <select
                value={taskProject}
                onChange={e => setTaskProject(e.target.value)}
                className={styles.input.select}
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={styles.input.label}>Título de la Tarea</label>
              <ProcrastinatorBox className="flex gap-2">
                <ProcrastinatorInput
                  type="text"
                  placeholder="Ej. Implementar caché Redis para la API..."
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  required
                  autoFocus
                />
                <ProcrastinatorButton
                  type="button"
                  variant="secondary"
                  onClick={handleEvaluateTask}
                  disabled={!taskTitle.trim() || isEvaluating}
                  className="flex-shrink-0 text-[#2563EB] bg-[#EFF6FF] border-[#DBEAFE]"
                  title="Pedir al PM que analice utilidad, prioridad y tiempo estimado"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isEvaluating ? 'Evaluando...' : 'Evaluar con PM'}
                </ProcrastinatorButton>
              </ProcrastinatorBox>
            </div>

            <div>
              <label className={styles.input.label}>Detalles o Criterios (opcional)</label>
              <textarea
                placeholder="Qué se necesita exactamente..."
                value={taskDesc}
                onChange={e => setTaskDesc(e.target.value)}
                rows={2}
                className={styles.input.base}
              />
            </div>

            {/* Dictamen del PM */}
            {evaluation && (
              <ProcrastinatorBox variant="subtle" className="space-y-2 animate-fadeIn text-xs">
                <ProcrastinatorBox className="flex items-center justify-between">
                  <span className="font-bold text-[#0F172A] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                    Dictamen del PM
                  </span>
                  <ProcrastinatorBadge variant={evaluation.isUseful ? 'success' : 'warning'}>
                    {evaluation.isUseful ? '✅ Aporta Valor Real' : '⚠️ Riesgo de Distracción'}
                  </ProcrastinatorBadge>
                </ProcrastinatorBox>

                <p className="text-[#475569] leading-relaxed">{evaluation.verdict}</p>

                <ProcrastinatorBox className="flex items-center justify-between pt-2 border-t border-[#E2E8F0] text-slate-600">
                  <div>
                    <span>Tiempo según tu velocidad: <strong>{evaluation.estimatedMinutes} min</strong></span>
                    <span className="mx-2">•</span>
                    <span>Prioridad: <strong className="capitalize">{evaluation.suggestedPriority}</strong></span>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyPMEvaluation}
                    className="text-[#2563EB] hover:underline font-semibold"
                  >
                    Aplicar sugerencias
                  </button>
                </ProcrastinatorBox>

                {evaluation.breakdownWarning && (
                  <div className="p-2 bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] rounded-lg">
                    {evaluation.breakdownWarning}
                  </div>
                )}
              </ProcrastinatorBox>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className={styles.input.label}>Tiempo</label>
                <select
                  value={taskMinutes}
                  onChange={e => setTaskMinutes(Number(e.target.value))}
                  className={styles.input.select}
                >
                  <option value={20}>20 min</option>
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                  <option value={90}>90 min</option>
                </select>
              </div>

              <div>
                <label className={styles.input.label}>Prioridad</label>
                <select
                  value={taskPriority}
                  onChange={e => setTaskPriority(e.target.value as Priority)}
                  className={styles.input.select}
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>

              <div>
                <label className={styles.input.label}>Dificultad</label>
                <select
                  value={taskDifficulty}
                  onChange={e => setTaskDifficulty(e.target.value as Difficulty)}
                  className={styles.input.select}
                >
                  <option value="easy">Fácil</option>
                  <option value="medium">Media</option>
                  <option value="hard">Compleja</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
              <ProcrastinatorButton
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowNewTaskPanel(false);
                  setEvaluation(null);
                }}
              >
                Cancelar
              </ProcrastinatorButton>
              <ProcrastinatorButton variant="primary" type="submit">
                Guardar Tarea
              </ProcrastinatorButton>
            </div>
          </form>
        </ProcrastinatorBox>
      )}

      {/* Grid de Proyectos */}
      <ProcrastinatorBox className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map(proj => {
          const projTasks = tasks.filter(t => t.projectId === proj.id);
          const completedCount = projTasks.filter(t => t.status === 'completed').length;
          const completedMins = projTasks
            .filter(t => t.status === 'completed')
            .reduce((s, t) => s + (t.actualMinutes || t.estimatedMinutes), 0);
          const totalEstimatedMins = projTasks.reduce((s, t) => s + t.estimatedMinutes, 0) || (proj.targetHours ? proj.targetHours * 60 : 60);
          const percent = Math.min(100, Math.round((completedMins / totalEstimatedMins) * 100));

          const isSelected = selectedProjectId === proj.id;

          return (
            <ProcrastinatorBox
              key={proj.id}
              onClick={() => setSelectedProjectId(isSelected ? 'all' : proj.id)}
              className={`p-5 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white border-[#2563EB] ring-2 ring-[#2563EB]/10'
                  : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1]'
              }`}
            >
              <ProcrastinatorBox className="flex items-start justify-between gap-2 mb-2">
                <ProcrastinatorText variant="h3" className="truncate">{proj.name}</ProcrastinatorText>
                <ProcrastinatorBadge variant="neutral">
                  {completedCount}/{projTasks.length} hechas
                </ProcrastinatorBadge>
              </ProcrastinatorBox>

              <ProcrastinatorText variant="caption" className="line-clamp-2 h-8 mb-3 block">
                {proj.description || 'Sin descripción'}
              </ProcrastinatorText>

              {/* Progreso */}
              <ProcrastinatorBox className="space-y-1">
                <ProcrastinatorBox className="flex justify-between text-xs text-[#64748B]">
                  <span>Progreso</span>
                  <span className="font-semibold text-[#0F172A]">{percent}%</span>
                </ProcrastinatorBox>
                <ProcrastinatorBox className="w-full h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#2563EB] rounded-full transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </ProcrastinatorBox>
              </ProcrastinatorBox>
            </ProcrastinatorBox>
          );
        })}
      </ProcrastinatorBox>

      {/* Lista del Backlog */}
      <ProcrastinatorBox variant="card">
        <ProcrastinatorBox className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
          {/* Filtros de proyectos */}
          <ProcrastinatorBox className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedProjectId('all')}
              className={selectedProjectId === 'all' ? styles.button.tabActive : styles.button.tabInactive}
            >
              Todos ({tasks.length})
            </button>
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProjectId(p.id)}
                className={selectedProjectId === p.id ? styles.button.tabActive : styles.button.tabInactive}
              >
                {p.name}
              </button>
            ))}
          </ProcrastinatorBox>

          <ProcrastinatorBox className="text-xs text-[#64748B] flex items-center gap-2">
            <span>Backlog: <strong>{backlogTasks.length}</strong></span>
            <span>•</span>
            <span>Hoy: <strong>{scheduledTasks.length}</strong></span>
            <span>•</span>
            <span>Hechas: <strong>{completedTasks.length}</strong></span>
          </ProcrastinatorBox>
        </ProcrastinatorBox>

        {/* Tareas */}
        <ProcrastinatorBox className="divide-y divide-[#F1F5F9] mt-2">
          {backlogTasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#94A3B8]">
              No hay tareas en el backlog para este filtro.
            </div>
          ) : (
            backlogTasks.map(task => {
              const project = getProject(task.projectId);

              return (
                <ProcrastinatorBox
                  key={task.id}
                  className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#F8FAFC] rounded-lg transition-colors"
                >
                  <ProcrastinatorBox className="min-w-0">
                    <ProcrastinatorBox className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-[#0F172A]">
                        {task.title}
                      </span>
                      {project && (
                        <ProcrastinatorBadge variant="neutral">
                          {project.name}
                        </ProcrastinatorBadge>
                      )}
                      <ProcrastinatorBadge variant={
                        task.priority === 'urgent' ? 'danger' :
                        task.priority === 'high' ? 'warning' :
                        'neutral'
                      }>
                        {task.priority}
                      </ProcrastinatorBadge>
                    </ProcrastinatorBox>

                    {task.description && (
                      <ProcrastinatorText variant="caption" className="block mt-0.5">{task.description}</ProcrastinatorText>
                    )}

                    <ProcrastinatorBox className="text-xs text-[#94A3B8] flex items-center gap-2 mt-1">
                      <span>⏱️ {task.estimatedMinutes} min</span>
                      <span>•</span>
                      <span>Dificultad: {task.difficulty}</span>
                      {task.deferredCount > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-[#D97706]">Pospuesta {task.deferredCount}x</span>
                        </>
                      )}
                    </ProcrastinatorBox>
                  </ProcrastinatorBox>

                  <ProcrastinatorBox className="flex items-center gap-1.5 self-end sm:self-auto flex-shrink-0">
                    <ProcrastinatorButton
                      variant="secondary"
                      onClick={() => handleMoveToToday(task.id)}
                      title="Mover a la jornada de hoy"
                    >
                      <span>Planificar hoy</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </ProcrastinatorButton>

                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-2 text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </ProcrastinatorBox>
                </ProcrastinatorBox>
              );
            })
          )}
        </ProcrastinatorBox>
      </ProcrastinatorBox>
    </ProcrastinatorBox>
  );
};
