import React, { useState } from 'react';
import { Project, Task } from '../../types';
import { api } from '../../services/api';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorButton } from '../ProcrastinatorButton';
import { ProcrastinatorText } from '../ProcrastinatorText';
import { ProjectCard } from '../ProjectCard';
import { ProjectBacklog } from '../ProjectBacklog';
import { NewTaskModal } from '../NewTaskModal';
import { NewProjectWizard } from '../NewProjectWizard';
import { FolderKanban, Plus } from 'lucide-react';

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

  const today = new Date().toISOString().split('T')[0];

  const handleMoveToToday = async (taskId: string) => {
    try {
      await api.updateTask(taskId, {
        status: 'scheduled_today',
        scheduledDate: today
      });
      onRefreshData();
    } catch (err) {
      console.error('Error moviendo tarea a hoy:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await api.deleteTask(taskId);
      onRefreshData();
    } catch (err) {
      console.error('Error eliminando tarea:', err);
    }
  };

  return (
    <ProcrastinatorBox variant="page">
      {/* Header */}
      <ProcrastinatorBox variant="header">
        <ProcrastinatorBox variant="stack-sm">
          <ProcrastinatorText variant="h1">Proyectos & Backlog</ProcrastinatorText>
          <ProcrastinatorText variant="caption">
            Desglosa tus aplicaciones en micro-tareas evaluadas por el PM para alimentar tu objetivo diario.
          </ProcrastinatorText>
        </ProcrastinatorBox>

        <ProcrastinatorBox variant="row">
          <ProcrastinatorButton
            variant="secondary"
            onClick={() => setShowNewProjectModal(true)}
          >
            <FolderKanban className="w-4 h-4 text-[#2563EB]" /> Nuevo Proyecto
          </ProcrastinatorButton>
          <ProcrastinatorButton
            variant="primary"
            onClick={() => setShowNewTaskModal(true)}
          >
            <Plus className="w-4 h-4" /> Nueva Tarea
          </ProcrastinatorButton>
        </ProcrastinatorBox>
      </ProcrastinatorBox>

      {/* Grid de Proyectos */}
      <ProcrastinatorBox variant="grid-3">
        {projects.map(proj => (
          <ProjectCard
            key={proj.id}
            project={proj}
            tasks={tasks}
            isSelected={selectedProjectId === proj.id}
            onSelect={() => setSelectedProjectId(selectedProjectId === proj.id ? 'all' : proj.id)}
          />
        ))}
      </ProcrastinatorBox>

      {/* Lista del Backlog */}
      <ProjectBacklog
        tasks={tasks}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
        onMoveToToday={handleMoveToToday}
        onDeleteTask={handleDeleteTask}
      />

      {/* Modal 1: Nueva Tarea con Evaluador del PM */}
      <NewTaskModal
        isOpen={showNewTaskModal}
        onClose={() => setShowNewTaskModal(false)}
        projects={projects}
        onTaskCreated={onRefreshData}
        initialProjectId={selectedProjectId !== 'all' ? selectedProjectId : projects[0]?.id}
      />

      {/* Modal 2: Nuevo Proyecto con Asistente de Desglose y Conversación */}
      <NewProjectWizard
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        onProjectCreated={onRefreshData}
      />
    </ProcrastinatorBox>
  );
};
