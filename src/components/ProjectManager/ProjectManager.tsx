import React, { useState } from 'react';
import { Project, Task, Priority, Difficulty, TaskPMEvaluation, ProposedTask } from '../../types';
import { StorageService, getTodayDateString } from '../../services/storageService';
import { AIService } from '../../services/aiService';
import { FolderKanban, Plus, Trash2, ArrowUpRight, Sparkles, Send, Check, AlertCircle, Edit2, ArrowRight } from 'lucide-react';
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
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);

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

  const today = getTodayDateString();

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
      const result = await AIService.evaluateTaskWithPM(taskTitle, taskDesc, getProject(taskProject));
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

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      projectId: taskProject || projects[0]?.id || 'default',
      title: taskTitle.trim(),
      description: taskDesc.trim(),
      estimatedMinutes: taskMinutes,
      actualMinutes: 0,
      status: 'backlog',
      priority: taskPriority,
      difficulty: taskDifficulty,
      deferredCount: 0,
      order: tasks.length + 1
    };

    StorageService.saveTasks([...tasks, newTask]);
    setTaskTitle('');
    setTaskDesc('');
    setEvaluation(null);
    setShowNewTaskModal(false);
    onRefreshData();
  };

  // PASO 1 A PASO 2 EN NUEVO PROYECTO (GENERAR TAREAS CON PM)
  const handleStartProjectRoadmap = async () => {
    if (!newProjName.trim()) return;
    setIsGeneratingRoadmap(true);
    try {
      const generated = await AIService.generateProjectRoadmap(newProjName, newProjDesc, newProjHours);
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
      const result = await AIService.refineProjectRoadmap(
        proposedTasks,
        userText,
        { name: newProjName, description: newProjDesc }
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
  const handleConfirmProject = () => {
    if (!newProjName.trim()) return;

    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name: newProjName.trim(),
      description: newProjDesc.trim(),
      color: '#2563EB',
      targetHours: newProjHours,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    const newTasks: Task[] = proposedTasks.map((pt, idx) => ({
      id: `task-${Date.now()}-${idx}`,
      projectId: newProject.id,
      title: pt.title,
      description: pt.description,
      estimatedMinutes: pt.estimatedMinutes,
      actualMinutes: 0,
      status: 'backlog',
      priority: pt.priority,
      difficulty: pt.difficulty,
      deferredCount: 0,
      order: tasks.length + idx + 1
    }));

    StorageService.saveProjects([...projects, newProject]);
    StorageService.saveTasks([...tasks, ...newTasks]);

    // Reset states
    setNewProjName('');
    setNewProjDesc('');
    setProposedTasks([]);
    setProjectStep(1);
    setRefineMessages([]);
    setShowNewProjectModal(false);
    onRefreshData();
  };

  const handleMoveToToday = (taskId: string) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          status: 'scheduled_today' as const,
          scheduledDate: today
        };
      }
      return t;
    });
    StorageService.saveTasks(updated);
    onRefreshData();
  };

  const handleDeleteTask = (taskId: string) => {
    const updated = tasks.filter(t => t.id !== taskId);
    StorageService.saveTasks(updated);
    onRefreshData();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={styles.typography.h1}>Proyectos & Backlog</h2>
          <p className={styles.typography.caption}>
            Desglosa tus aplicaciones en micro-tareas evaluadas por el PM para alimentar tu objetivo diario.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setProjectStep(1);
              setShowNewProjectModal(true);
            }}
            className={styles.button.secondary}
          >
            <FolderKanban className="w-4 h-4 text-[#2563EB]" /> Nuevo Proyecto
          </button>
          <button
            onClick={() => {
              setEvaluation(null);
              setShowNewTaskModal(true);
            }}
            className={styles.button.primary}
          >
            <Plus className="w-4 h-4" /> Nueva Tarea
          </button>
        </div>
      </div>

      {/* Grid de Proyectos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <div
              key={proj.id}
              onClick={() => setSelectedProjectId(isSelected ? 'all' : proj.id)}
              className={`p-5 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white border-[#2563EB] ring-2 ring-[#2563EB]/10 shadow-sm'
                  : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1] shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-[#0F172A] text-base truncate">{proj.name}</h3>
                <span className="text-[11px] font-medium text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded">
                  {completedCount}/{projTasks.length} hechas
                </span>
              </div>

              <p className="text-xs text-[#64748B] line-clamp-2 h-8 mb-3">
                {proj.description || 'Sin descripción'}
              </p>

              {/* Progreso */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-[#64748B]">
                  <span>Progreso</span>
                  <span className="font-semibold text-[#0F172A]">{percent}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#2563EB] rounded-full transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lista del Backlog */}
      <div className={styles.card.base}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
          {/* Filtros de proyectos */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
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
          </div>

          <div className="text-xs text-[#64748B] flex items-center gap-2">
            <span>Backlog: <strong>{backlogTasks.length}</strong></span>
            <span>•</span>
            <span>Hoy: <strong>{scheduledTasks.length}</strong></span>
            <span>•</span>
            <span>Hechas: <strong>{completedTasks.length}</strong></span>
          </div>
        </div>

        {/* Tareas */}
        <div className="divide-y divide-[#F1F5F9] mt-2">
          {backlogTasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#94A3B8]">
              No hay tareas en el backlog para este filtro.
            </div>
          ) : (
            backlogTasks.map(task => {
              const project = getProject(task.projectId);

              return (
                <div
                  key={task.id}
                  className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#F8FAFC] rounded-lg transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-[#0F172A]">
                        {task.title}
                      </span>
                      {project && (
                        <span className={styles.badge.neutral}>
                          {project.name}
                        </span>
                      )}
                      <span className={
                        task.priority === 'urgent' ? styles.badge.danger :
                        task.priority === 'high' ? styles.badge.warning :
                        styles.badge.neutral
                      }>
                        {task.priority}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-xs text-[#64748B] mt-0.5">{task.description}</p>
                    )}

                    <div className="text-xs text-[#94A3B8] flex items-center gap-2 mt-1">
                      <span>⏱️ {task.estimatedMinutes} min</span>
                      <span>•</span>
                      <span>Dificultad: {task.difficulty}</span>
                      {task.deferredCount > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-[#D97706]">Pospuesta {task.deferredCount}x</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto flex-shrink-0">
                    <button
                      onClick={() => handleMoveToToday(task.id)}
                      className={styles.button.secondary}
                      title="Mover a la jornada de hoy"
                    >
                      <span>Planificar hoy</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-2 text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL 1: NUEVA TAREA CON EVALUADOR DEL PM */}
      {showNewTaskModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 w-full max-w-lg shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className={styles.typography.h2}>Nueva Tarea con Revisión del PM</h3>
              <button onClick={() => setShowNewTaskModal(false)} className="text-[#94A3B8] hover:text-[#0F172A]">✕</button>
            </div>

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
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ej. Implementar caché Redis para la API..."
                    value={taskTitle}
                    onChange={e => setTaskTitle(e.target.value)}
                    className={styles.input.base}
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleEvaluateTask}
                    disabled={!taskTitle.trim() || isEvaluating}
                    className="px-3 py-2 bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#2563EB] border border-[#DBEAFE] rounded-lg text-xs font-semibold flex items-center gap-1.5 flex-shrink-0 transition-colors"
                    title="Pedir al PM que analice utilidad, prioridad y tiempo estimado"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isEvaluating ? 'Evaluando...' : 'Evaluar con PM'}
                  </button>
                </div>
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

              {/* Tarjeta de Veredicto del PM */}
              {evaluation && (
                <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-2 animate-fadeIn text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0F172A] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                      Dictamen del PM
                    </span>
                    <span className={evaluation.isUseful ? styles.badge.success : styles.badge.warning}>
                      {evaluation.isUseful ? '✅ Aporta Valor Real' : '⚠️ Riesgo de Distracción'}
                    </span>
                  </div>

                  <p className="text-[#475569] leading-relaxed">{evaluation.verdict}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0] text-slate-600">
                    <div>
                      <span>Tiempo estimado según tu velocidad: <strong>{evaluation.estimatedMinutes} min</strong></span>
                      <span className="mx-2">•</span>
                      <span>Prioridad sugerida: <strong className="capitalize">{evaluation.suggestedPriority}</strong></span>
                    </div>

                    <button
                      type="button"
                      onClick={handleApplyPMEvaluation}
                      className="text-[#2563EB] hover:underline font-semibold"
                    >
                      Aplicar sugerencias
                    </button>
                  </div>

                  {evaluation.breakdownWarning && (
                    <div className="p-2 bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] rounded-lg">
                      {evaluation.breakdownWarning}
                    </div>
                  )}
                </div>
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
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className={styles.button.ghost}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.button.primary}>
                  Guardar Tarea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: NUEVO PROYECTO CON ASISTENTE DE DESGLOSE Y CONVERSACIÓN */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 w-full max-w-2xl shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-[#2563EB]" />
                <h3 className={styles.typography.h2}>
                  {projectStep === 1 ? 'Nuevo Proyecto' : `Desglose & Ajuste: ${newProjName}`}
                </h3>
              </div>
              <button onClick={() => setShowNewProjectModal(false)} className="text-[#94A3B8] hover:text-[#0F172A]">✕</button>
            </div>

            {/* PASO 1: Datos básicos y disparo de IA */}
            {projectStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className={styles.input.label}>Nombre del Proyecto</label>
                  <input
                    type="text"
                    placeholder="Ej. App de Facturación Simple, Bot de Scraping..."
                    value={newProjName}
                    onChange={e => setNewProjName(e.target.value)}
                    className={styles.input.base}
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
                  <label className={styles.input.label}>Meta aproximada de horas</label>
                  <input
                    type="number"
                    value={newProjHours}
                    onChange={e => setNewProjHours(Number(e.target.value))}
                    min={5}
                    max={200}
                    className={styles.input.base}
                  />
                </div>

                <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      // Crear vacío sin tareas
                      const newProject: Project = {
                        id: `proj-${Date.now()}`,
                        name: newProjName.trim(),
                        description: newProjDesc.trim(),
                        color: '#2563EB',
                        targetHours: newProjHours,
                        status: 'active',
                        createdAt: new Date().toISOString()
                      };
                      StorageService.saveProjects([...projects, newProject]);
                      setShowNewProjectModal(false);
                      onRefreshData();
                    }}
                    disabled={!newProjName.trim()}
                    className="text-xs text-[#64748B] hover:text-[#0F172A] hover:underline"
                  >
                    Crear vacío sin tareas
                  </button>

                  <button
                    type="button"
                    onClick={handleStartProjectRoadmap}
                    disabled={!newProjName.trim() || isGeneratingRoadmap}
                    className={styles.button.primary}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isGeneratingRoadmap ? 'Desglosando proyecto con IA...' : 'Desglosar y Planificar Tareas con PM'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* PASO 2: Lista de tareas propuestas con edición directa y chat conversacional */}
            {projectStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-[#64748B]">
                  <span>El PM propone <strong>{proposedTasks.length} micro-tareas</strong>. Puedes editarlas o conversar para modificarlas:</span>
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
                          className="p-1 text-[#94A3B8] hover:text-[#DC2626] rounded"
                          title="Quitar tarea"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mini Chat con el PM para ajustar el desglose */}
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
                    <input
                      type="text"
                      placeholder="Ej: 'Quita los pagos y pon login con Google', 'Hazlas de 25 min máximo'..."
                      value={refineInput}
                      onChange={e => setRefineInput(e.target.value)}
                      disabled={isRefining}
                      className={styles.input.base}
                    />
                    <button
                      type="submit"
                      disabled={!refineInput.trim() || isRefining}
                      className={styles.button.primary}
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={() => setProjectStep(1)}
                    className={styles.button.ghost}
                  >
                    Atrás
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmProject}
                    disabled={proposedTasks.length === 0}
                    className={styles.button.success}
                  >
                    <Check className="w-4 h-4" />
                    <span>Crear Proyecto y Guardar {proposedTasks.length} Tareas en el Backlog</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
