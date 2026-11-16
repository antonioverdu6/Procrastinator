import React, { forwardRef } from 'react';
import { styles } from '../../style';

export interface ProcrastinatorInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

/**
 * Campo de texto estático de Procrastinator.
 */
export const ProcrastinatorInput = forwardRef<HTMLInputElement, ProcrastinatorInputProps>(
  ({ label, className = '', id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className={styles.input.label}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`${styles.input.base} ${className}`.trim()}
          {...props}
        />
      </div>
    );
  }
);

ProcrastinatorInput.displayName = 'ProcrastinatorInput';
