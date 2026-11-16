import React, { useEffect } from 'react';
import { ProcrastinatorText } from '../ProcrastinatorText';
import { X } from 'lucide-react';
import { styles } from '../../style';

export interface ProcrastinatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  shadow?: 'no' | 'soft' | 'yes';
  children: React.ReactNode;
}

/**
 * Componente modal estándar de Procrastinator.
 * Diseño 100% plano sin sombras, bordes nítidos (#CBD5E1) y fondo translúcido suave sin oscurecimiento invasivo.
 */
export const ProcrastinatorModal: React.FC<ProcrastinatorModalProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  size = 'md',
  children,
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

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }[size] || 'max-w-lg';

  return (
    <div
      className={styles.box.modalOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`w-full ${sizeClasses} bg-white border border-[#CBD5E1] rounded-xl p-6 max-h-[90vh] overflow-y-auto space-y-4`}
      >
        {title && (
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              {icon}
              <ProcrastinatorText variant="h2">{title}</ProcrastinatorText>
            </div>
            <button
              onClick={onClose}
              className="text-[#94A3B8] hover:text-[#0F172A] p-1 rounded-lg transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};
