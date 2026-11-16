import React from 'react';
import { styles } from '../../style';

export type TextVariant = 'h1' | 'h2' | 'h3' | 'body' | 'caption';

export interface ProcrastinatorTextProps extends React.HTMLAttributes<HTMLElement> {
  variant?: TextVariant;
  as?: React.ElementType;
}

/**
 * Tipografía estática armonizada de Procrastinator.
 */
export const ProcrastinatorText: React.FC<ProcrastinatorTextProps> = ({
  variant = 'body',
  as,
  className = '',
  children,
  ...props
}) => {
  let Tag: React.ElementType = as || 'p';
  let variantClass = styles.typography.body;

  switch (variant) {
    case 'h1':
      Tag = as || 'h1';
      variantClass = styles.typography.h1;
      break;
    case 'h2':
      Tag = as || 'h2';
      variantClass = styles.typography.h2;
      break;
    case 'h3':
      Tag = as || 'h3';
      variantClass = styles.typography.h3;
      break;
    case 'caption':
      Tag = as || 'span';
      variantClass = styles.typography.caption;
      break;
    default:
      Tag = as || 'p';
      variantClass = styles.typography.body;
      break;
  }

  return (
    <Tag className={`${variantClass} ${className}`.trim()} {...props}>
      {children}
    </Tag>
  );
};
