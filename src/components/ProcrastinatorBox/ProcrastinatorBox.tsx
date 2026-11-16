import React, { forwardRef } from 'react';
import { styles } from '../../style';

export type BoxVariant = 
  | 'default'
  | 'canvas'
  | 'card'
  | 'card-interactive'
  | 'subtle'
  | 'row'
  | 'stack';

export interface ProcrastinatorBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BoxVariant;
  as?: React.ElementType;
}

/**
 * Componente estático primitivo base de Procrastinator (div-procrastinator).
 * Proporciona armonía visual y estructura invariable en toda la aplicación.
 */
export const ProcrastinatorBox = forwardRef<HTMLDivElement, ProcrastinatorBoxProps>(
  ({ variant = 'default', as: Component = 'div', className = '', children, ...props }, ref) => {
    let baseStyles = '';

    switch (variant) {
      case 'canvas':
        baseStyles = styles.layout.main;
        break;
      case 'card':
        baseStyles = styles.card.base;
        break;
      case 'card-interactive':
        baseStyles = styles.card.interactive;
        break;
      case 'subtle':
        baseStyles = styles.card.subtle;
        break;
      case 'row':
        baseStyles = 'flex items-center justify-between gap-3';
        break;
      case 'stack':
        baseStyles = 'flex flex-col gap-3';
        break;
      default:
        baseStyles = '';
        break;
    }

    return (
      <Component
        ref={ref}
        className={`${baseStyles} ${className}`.trim()}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

ProcrastinatorBox.displayName = 'ProcrastinatorBox';
