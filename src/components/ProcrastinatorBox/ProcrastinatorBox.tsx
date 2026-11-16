import React, { forwardRef } from 'react';
import { styles } from '../../style';

export type BoxVariant = 
  | 'default'
  | 'canvas'
  | 'page'
  | 'header'
  | 'card'
  | 'card-interactive'
  | 'card-selected'
  | 'subtle'
  | 'row'
  | 'row-wrap'
  | 'row-between'
  | 'row-end'
  | 'stack'
  | 'stack-sm'
  | 'grid-2'
  | 'grid-3'
  | 'grid-4'
  | 'list'
  | 'list-item'
  | 'list-item-active'
  | 'modal-overlay'
  | 'modal-card'
  | 'modal-card-wide'
  | 'modal-card-sm'
  | 'chat-container'
  | 'chat-messages'
  | 'chat-input-bar';

export interface ProcrastinatorBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BoxVariant;
  as?: React.ElementType;
}

/**
 * Componente primitivo estático base de Procrastinator.
 * Consume exclusivamente los estilos predefinidos en styles.box y styles.card.
 */
export const ProcrastinatorBox = forwardRef<HTMLDivElement, ProcrastinatorBoxProps>(
  ({ variant = 'default', as: Component = 'div', className = '', children, ...props }, ref) => {
    let baseStyles = '';

    switch (variant) {
      case 'canvas':
        baseStyles = styles.layout.main;
        break;
      case 'page':
        baseStyles = styles.box.page;
        break;
      case 'header':
        baseStyles = styles.box.header;
        break;
      case 'card':
        baseStyles = styles.card.base;
        break;
      case 'card-interactive':
        baseStyles = styles.card.interactive;
        break;
      case 'card-selected':
        baseStyles = styles.card.selected;
        break;
      case 'subtle':
        baseStyles = styles.card.subtle;
        break;
      case 'row':
        baseStyles = styles.box.row;
        break;
      case 'row-wrap':
        baseStyles = styles.box.rowWrap;
        break;
      case 'row-between':
        baseStyles = styles.box.rowBetween;
        break;
      case 'row-end':
        baseStyles = styles.box.rowEnd;
        break;
      case 'stack':
        baseStyles = styles.box.stack;
        break;
      case 'stack-sm':
        baseStyles = styles.box.stackSm;
        break;
      case 'grid-2':
        baseStyles = styles.box.grid2;
        break;
      case 'grid-3':
        baseStyles = styles.box.grid3;
        break;
      case 'grid-4':
        baseStyles = styles.box.grid4;
        break;
      case 'list':
        baseStyles = styles.box.list;
        break;
      case 'list-item':
        baseStyles = styles.box.listItem;
        break;
      case 'list-item-active':
        baseStyles = styles.box.listItemActive;
        break;
      case 'modal-overlay':
        baseStyles = styles.box.modalOverlay;
        break;
      case 'modal-card':
        baseStyles = styles.box.modalCard;
        break;
      case 'modal-card-wide':
        baseStyles = styles.box.modalCardWide;
        break;
      case 'modal-card-sm':
        baseStyles = styles.box.modalCardSm;
        break;
      case 'chat-container':
        baseStyles = styles.box.chatContainer;
        break;
      case 'chat-messages':
        baseStyles = styles.box.chatMessages;
        break;
      case 'chat-input-bar':
        baseStyles = styles.box.chatInputBar;
        break;
      default:
        baseStyles = '';
        break;
    }

    return (
      <Component
        ref={ref}
        className={className ? `${baseStyles} ${className}`.trim() : baseStyles}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
