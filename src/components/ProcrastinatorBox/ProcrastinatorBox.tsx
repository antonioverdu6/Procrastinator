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
  | 'panel'
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
  | 'chat-container'
  | 'chat-messages'
  | 'chat-input-bar'
  | 'epic-section'
  | 'epic-header'
  | 'subtask-row'
  | 'proposal-card';

export interface ProcrastinatorBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BoxVariant;
  border?: 'none' | 'subtle' | 'strong' | 'active';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg';
  direction?: 'row' | 'col';
  align?: 'start' | 'center' | 'end';
  justify?: 'between' | 'start' | 'end' | 'center';
  wrap?: boolean;
  shadow?: 'no' | 'soft' | 'yes' | 'none';
  as?: React.ElementType;
}

/**
 * Componente primitivo estático base de Procrastinator.
 * Diseño 100% plano sin sombras, gobernado por propiedades tipadas (variant, border, padding, flex...).
 */
export const ProcrastinatorBox = forwardRef<HTMLDivElement, ProcrastinatorBoxProps>(
  (
    {
      variant = 'default',
      border,
      padding,
      gap,
      direction,
      align,
      justify,
      wrap,
      shadow,
      as: Component = 'div',
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    let classes: string[] = [];

    // Variante base
    switch (variant) {
      case 'canvas':
        classes.push(styles.layout.main);
        break;
      case 'page':
        classes.push(styles.box.page);
        break;
      case 'header':
        classes.push(styles.box.header);
        break;
      case 'card':
        classes.push(styles.card.base);
        break;
      case 'card-interactive':
        classes.push(styles.card.interactive);
        break;
      case 'card-selected':
        classes.push(styles.card.selected);
        break;
      case 'subtle':
        classes.push(styles.card.subtle);
        break;
      case 'panel':
        classes.push(styles.box.panel);
        break;
      case 'row':
        classes.push(styles.box.row);
        break;
      case 'row-wrap':
        classes.push(styles.box.rowWrap);
        break;
      case 'row-between':
        classes.push(styles.box.rowBetween);
        break;
      case 'row-end':
        classes.push(styles.box.rowEnd);
        break;
      case 'stack':
        classes.push(styles.box.stack);
        break;
      case 'stack-sm':
        classes.push(styles.box.stackSm);
        break;
      case 'grid-2':
        classes.push(styles.box.grid2);
        break;
      case 'grid-3':
        classes.push(styles.box.grid3);
        break;
      case 'grid-4':
        classes.push(styles.box.grid4);
        break;
      case 'list':
        classes.push(styles.box.list);
        break;
      case 'list-item':
        classes.push(styles.box.listItem);
        break;
      case 'list-item-active':
        classes.push(styles.box.listItemActive);
        break;
      case 'modal-overlay':
        classes.push(styles.box.modalOverlay);
        break;
      case 'modal-card':
        classes.push(styles.box.modalCard);
        break;
      case 'chat-container':
        classes.push(styles.box.chatContainer);
        break;
      case 'chat-messages':
        classes.push(styles.box.chatMessages);
        break;
      case 'chat-input-bar':
        classes.push(styles.box.chatInputBar);
        break;
      case 'epic-section':
        classes.push(styles.box.epicSection);
        break;
      case 'epic-header':
        classes.push(styles.box.epicHeader);
        break;
      case 'subtask-row':
        classes.push(styles.box.subtaskRow);
        break;
      case 'proposal-card':
        classes.push(styles.box.proposalCard);
        break;
      default:
        break;
    }

    // Propiedades explícitas
    if (border && styles.props.border[border]) {
      classes.push(styles.props.border[border]);
    }
    if (padding && styles.props.padding[padding]) {
      classes.push(styles.props.padding[padding]);
    }
    if (gap && styles.props.gap[gap]) {
      classes.push(styles.props.gap[gap]);
    }
    if (direction && styles.props.direction[direction]) {
      classes.push(styles.props.direction[direction]);
    }
    if (align && styles.props.align[align]) {
      classes.push(styles.props.align[align]);
    }
    if (justify && styles.props.justify[justify]) {
      classes.push(styles.props.justify[justify]);
    }
    if (wrap) {
      classes.push('flex-wrap');
    }
    if (shadow && styles.props.shadow[shadow]) {
      classes.push(styles.props.shadow[shadow]);
    }

    if (className) {
      classes.push(className);
    }

    return (
      <Component
        ref={ref}
        className={classes.join(' ').trim()}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
