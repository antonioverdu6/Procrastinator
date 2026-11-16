import React from 'react';
import { ChatMessage } from '../../types';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ArrowRight } from 'lucide-react';

interface ChatMessageItemProps {
  message: ChatMessage;
  onSelectAction?: (actionText: string) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  onSelectAction
}) => {
  const isUser = message.role === 'user';

  return (
    <ProcrastinatorBox
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <ProcrastinatorBox
        className={`max-w-[85%] rounded-lg p-3.5 text-xs leading-relaxed ${
          isUser
            ? 'bg-[#2563EB] text-white shadow-xs'
            : 'bg-white border border-[#E2E8F0] text-[#334155] shadow-xs'
        }`}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>

        {/* Botones sugeridos */}
        {message.suggestedActions && message.suggestedActions.length > 0 && onSelectAction && (
          <div className="mt-2.5 pt-2 border-t border-[#E2E8F0] flex flex-wrap gap-1.5">
            {message.suggestedActions.map((action, i) => (
              <button
                key={i}
                onClick={() => onSelectAction(action.command || action.label)}
                className="text-[11px] bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE] font-medium px-2 py-1 rounded transition-colors flex items-center gap-1"
              >
                <span>{action.label}</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            ))}
          </div>
        )}
      </ProcrastinatorBox>
    </ProcrastinatorBox>
  );
};
