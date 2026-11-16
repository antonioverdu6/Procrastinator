import React, { forwardRef } from 'react';
import { styles } from '../../style';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'success' | 'danger';

export interface ProcrastinatorButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

/**
 * Botón estático del sistema de diseño de Procrastinator.
 */
export const ProcrastinatorButton = forwardRef<HTMLButtonElement, ProcrastinatorButtonProps>(
  ({ variant = 'secondary', className = '', children, ...props }, ref) => {
    let variantClass = styles.button.secondary;

    switch (variant) {
      case 'primary':
        variantClass = styles.button.primary;
        break;
      case 'ghost':
        variantClass = styles.button.ghost;
        break;
      case 'success':
        variantClass = styles.button.success;
        break;
      case 'danger':
        variantClass = styles.button.danger;
        break;
      default:
        variantClass = styles.button.secondary;
        break;
    }

    return (
      <button
        ref={ref}
        className={`${variantClass} ${className}`.trim()}
        {...props}
      >
        {children}
      </button>
    );
  }
);

ProcrastinatorButton.displayName = 'ProcrastinatorButton';
