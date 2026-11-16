import React from 'react';
import { useProjectRoadmap } from '../../hooks';
import { ProcrastinatorModal } from '../ProcrastinatorModal';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorButton } from '../ProcrastinatorButton';
import { ProcrastinatorInput } from '../ProcrastinatorInput';
import { FolderKanban, Sparkles, Send, Check, ArrowRight } from 'lucide-react';
import { styles } from '../../style';

interface NewProjectWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: () => void;
}

export const NewProjectWizard: React.FC<NewProjectWizardProps> = ({
  isOpen,
  onClose,
  onProjectCreated
}) => {
  const {
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
  } = useProjectRoadmap({
    onSuccess: () => {
      onProjectCreated();
      onClose();
    }
  });

  const handleClose = () => {
    resetWizard();
    onClose();
  };

  const title = projectStep === 1 ? 'Nuevo Proyecto' : `Desglose & Ajuste: ${newProjName}`;

  return (
    <ProcrastinatorModal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      icon={<FolderKanban className="w-5 h-5 text-[#2563EB]" />}
      size="wide"
      shadow="no"
    >
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

          <ProcrastinatorBox variant="row-between" className="pt-3 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={createEmptyProject}
              disabled={!newProjName.trim() || isSaving}
              className="text-xs text-[#64748B] hover:text-[#0F172A] hover:underline"
            >
              Crear vacío sin tareas
            </button>

            <ProcrastinatorButton
              type="button"
              variant="primary"
              onClick={startRoadmap}
              disabled={!newProjName.trim() || isGeneratingRoadmap}
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isGeneratingRoadmap
                  ? 'Desglosando proyecto con IA...'
                  : 'Desglosar y Planificar Tareas con PM'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </ProcrastinatorButton>
          </ProcrastinatorBox>
        </div>
      )}

      {/* PASO 2: Lista de tareas propuestas con edición directa y chat conversacional */}
      {projectStep === 2 && (
        <div className="space-y-4">
          <ProcrastinatorBox variant="row-between" className="text-xs text-[#64748B]">
            <span>
              El PM propone <strong>{proposedTasks.length} micro-tareas</strong>. Puedes editarlas o conversar para modificarlas:
            </span>
          </ProcrastinatorBox>

          {/* Lista de tareas propuestas (editables directamente) */}
          <div className="space-y-2 max-h-56 overflow-y-auto border border-[#E2E8F0] rounded-xl p-2 bg-[#F8FAFC]">
            {proposedTasks.map((t, idx) => (
              <div
                key={t.id}
                className="p-2.5 bg-white border border-[#E2E8F0] rounded-lg flex items-center justify-between gap-2 text-xs"
              >
                <span className="font-mono text-[#94A3B8] font-bold">{idx + 1}.</span>
                <input
                  type="text"
                  value={t.title}
                  onChange={e => updateProposedTask(t.id, 'title', e.target.value)}
                  className="flex-1 bg-transparent border-b border-transparent hover:border-[#CBD5E1] focus:border-[#2563EB] focus:outline-none font-medium text-[#0F172A] px-1 py-0.5"
                />
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <input
                    type="number"
                    value={t.estimatedMinutes}
                    onChange={e => updateProposedTask(t.id, 'estimatedMinutes', Number(e.target.value))}
                    className="w-14 bg-[#F1F5F9] border border-[#E2E8F0] rounded px-1.5 py-0.5 text-center font-mono"
                    title="Minutos"
                  />
                  <span className="text-[#94A3B8]">m</span>
                  <button
                    onClick={() => deleteProposedTask(t.id)}
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

            <form onSubmit={refineWithPM} className="flex gap-2">
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

          <ProcrastinatorBox variant="row-between" className="pt-3 border-t border-[#E2E8F0]">
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
              onClick={confirmProject}
              disabled={proposedTasks.length === 0 || isSaving}
            >
              <Check className="w-4 h-4" />
              <span>
                {isSaving
                  ? 'Creando...'
                  : `Crear Proyecto y Guardar ${proposedTasks.length} Tareas`}
              </span>
            </ProcrastinatorButton>
          </ProcrastinatorBox>
        </div>
      )}
    </ProcrastinatorModal>
  );
};
