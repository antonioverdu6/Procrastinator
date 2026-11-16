import React from 'react';
import { styles } from '../../style';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

export interface ProcrastinatorBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

/**
 * Etiqueta / Badge estática de Procrastinator.
 */
export const ProcrastinatorBadge: React.FC<ProcrastinatorBadgeProps> = ({
  variant = 'neutral',
  className = '',
  children,
  ...props
}) => {
  let badgeClass = styles.badge.neutral;

  switch (variant) {
    case 'primary':
      badgeClass = styles.badge.primary;
      break;
    case 'success':
      badgeClass = styles.badge.success;
      break;
    case 'warning':
      badgeClass = styles.badge.warning;
      break;
    case 'danger':
      badgeClass = styles.badge.danger;
      break;
    default:
      badgeClass = styles.badge.neutral;
      break;
  }

  return (
    <span className={`${badgeClass} ${className}`.trim()} {...props}>
      {children}
    </span>
  );
};
