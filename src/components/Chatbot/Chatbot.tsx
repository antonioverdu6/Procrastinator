import React from 'react';
import { UserSettings } from '../../types';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorButton } from '../ProcrastinatorButton';
import { ProcrastinatorBadge } from '../ProcrastinatorBadge';
import { ProcrastinatorInput } from '../ProcrastinatorInput';
import { ProcrastinatorText } from '../ProcrastinatorText';
import { ChatMessageItem } from '../ChatMessageItem';
import { useChatbot } from '../../hooks';
import { Send, Key, Trash2 } from 'lucide-react';

interface ChatbotProps {
  settings: UserSettings;
  onRefreshData: () => void;
  onOpenSettings: () => void;
}

export const Chatbot: React.FC<ChatbotProps> = ({
  settings,
  onRefreshData,
  onOpenSettings
}) => {
  const {
    messages,
    input,
    setInput,
    isTyping,
    messagesEndRef,
    sendMessage,
    clearHistory
  } = useChatbot({ onRefreshData });

  const hasApiKey = Boolean(settings.apiKey && settings.apiKey.trim().length > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  return (
    <ProcrastinatorBox variant="chat-container">
      {/* Header del Copiloto */}
      <ProcrastinatorBox variant="row-between" className="p-4 border-b border-[#E2E8F0]">
        <ProcrastinatorBox variant="stack-sm">
          <ProcrastinatorBox variant="row">
            <ProcrastinatorText variant="h3">Copiloto de Jornada</ProcrastinatorText>
            <ProcrastinatorBadge variant={hasApiKey ? 'success' : 'neutral'}>
              {hasApiKey ? `${settings.aiProvider.toUpperCase()} Conectado` : 'Motor Local'}
            </ProcrastinatorBadge>
          </ProcrastinatorBox>
          <ProcrastinatorText variant="caption">
            Ajusta tus horas diarias o pide consejo para desglosar tareas.
          </ProcrastinatorText>
        </ProcrastinatorBox>

        <ProcrastinatorBox variant="row">
          {!hasApiKey && (
            <ProcrastinatorButton
              variant="ghost"
              onClick={onOpenSettings}
              title="Configurar clave de API"
            >
              <Key className="w-3.5 h-3.5 text-[#2563EB]" />
              <span className="text-xs">Añadir API Key</span>
            </ProcrastinatorButton>
          )}

          <button
            onClick={clearHistory}
            className="p-1.5 text-[#94A3B8] hover:text-[#DC2626] rounded-lg hover:bg-[#FEE2E2] transition-colors"
            title="Limpiar mensajes"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </ProcrastinatorBox>
      </ProcrastinatorBox>

      {/* Lista de Mensajes */}
      <ProcrastinatorBox variant="chat-messages">
        {messages.map(msg => (
          <ChatMessageItem
            key={msg.id}
            message={msg}
            onSelectAction={actionText => sendMessage(actionText)}
          />
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-3 text-xs text-[#64748B] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-pulse" />
              <span>El PM está pensando la mejor estrategia...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </ProcrastinatorBox>

      {/* Input de chat */}
      <ProcrastinatorBox as="form" onSubmit={handleSubmit} variant="chat-input-bar">
        <ProcrastinatorInput
          type="text"
          placeholder="Escribe 'hoy puedo 1 hora más', 'dividir tarea de login'..."
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={isTyping}
        />
        <ProcrastinatorButton
          type="submit"
          variant="primary"
          disabled={!input.trim() || isTyping}
        >
          <Send className="w-4 h-4" />
        </ProcrastinatorButton>
      </ProcrastinatorBox>
    </ProcrastinatorBox>
  );
};
