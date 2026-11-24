import React, { useState, useEffect } from 'react';
import {
  Project,
  Task,
  Priority,
  Difficulty,
  TaskPMEvaluation,
  ProposedTask,
  PlanScope,
  ProjectPlanProposal,
  Subtask,
  RepoPreview
} from '../../types';
import { api } from '../../services/api';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorButton } from '../ProcrastinatorButton';
import { ProcrastinatorBadge } from '../ProcrastinatorBadge';
import { ProcrastinatorInput } from '../ProcrastinatorInput';
import { ProcrastinatorText } from '../ProcrastinatorText';
import {
  FolderKanban,
  Plus,
  Trash2,
  ArrowUpRight,
  Sparkles,
  Send,
  Check,
  ArrowRight,
  X,
  Layers,
  ListChecks,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Square,
  GitBranch,
  Link2
} from 'lucide-react';
import { styles } from '../../style';

interface ProjectManagerProps {
  projects: Project[];
  tasks: Task[];
  onRefreshData: () => void;
  onOpenChat: () => void;
  draftProposal?: ProjectPlanProposal | null;
  onClearDraftProposal?: () => void;
}

function groupProposedByEpic(list: ProposedTask[]): [string, ProposedTask[]][] {
  const map = new Map<string, ProposedTask[]>();
  for (const t of list) {
    const epic = t.epic || 'General';
    if (!map.has(epic)) map.set(epic, []);
    map.get(epic)!.push(t);
  }
  return Array.from(map.entries());
}

function groupTasksByEpic(list: Task[]): [string, Task[]][] {
  const map = new Map<string, Task[]>();
  for (const t of list) {
    const epic = t.epic || 'General';
    if (!map.has(epic)) map.set(epic, []);
    map.get(epic)!.push(t);
  }
  return Array.from(map.entries());
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({
  projects,
  tasks,
  onRefreshData,
  draftProposal,
  onClearDraftProposal
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [showNewProjectPanel, setShowNewProjectPanel] = useState(false);
  const [showNewTaskPanel, setShowNewTaskPanel] = useState(false);
  const [backlogGroupMode, setBacklogGroupMode] = useState<'epic' | 'flat'>('epic');

  // States para nuevo proyecto y planificador estilo Jira
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjStack, setNewProjStack] = useState('');
  const [newProjRepoUrl, setNewProjRepoUrl] = useState('');
  const [newProjScope, setNewProjScope] = useState<PlanScope>('standard');

  // States para vincular repositorio GitHub a proyecto existente
  const [repoDraft, setRepoDraft] = useState('');
  const [savingRepo, setSavingRepo] = useState(false);
  const [checkingRepo, setCheckingRepo] = useState(false);
  const [repoPreview, setRepoPreview] = useState<RepoPreview | null>(null);
  const [projectStep, setProjectStep] = useState<1 | 2>(1);
  const [proposedTasks, setProposedTasks] = useState<ProposedTask[]>([]);
  const [expandedProposedIds, setExpandedProposedIds] = useState<Record<string, boolean>>({});
  const [newSubtaskDrafts, setNewSubtaskDrafts] = useState<Record<string, string>>({});
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);
  const [isCommittingPlan, setIsCommittingPlan] = useState(false);
  const [refineInput, setRefineInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [refineMessages, setRefineMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);

  // States para nueva tarea y evaluación del PM
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskEpic, setTaskEpic] = useState('General');
  const [taskProject, setTaskProject] = useState(projects[0]?.id || '');
  const [taskMinutes, setTaskMinutes] = useState(45);
  const [taskPriority, setTaskPriority] = useState<Priority>('medium');
  const [taskDifficulty, setTaskDifficulty] = useState<Difficulty>('medium');
  const [evaluation, setEvaluation] = useState<TaskPMEvaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // States para subtareas de tareas existentes en backlog
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});
  const [breakingDownTaskId, setBreakingDownTaskId] = useState<string | null>(null);

  // Cargar borrador enviado desde el Copiloto
  useEffect(() => {
    if (draftProposal) {
      setNewProjName(draftProposal.projectName);
      setNewProjDesc(draftProposal.projectDescription);
      setProposedTasks(draftProposal.tasks);
      setProjectStep(2);
      setShowNewProjectPanel(true);
      setShowNewTaskPanel(false);
      setRefineMessages([
        {
          role: 'assistant',
          text: `He importado la propuesta del Copiloto (${draftProposal.tasks.length} tareas). Edita cualquier épica, tarea o subtarea antes de guardar.`
        }
      ]);
      onClearDraftProposal?.();
    }
  }, [draftProposal]);

  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;

  useEffect(() => {
    setRepoDraft(selectedProject?.repoUrl || '');
    setRepoPreview(null);
  }, [selectedProjectId, selectedProject?.repoUrl]);

  const handleSaveProjectRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || savingRepo) return;
    setSavingRepo(true);
    setRepoPreview(null);
    try {
      await api.updateProject(selectedProject.id, { repoUrl: repoDraft.trim() });
      onRefreshData();
      if (repoDraft.trim()) {
        setCheckingRepo(true);
        const preview = await api.getProjectRepoPreview(selectedProject.id);
        setRepoPreview(preview);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingRepo(false);
      setCheckingRepo(false);
    }
  };

  const handleCheckRepoPreview = async () => {
    if (!selectedProject || checkingRepo) return;
    setCheckingRepo(true);
    try {
      const preview = await api.getProjectRepoPreview(selectedProject.id);
      setRepoPreview(preview);
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingRepo(false);
    }
  };

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
        epic: taskEpic.trim() || 'General',
        estimatedMinutes: taskMinutes,
        priority: taskPriority,
        difficulty: taskDifficulty
      });

      setTaskTitle('');
      setTaskDesc('');
      setTaskEpic('General');
      setEvaluation(null);
      setShowNewTaskPanel(false);
      onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  // PASO 1 A PASO 2 EN NUEVO PROYECTO (PLANIFICADOR ESTILO JIRA)
  const handleStartProjectRoadmap = async () => {
    if (!newProjName.trim()) return;
    setIsGeneratingRoadmap(true);
    try {
      const generated = await api.generateRoadmap(
        newProjName,
        newProjDesc,
        newProjScope,
        newProjStack
      );
      setProposedTasks(generated);
      setProjectStep(2);
      const epicsCount = new Set(generated.map(t => t.epic || 'General')).size;
      const calcHours = Math.max(
        1,
        Math.round((generated.reduce((s, t) => s + t.estimatedMinutes, 0) / 60) * 10) / 10
      );
      setRefineMessages([
        {
          role: 'assistant',
          text: `He estructurado "${newProjName}" en ${epicsCount} épicas/módulos y ${generated.length} tareas con sus subtareas. Meta estimada por el PM: ${calcHours}h. Puedes editar títulos, épicas, subtareas o pedirme cambios abajo.`
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
    setProposedTasks(prev => prev.map(t => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const handleDeleteProposedTask = (id: string) => {
    setProposedTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleAddManualProposedTask = (epicName: string = 'General') => {
    const newId = `prop-${Date.now()}`;
    setProposedTasks(prev => [
      ...prev,
      {
        id: newId,
        epic: epicName,
        title: 'Nueva tarea del módulo',
        description: '',
        estimatedMinutes: 35,
        priority: 'medium',
        difficulty: 'medium',
        subtasks: [
          { id: `${newId}-sub-1`, title: 'Definir implementación base', done: false }
        ]
      }
    ]);
    setExpandedProposedIds(prev => ({ ...prev, [newId]: true }));
  };

  const handleAddSubtaskToProposed = (taskId: string) => {
    const title = (newSubtaskDrafts[taskId] || '').trim();
    if (!title) return;
    setProposedTasks(prev =>
      prev.map(t => {
        if (t.id !== taskId) return t;
        const subs = t.subtasks || [];
        return {
          ...t,
          subtasks: [...subs, { id: `${taskId}-sub-${Date.now()}`, title, done: false }]
        };
      })
    );
    setNewSubtaskDrafts(prev => ({ ...prev, [taskId]: '' }));
  };

  const handleRemoveSubtaskFromProposed = (taskId: string, subId: string) => {
    setProposedTasks(prev =>
      prev.map(t =>
        t.id === taskId ? { ...t, subtasks: (t.subtasks || []).filter(s => s.id !== subId) } : t
      )
    );
  };

  // CONFIRMAR PROYECTO Y VOLCAR TAREAS EN UNA SOLA TRANSACCIÓN
  const handleConfirmProject = async () => {
    if (!newProjName.trim() || isCommittingPlan) return;
    setIsCommittingPlan(true);
    const calculatedHours = Math.max(
      1,
      Math.round((proposedTasks.reduce((s, t) => s + (Number(t.estimatedMinutes) || 0), 0) / 60) * 10) / 10
    );

    try {
      await api.commitProjectPlan({
        name: newProjName.trim(),
        description: newProjDesc.trim(),
        color: '#2563EB',
        targetHours: calculatedHours,
        repoUrl: newProjRepoUrl.trim(),
        tasks: proposedTasks
      });

      setNewProjName('');
      setNewProjDesc('');
      setNewProjStack('');
      setNewProjRepoUrl('');
      setProposedTasks([]);
      setProjectStep(1);
      setRefineMessages([]);
      setShowNewProjectPanel(false);
      onRefreshData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCommittingPlan(false);
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

  const handleToggleBacklogSubtask = async (task: Task, subId: string) => {
    const subs: Subtask[] = (task.subtasks || []).map(s =>
      s.id === subId ? { ...s, done: !s.done } : s
    );
    try {
      await api.updateTask(task.id, { subtasks: subs });
      onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBreakdownExistingTask = async (taskId: string) => {
    if (breakingDownTaskId) return;
    setBreakingDownTaskId(taskId);
    setExpandedTaskIds(prev => ({ ...prev, [taskId]: true }));
    try {
      await api.breakdownTask(taskId);
      onRefreshData();
    } catch (err) {
      console.error(err);
    } finally {
      setBreakingDownTaskId(null);
    }
  };

  const proposedEpicGroups = groupProposedByEpic(proposedTasks);
  const totalProposedMins = proposedTasks.reduce((s, t) => s + (Number(t.estimatedMinutes) || 0), 0);
  const totalProposedSubs = proposedTasks.reduce((s, t) => s + (t.subtasks?.length || 0), 0);

  const backlogEpicGroups = groupTasksByEpic(backlogTasks);

  const renderBacklogTaskRow = (task: Task) => {
    const project = getProject(task.projectId);
    const subs = task.subtasks || [];
    const doneSubs = subs.filter(s => s.done).length;
    const isExpanded = Boolean(expandedTaskIds[task.id]);

    return (
      <ProcrastinatorBox
        key={task.id}
        className="py-3 px-3 hover:bg-[#F8FAFC] rounded-lg transition-colors space-y-2"
      >
        <ProcrastinatorBox className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <ProcrastinatorBox className="min-w-0 flex-1">
            <ProcrastinatorBox className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-[#0F172A]">{task.title}</span>
              {project && <ProcrastinatorBadge variant="neutral">{project.name}</ProcrastinatorBadge>}
              {task.epic && task.epic !== 'General' && backlogGroupMode === 'flat' && (
                <ProcrastinatorBadge variant="primary">{task.epic}</ProcrastinatorBadge>
              )}
              <ProcrastinatorBadge
                variant={
                  task.priority === 'urgent'
                    ? 'danger'
                    : task.priority === 'high'
                    ? 'warning'
                    : 'neutral'
                }
              >
                {task.priority}
              </ProcrastinatorBadge>
            </ProcrastinatorBox>

            {task.description && (
              <ProcrastinatorText variant="caption" className="block mt-0.5">
                {task.description}
              </ProcrastinatorText>
            )}

            <ProcrastinatorBox className="text-xs text-[#94A3B8] flex items-center gap-2 mt-1 flex-wrap">
              <span>{task.estimatedMinutes} min</span>
              <span>•</span>
              <span>Dificultad: {task.difficulty}</span>
              {subs.length > 0 && (
                <>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedTaskIds(prev => ({ ...prev, [task.id]: !prev[task.id] }))
                    }
                    className="inline-flex items-center gap-1 text-[#2563EB] hover:underline font-medium"
                  >
                    <ListChecks className="w-3.5 h-3.5" />
                    <span>
                      Subtareas {doneSubs}/{subs.length}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </button>
                </>
              )}
              {task.deferredCount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-[#D97706]">Pospuesta {task.deferredCount}x</span>
                </>
              )}
            </ProcrastinatorBox>
          </ProcrastinatorBox>

          <ProcrastinatorBox className="flex items-center gap-1.5 self-end sm:self-auto flex-shrink-0">
            {subs.length === 0 && (
              <ProcrastinatorButton
                variant="ghost"
                onClick={() => handleBreakdownExistingTask(task.id)}
                disabled={breakingDownTaskId === task.id}
                title="Desglosar qué hay que hacer en subtareas con IA"
                className="text-xs text-[#2563EB]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{breakingDownTaskId === task.id ? 'Desglosando...' : 'Desglosar'}</span>
              </ProcrastinatorButton>
            )}

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

        {/* Lista desplegable de subtareas persistentes */}
        {isExpanded && subs.length > 0 && (
          <div className="pl-2 space-y-1 pt-1">
            {subs.map(sub => (
              <div
                key={sub.id}
                onClick={() => handleToggleBacklogSubtask(task, sub.id)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                  sub.done
                    ? 'bg-[#DCFCE7] border-[#BBF7D0] text-[#15803D]'
                    : 'bg-white border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#334155]'
                }`}
              >
                {sub.done ? (
                  <CheckSquare className="w-3.5 h-3.5 text-[#16A34A] flex-shrink-0" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-[#94A3B8] flex-shrink-0" />
                )}
                <span className={sub.done ? 'line-through' : ''}>{sub.title}</span>
              </div>
            ))}
          </div>
        )}
      </ProcrastinatorBox>
    );
  };

  return (
    <ProcrastinatorBox className="space-y-6 animate-fadeIn">
      {/* Header */}
      <ProcrastinatorBox className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <ProcrastinatorBox>
          <ProcrastinatorText variant="h1">Proyectos & Backlog</ProcrastinatorText>
          <ProcrastinatorText variant="caption">
            Planifica proyectos por épicas, tareas y subtareas estilo Jira para alimentar tu objetivo diario.
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

      {/* PANEL INTEGRADO: PLANIFICADOR DE NUEVO PROYECTO (Diseño 100% plano) */}
      {showNewProjectPanel && (
        <ProcrastinatorBox variant="panel" className="animate-fadeIn">
          <ProcrastinatorBox className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <ProcrastinatorBox className="flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-[#2563EB]" />
              <ProcrastinatorText variant="h2">
                {projectStep === 1
                  ? 'Planificador de Nuevo Proyecto'
                  : `Arquitectura & Backlog: ${newProjName}`}
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

          {/* PASO 1: Briefing técnico + Alcance (la meta de horas la calcula el PM) */}
          {projectStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <ProcrastinatorInput
                    label="Nombre del Proyecto"
                    type="text"
                    placeholder="Ej. Plataforma de Reservas, SaaS Facturación..."
                    value={newProjName}
                    onChange={e => setNewProjName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <ProcrastinatorInput
                    label="Stack / Tecnologías (opcional)"
                    type="text"
                    placeholder="Ej. FastAPI, React, SQLite, Stripe..."
                    value={newProjStack}
                    onChange={e => setNewProjStack(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className={styles.input.label}>Descripción y funcionalidades clave</label>
                <textarea
                  placeholder="Explica módulos, usuarios, integraciones, pantallas o requisitos clave. Cuanto más detalle des, mejor dividirá el PM las épicas y subtareas..."
                  value={newProjDesc}
                  onChange={e => setNewProjDesc(e.target.value)}
                  rows={4}
                  className={styles.input.base}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <ProcrastinatorInput
                    label="Repo GitHub o ruta local (opcional)"
                    type="text"
                    placeholder="https://github.com/usuario/repo"
                    value={newProjRepoUrl}
                    onChange={e => setNewProjRepoUrl(e.target.value)}
                  />
                </div>
                <div>
                  <label className={styles.input.label}>Nivel de Desglose del PM</label>
                  <select
                    value={newProjScope}
                    onChange={e => setNewProjScope(e.target.value as PlanScope)}
                    className={styles.input.select}
                  >
                    <option value="mvp">MVP Enfocado (6-11 tareas esenciales)</option>
                    <option value="standard">Completo por Módulos (10-18 tareas + subtareas)</option>
                    <option value="detailed">Detallado estilo Jira (15-25 tickets + subtareas)</option>
                  </select>
                </div>
              </div>

              <ProcrastinatorBox variant="subtle" className="py-2.5 px-3 text-xs text-[#475569]">
                <span className="font-semibold text-[#0F172A]">Meta estimada automáticamente por el PM:</span>{' '}
                <span>Las horas objetivo se calcularán al desglosar las épicas, tareas y tu velocidad histórica. Si vinculas un repo GitHub, la Guía Técnica leerá tus archivos reales.</span>
              </ProcrastinatorBox>

              <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between flex-wrap gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!newProjName.trim()) return;
                    await api.createProject({
                      name: newProjName.trim(),
                      description: newProjDesc.trim(),
                      color: '#2563EB',
                      targetHours: 0,
                      repoUrl: newProjRepoUrl.trim(),
                      status: 'active'
                    });
                    setNewProjName('');
                    setNewProjDesc('');
                    setNewProjStack('');
                    setNewProjRepoUrl('');
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
                    <span>
                      {isGeneratingRoadmap
                        ? 'Planificando módulos y subtareas...'
                        : 'Planificar Épicas y Tareas con PM'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </ProcrastinatorButton>
                </div>
              </div>
            </div>
          )}

          {/* PASO 2: Tablero Jira-style agrupado por Épicas con Subtareas editables */}
          {projectStep === 2 && (
            <div className="space-y-4">
              {/* Barra resumen del plan */}
              <ProcrastinatorBox
                variant="subtle"
                className="flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <ProcrastinatorBadge variant="primary">
                    {proposedEpicGroups.length} Épicas / Módulos
                  </ProcrastinatorBadge>
                  <span className="text-[#334155]">
                    <strong>{proposedTasks.length}</strong> tareas •{' '}
                    <strong>{totalProposedSubs}</strong> subtareas
                  </span>
                  <span className="text-[#64748B]">
                    Meta calculada por el PM: <strong>{(totalProposedMins / 60).toFixed(1)}h</strong> ({totalProposedMins} min)
                  </span>
                </div>

                <ProcrastinatorButton
                  type="button"
                  variant="secondary"
                  onClick={() => handleAddManualProposedTask('Módulo Manual')}
                  className="text-xs py-1 px-2.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir tarea</span>
                </ProcrastinatorButton>
              </ProcrastinatorBox>

              {/* Épicas y Tareas propuestas */}
              <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
                {proposedEpicGroups.map(([epicName, epicTasks]) => (
                  <ProcrastinatorBox key={epicName} variant="epic-section">
                    <ProcrastinatorBox variant="epic-header">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#2563EB]" />
                        <span className="text-xs font-bold text-[#0F172A]">{epicName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
                        <span>{epicTasks.length} tareas</span>
                        <span>•</span>
                        <span>{epicTasks.reduce((s, t) => s + t.estimatedMinutes, 0)}m</span>
                      </div>
                    </ProcrastinatorBox>

                    <div className="divide-y divide-[#F1F5F9]">
                      {epicTasks.map(t => {
                        const isExpanded = Boolean(expandedProposedIds[t.id]);
                        const subs = t.subtasks || [];

                        return (
                          <div key={t.id} className="p-3 bg-white space-y-2 text-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedProposedIds(prev => ({ ...prev, [t.id]: !prev[t.id] }))
                                  }
                                  className="text-[#64748B] hover:text-[#0F172A] p-0.5"
                                  title="Ver/editar subtareas y descripción"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </button>
                                <input
                                  type="text"
                                  value={t.title}
                                  onChange={e =>
                                    handleUpdateProposedTask(t.id, 'title', e.target.value)
                                  }
                                  className="flex-1 bg-transparent border-b border-transparent hover:border-[#CBD5E1] focus:border-[#2563EB] focus:outline-none font-medium text-[#0F172A] px-1 py-0.5"
                                />
                              </div>

                              <div className="flex items-center gap-1.5 flex-shrink-0 pl-6 sm:pl-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedProposedIds(prev => ({ ...prev, [t.id]: !prev[t.id] }))
                                  }
                                  className="px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0] text-[11px]"
                                >
                                  {subs.length} subtareas
                                </button>
                                <select
                                  value={t.priority}
                                  onChange={e =>
                                    handleUpdateProposedTask(t.id, 'priority', e.target.value)
                                  }
                                  className="bg-[#F8FAFC] border border-[#E2E8F0] rounded px-1.5 py-0.5 text-[11px]"
                                >
                                  <option value="urgent">urgent</option>
                                  <option value="high">high</option>
                                  <option value="medium">medium</option>
                                  <option value="low">low</option>
                                </select>
                                <input
                                  type="number"
                                  value={t.estimatedMinutes}
                                  onChange={e =>
                                    handleUpdateProposedTask(
                                      t.id,
                                      'estimatedMinutes',
                                      Number(e.target.value)
                                    )
                                  }
                                  className="w-12 bg-[#F1F5F9] border border-[#E2E8F0] rounded px-1 py-0.5 text-center font-mono"
                                  title="Minutos"
                                />
                                <span className="text-[#94A3B8]">m</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProposedTask(t.id)}
                                  className="p-1 text-[#94A3B8] hover:text-[#DC2626] rounded transition-colors"
                                  title="Quitar tarea"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="pl-6 space-y-2 pt-1">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <input
                                    type="text"
                                    value={t.epic}
                                    onChange={e =>
                                      handleUpdateProposedTask(t.id, 'epic', e.target.value)
                                    }
                                    placeholder="Nombre de Épica"
                                    className="bg-[#F8FAFC] border border-[#E2E8F0] rounded px-2 py-1 text-[11px] text-[#334155]"
                                  />
                                  <input
                                    type="text"
                                    value={t.description}
                                    onChange={e =>
                                      handleUpdateProposedTask(t.id, 'description', e.target.value)
                                    }
                                    placeholder="Criterio de aceptación / detalle..."
                                    className="sm:col-span-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded px-2 py-1 text-[11px] text-[#334155]"
                                  />
                                </div>

                                {/* Subtareas */}
                                <div className="space-y-1">
                                  {subs.map(st => (
                                    <div
                                      key={st.id}
                                      className="flex items-center justify-between gap-2 px-2 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded text-[11px]"
                                    >
                                      <span className="text-[#334155]">• {st.title}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveSubtaskFromProposed(t.id, st.id)}
                                        className="text-[#94A3B8] hover:text-[#DC2626]"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ))}
                                  <div className="flex gap-1.5 pt-1">
                                    <input
                                      type="text"
                                      placeholder="Añadir subtarea concreta..."
                                      value={newSubtaskDrafts[t.id] || ''}
                                      onChange={e =>
                                        setNewSubtaskDrafts(prev => ({
                                          ...prev,
                                          [t.id]: e.target.value
                                        }))
                                      }
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleAddSubtaskToProposed(t.id);
                                        }
                                      }}
                                      className="flex-1 bg-white border border-[#E2E8F0] rounded px-2 py-1 text-[11px]"
                                    />
                                    <ProcrastinatorButton
                                      type="button"
                                      variant="secondary"
                                      onClick={() => handleAddSubtaskToProposed(t.id)}
                                      className="text-[11px] py-1 px-2"
                                    >
                                      + Paso
                                    </ProcrastinatorButton>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ProcrastinatorBox>
                ))}
              </div>

              {/* Mini Chat con el PM para afinar el desglose */}
              <div className="border border-[#E2E8F0] rounded-xl p-3 bg-white space-y-2">
                <div className="text-xs font-semibold text-[#0F172A] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                  Conversar con el PM para ajustar épicas o tareas:
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
                    <div className="text-xs text-[#64748B] italic">Ajustando el plan con el PM...</div>
                  )}
                </div>

                <form onSubmit={handleRefineRoadmap} className="flex gap-2">
                  <ProcrastinatorInput
                    type="text"
                    placeholder="Ej: 'Añade módulo de notificaciones email', 'Máximo 30 min por tarea', 'Quita pagos'..."
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
                  disabled={proposedTasks.length === 0 || isCommittingPlan}
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isCommittingPlan
                      ? 'Guardando en Backlog...'
                      : `Crear Proyecto y Guardar ${proposedTasks.length} Tareas`}
                  </span>
                </ProcrastinatorButton>
              </div>
            </div>
          )}
        </ProcrastinatorBox>
      )}

      {/* PANEL INTEGRADO: NUEVA TAREA */}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={styles.input.label}>Proyecto</label>
                <select
                  value={taskProject}
                  onChange={e => setTaskProject(e.target.value)}
                  className={styles.input.select}
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <ProcrastinatorInput
                  label="Épica / Módulo"
                  type="text"
                  placeholder="Ej. Backend API, Frontend UI, Auth..."
                  value={taskEpic}
                  onChange={e => setTaskEpic(e.target.value)}
                />
              </div>
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
                    <span>
                      Tiempo según tu velocidad: <strong>{evaluation.estimatedMinutes} min</strong>
                    </span>
                    <span className="mx-2">•</span>
                    <span>
                      Prioridad: <strong className="capitalize">{evaluation.suggestedPriority}</strong>
                    </span>
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
          const totalEstimatedMins =
            projTasks.reduce((s, t) => s + t.estimatedMinutes, 0) ||
            (proj.targetHours ? proj.targetHours * 60 : 60);
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
                <ProcrastinatorText variant="h3" className="truncate">
                  {proj.name}
                </ProcrastinatorText>
                <ProcrastinatorBadge variant="neutral">
                  {completedCount}/{projTasks.length} hechas
                </ProcrastinatorBadge>
              </ProcrastinatorBox>

              <ProcrastinatorText variant="caption" className="line-clamp-2 h-8 mb-3 block">
                {proj.description || 'Sin descripción'}
              </ProcrastinatorText>

              {proj.repoUrl && (
                <div className="mb-2.5 flex items-center gap-1.5 text-[11px] text-[#2563EB] truncate">
                  <GitBranch className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{proj.repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//i, '')}</span>
                </div>
              )}

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

      {/* Panel de Repositorio GitHub del proyecto seleccionado */}
      {selectedProject && (
        <ProcrastinatorBox variant="card" className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-[#2563EB]" />
              <ProcrastinatorText variant="h3">
                Repositorio vinculado a {selectedProject.name}
              </ProcrastinatorText>
            </div>
            <ProcrastinatorText variant="caption">
              La Guía Técnica leerá tus archivos reales para darte respuestas exactas.
            </ProcrastinatorText>
          </div>

          <form onSubmit={handleSaveProjectRepo} className="flex flex-col sm:flex-row gap-2">
            <ProcrastinatorInput
              type="text"
              placeholder="https://github.com/usuario/repo (o ruta local)"
              value={repoDraft}
              onChange={e => setRepoDraft(e.target.value)}
            />
            <div className="flex items-center gap-2 flex-shrink-0">
              <ProcrastinatorButton
                type="submit"
                variant="primary"
                disabled={savingRepo}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>{savingRepo ? 'Guardando...' : 'Guardar Repo'}</span>
              </ProcrastinatorButton>
              {selectedProject.repoUrl && (
                <ProcrastinatorButton
                  type="button"
                  variant="secondary"
                  onClick={handleCheckRepoPreview}
                  disabled={checkingRepo}
                >
                  <span>{checkingRepo ? 'Leyendo...' : 'Comprobar'}</span>
                </ProcrastinatorButton>
              )}
            </div>
          </form>

          {repoPreview && (
            <ProcrastinatorBox variant="subtle" className="text-xs space-y-1.5">
              {repoPreview.connected ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <ProcrastinatorBadge variant="success">Conectado: {repoPreview.repoLabel}</ProcrastinatorBadge>
                    {repoPreview.defaultBranch && (
                      <span className="text-[#475569]">Rama: <strong>{repoPreview.defaultBranch}</strong></span>
                    )}
                    {repoPreview.language && (
                      <span className="text-[#475569]">Lenguaje: <strong>{repoPreview.language}</strong></span>
                    )}
                    <span className="text-[#475569]"><strong>{repoPreview.filesCount}</strong> archivos indexados</span>
                  </div>
                  {repoPreview.sampleFiles.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {repoPreview.sampleFiles.slice(0, 8).map(f => (
                        <span key={f} className="px-1.5 py-0.5 bg-white border border-[#E2E8F0] rounded font-mono text-[10px] text-[#334155]">
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-[#DC2626]">{repoPreview.error || 'No se pudo conectar al repositorio.'}</div>
              )}
            </ProcrastinatorBox>
          )}
        </ProcrastinatorBox>
      )}

      {/* Lista del Backlog */}
      <ProcrastinatorBox variant="card">
        <ProcrastinatorBox className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
          {/* Filtros de proyectos */}
          <ProcrastinatorBox className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedProjectId('all')}
              className={
                selectedProjectId === 'all' ? styles.button.tabActive : styles.button.tabInactive
              }
            >
              Todos ({tasks.length})
            </button>
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProjectId(p.id)}
                className={
                  selectedProjectId === p.id ? styles.button.tabActive : styles.button.tabInactive
                }
              >
                {p.name}
              </button>
            ))}
          </ProcrastinatorBox>

          <ProcrastinatorBox className="flex items-center gap-3 flex-wrap">
            {/* Selector de vista Por Épica vs Lista */}
            <div className="flex items-center gap-1 bg-[#F1F5F9] p-0.5 rounded-lg border border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setBacklogGroupMode('epic')}
                className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors ${
                  backlogGroupMode === 'epic'
                    ? 'bg-white text-[#0F172A] border border-[#E2E8F0]'
                    : 'text-[#64748B]'
                }`}
              >
                Por Épica
              </button>
              <button
                type="button"
                onClick={() => setBacklogGroupMode('flat')}
                className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors ${
                  backlogGroupMode === 'flat'
                    ? 'bg-white text-[#0F172A] border border-[#E2E8F0]'
                    : 'text-[#64748B]'
                }`}
              >
                Lista
              </button>
            </div>

            <div className="text-xs text-[#64748B] flex items-center gap-2">
              <span>
                Backlog: <strong>{backlogTasks.length}</strong>
              </span>
              <span>•</span>
              <span>
                Hoy: <strong>{scheduledTasks.length}</strong>
              </span>
              <span>•</span>
              <span>
                Hechas: <strong>{completedTasks.length}</strong>
              </span>
            </div>
          </ProcrastinatorBox>
        </ProcrastinatorBox>

        {/* Tareas */}
        {backlogTasks.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#94A3B8]">
            No hay tareas en el backlog para este filtro.
          </div>
        ) : backlogGroupMode === 'epic' ? (
          <div className="space-y-4 mt-4">
            {backlogEpicGroups.map(([epicName, epicTasks]) => (
              <ProcrastinatorBox key={epicName} variant="epic-section">
                <ProcrastinatorBox variant="epic-header">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#2563EB]" />
                    <span className="text-xs font-bold text-[#0F172A]">{epicName}</span>
                  </div>
                  <span className="text-[11px] text-[#64748B]">
                    {epicTasks.length} tareas • {epicTasks.reduce((s, t) => s + t.estimatedMinutes, 0)}m
                  </span>
                </ProcrastinatorBox>
                <div className="divide-y divide-[#F1F5F9]">
                  {epicTasks.map(renderBacklogTaskRow)}
                </div>
              </ProcrastinatorBox>
            ))}
          </div>
        ) : (
          <ProcrastinatorBox className="divide-y divide-[#F1F5F9] mt-2">
            {backlogTasks.map(renderBacklogTaskRow)}
          </ProcrastinatorBox>
        )}
      </ProcrastinatorBox>
    </ProcrastinatorBox>
  );
};
