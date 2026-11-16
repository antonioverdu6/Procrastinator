import React, { useEffect } from 'react';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorText } from '../ProcrastinatorText';

export interface ProcrastinatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'wide';
  shadow?: 'yes' | 'no' | 'soft';
  children: React.ReactNode;
}

/**
 * Componente modal / popover armonizado de Procrastinator.
 * Controlado totalmente por propiedades tipadas (size, shadow, title, icon).
 * Por defecto no incluye sombras agresivas (shadow="no"), garantizando bordes nítidos.
 */
export const ProcrastinatorModal: React.FC<ProcrastinatorModalProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  size = 'md',
  shadow = 'no',
  children
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cardVariant =
    size === 'wide'
      ? 'modal-card-wide'
      : size === 'sm'
      ? 'modal-card-sm'
      : 'modal-card';

  return (
    <ProcrastinatorBox variant="modal-overlay" onClick={onClose}>
      <ProcrastinatorBox
        variant={cardVariant}
        shadow={shadow}
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera uniforme */}
        <ProcrastinatorBox variant="row-between" border="subtle" padding="none" className="pb-3 border-b">
          <ProcrastinatorBox variant="row">
            {icon}
            <ProcrastinatorText variant="h2">{title}</ProcrastinatorText>
          </ProcrastinatorBox>
          <button
            onClick={onClose}
            className="text-[#94A3B8] hover:text-[#0F172A] p-1 rounded-lg text-sm transition-colors"
            title="Cerrar (Esc)"
          >
            ✕
          </button>
        </ProcrastinatorBox>

        {/* Contenido */}
        {children}
      </ProcrastinatorBox>
    </ProcrastinatorBox>
  );
};
