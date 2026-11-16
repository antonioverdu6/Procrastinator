import React, { useState } from 'react';
import { Project } from '../../types';
import { api } from '../../services/api';
import { ProcrastinatorModal } from '../ProcrastinatorModal';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorButton } from '../ProcrastinatorButton';
import { ProcrastinatorInput } from '../ProcrastinatorInput';
import { styles } from '../../style';

interface DailyQuickTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onTaskCreated: () => void;
}

export const DailyQuickTaskModal: React.FC<DailyQuickTaskModalProps> = ({
  isOpen,
  onClose,
  projects,
  onTaskCreated
}) => {
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState(30);
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      await api.createTask({
        projectId: projectId || projects[0]?.id || 'default',
        title: title.trim(),
        estimatedMinutes: minutes,
        priority: 'high',
        difficulty: 'medium',
        status: 'scheduled_today',
        scheduledDate: todayStr
      });

      setTitle('');
      setMinutes(30);
      onTaskCreated();
      onClose();
    } catch (err) {
      console.error('Error creando tarea rápida para hoy:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProcrastinatorModal
      isOpen={isOpen}
      onClose={onClose}
      title="Añadir Tarea para Hoy"
      size="sm"
      shadow="no"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={styles.input.label}>Proyecto</label>
          <select
            value={projectId || projects[0]?.id || ''}
            onChange={e => setProjectId(e.target.value)}
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
            label="Qué vas a hacer ahora"
            placeholder="Ej. Arreglar endpoint de login..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div>
          <label className={styles.input.label}>Tiempo estimado (micro-bloque)</label>
          <select
            value={minutes}
            onChange={e => setMinutes(Number(e.target.value))}
            className={styles.input.select}
          >
            <option value={15}>15 minutos</option>
            <option value={30}>30 minutos (recomendado)</option>
            <option value={45}>45 minutos</option>
            <option value={60}>60 minutos</option>
          </select>
        </div>

        <ProcrastinatorBox variant="row-end" className="pt-3 border-t border-[#E2E8F0]">
          <ProcrastinatorButton
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            Cancelar
          </ProcrastinatorButton>
          <ProcrastinatorButton
            type="submit"
            variant="primary"
            disabled={!title.trim() || isSubmitting}
          >
            {isSubmitting ? 'Añadiendo...' : 'Añadir a Hoy'}
          </ProcrastinatorButton>
        </ProcrastinatorBox>
      </form>
    </ProcrastinatorModal>
  );
};
