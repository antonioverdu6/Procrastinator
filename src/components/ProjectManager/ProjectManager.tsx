import React, { useState } from 'react';
import { Project, Task, Priority, Difficulty } from '../../types';
import { StorageService, getTodayDateString } from '../../services/storageService';
import { FolderKanban, Plus, Trash2, ArrowUpRight } from 'lucide-react';
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

  // States para nuevo proyecto
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjHours, setNewProjHours] = useState(25);

  // States para nueva tarea
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskProject, setTaskProject] = useState(projects[0]?.id || '');
  const [taskMinutes, setTaskMinutes] = useState(45);
  const [taskPriority, setTaskPriority] = useState<Priority>('medium');
  const [taskDifficulty, setTaskDifficulty] = useState<Difficulty>('medium');

  const today = getTodayDateString();

  const filteredTasks = tasks.filter(t => {
    if (selectedProjectId === 'all') return true;
    return t.projectId === selectedProjectId;
  });

  const backlogTasks = filteredTasks.filter(t => t.status === 'backlog');
  const scheduledTasks = filteredTasks.filter(t => t.status === 'scheduled_today' || t.status === 'in_progress');
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
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

    StorageService.saveProjects([...projects, newProject]);
    setNewProjName('');
    setNewProjDesc('');
    setShowNewProjectModal(false);
    onRefreshData();
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
    setShowNewTaskModal(false);
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

  const getProject = (id: string) => projects.find(p => p.id === id);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={styles.typography.h1}>Proyectos & Backlog</h2>
          <p className={styles.typography.caption}>
            Desglosa tus aplicaciones en micro-tareas para alimentar tu objetivo diario.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewProjectModal(true)}
            className={styles.button.secondary}
          >
            <FolderKanban className="w-4 h-4 text-[#2563EB]" /> Nuevo Proyecto
          </button>
          <button
            onClick={() => setShowNewTaskModal(true)}
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

      {/* Modal Nuevo Proyecto */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h3 className={styles.typography.h2}>Nuevo Proyecto</h3>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className={styles.input.label}>Nombre</label>
                <input
                  type="text"
                  placeholder="Ej. API Backend NestJS..."
                  value={newProjName}
                  onChange={e => setNewProjName(e.target.value)}
                  className={styles.input.base}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className={styles.input.label}>Descripción</label>
                <textarea
                  placeholder="Objetivo del proyecto..."
                  value={newProjDesc}
                  onChange={e => setNewProjDesc(e.target.value)}
                  rows={2}
                  className={styles.input.base}
                />
              </div>

              <div>
                <label className={styles.input.label}>Meta de Horas Estimada</label>
                <input
                  type="number"
                  value={newProjHours}
                  onChange={e => setNewProjHours(Number(e.target.value))}
                  min={1}
                  max={500}
                  className={styles.input.base}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className={styles.button.ghost}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.button.primary}>
                  Guardar Proyecto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nueva Tarea */}
      {showNewTaskModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h3 className={styles.typography.h2}>Nueva Micro-Tarea</h3>

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
                <input
                  type="text"
                  placeholder="Ej. Diseñar esquema de base de datos..."
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  className={styles.input.base}
                  required
                  autoFocus
                />
              </div>

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
                  Añadir al Backlog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
