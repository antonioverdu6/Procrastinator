import React from 'react';
import { Project, Priority, Difficulty } from '../../types';
import { useTaskEvaluation } from '../../hooks';
import { ProcrastinatorModal } from '../ProcrastinatorModal';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorButton } from '../ProcrastinatorButton';
import { ProcrastinatorBadge } from '../ProcrastinatorBadge';
import { ProcrastinatorInput } from '../ProcrastinatorInput';
import { Sparkles } from 'lucide-react';
import { styles } from '../../style';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onTaskCreated: () => void;
  initialProjectId?: string;
}

export const NewTaskModal: React.FC<NewTaskModalProps> = ({
  isOpen,
  onClose,
  projects,
  onTaskCreated,
  initialProjectId
}) => {
  const {
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
    isEvaluating,
    isSubmitting,
    evaluateWithPM,
    applySuggestions,
    submitTask,
    resetForm
  } = useTaskEvaluation({
    defaultProjectId: initialProjectId || projects[0]?.id || '',
    onTaskCreated: () => {
      onTaskCreated();
      onClose();
    }
  });

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <ProcrastinatorModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Nueva Tarea con Revisión del PM"
      size="md"
      shadow="no"
    >
      <form onSubmit={submitTask} className="space-y-4">
        <div>
          <label className={styles.input.label}>Proyecto</label>
          <select
            value={taskProject || projects[0]?.id || ''}
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
          <label className={styles.input.label}>Título de la Tarea</label>
          <ProcrastinatorBox variant="row">
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
              onClick={evaluateWithPM}
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

        {/* Tarjeta de Veredicto del PM */}
        {evaluation && (
          <ProcrastinatorBox variant="subtle" className="space-y-2 text-xs">
            <ProcrastinatorBox variant="row-between">
              <span className="font-bold text-[#0F172A] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                Dictamen del PM
              </span>
              <ProcrastinatorBadge variant={evaluation.isUseful ? 'success' : 'warning'}>
                {evaluation.isUseful ? '✅ Aporta Valor Real' : '⚠️ Riesgo de Distracción'}
              </ProcrastinatorBadge>
            </ProcrastinatorBox>

            <p className="text-[#475569] leading-relaxed">{evaluation.verdict}</p>

            <ProcrastinatorBox variant="row-between" className="pt-2 border-t border-[#E2E8F0] text-slate-600">
              <div>
                <span>Tiempo según tu velocidad: <strong>{evaluation.estimatedMinutes} min</strong></span>
                <span className="mx-2">•</span>
                <span>Prioridad: <strong className="capitalize">{evaluation.suggestedPriority}</strong></span>
              </div>

              <button
                type="button"
                onClick={applySuggestions}
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

        <ProcrastinatorBox variant="row-end" className="pt-3 border-t border-[#E2E8F0]">
          <ProcrastinatorButton
            type="button"
            variant="ghost"
            onClick={handleClose}
          >
            Cancelar
          </ProcrastinatorButton>
          <ProcrastinatorButton
            variant="primary"
            type="submit"
            disabled={!taskTitle.trim() || isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar Tarea'}
          </ProcrastinatorButton>
        </ProcrastinatorBox>
      </form>
    </ProcrastinatorModal>
  );
};
