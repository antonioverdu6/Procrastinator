import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, UserSettings } from '../../types';
import { api } from '../../services/api';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorButton } from '../ProcrastinatorButton';
import { ProcrastinatorBadge } from '../ProcrastinatorBadge';
import { ProcrastinatorInput } from '../ProcrastinatorInput';
import { ProcrastinatorText } from '../ProcrastinatorText';
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchHistory = async () => {
    try {
      const history = await api.getChatHistory();
      setMessages(history);
    } catch (err) {
      console.warn("Error cargando historial de chat:", err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isTyping) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await api.sendChatMessage(text);
      setMessages(prev => [...prev, response]);
      onRefreshData();
    } catch (err: any) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'No pude conectar con el servidor de IA.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await api.clearChatHistory();
      setMessages([]);
    } catch (err) {
      console.error(err);
    }
  };

  const hasApiKey = Boolean(settings.apiKey && settings.apiKey.trim().length > 0);

  return (
    <ProcrastinatorBox variant="card" className="flex flex-col h-[calc(100vh-140px)] animate-fadeIn p-0 overflow-hidden">
      {/* Header del Copiloto */}
      <ProcrastinatorBox className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
        <ProcrastinatorBox>
          <ProcrastinatorBox className="flex items-center gap-2">
            <ProcrastinatorText variant="h3">Copiloto de Jornada</ProcrastinatorText>
            <ProcrastinatorBadge variant={hasApiKey ? 'success' : 'neutral'}>
              {hasApiKey ? `${settings.aiProvider.toUpperCase()} Conectado` : 'Motor Local'}
            </ProcrastinatorBadge>
          </ProcrastinatorBox>
          <ProcrastinatorText variant="caption">
            Ajusta tus horas diarias o pide consejo para desglosar tareas.
          </ProcrastinatorText>
        </ProcrastinatorBox>

        <ProcrastinatorBox className="flex items-center gap-2">
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
            onClick={handleClearHistory}
            className="p-1.5 text-[#94A3B8] hover:text-[#DC2626] rounded-lg hover:bg-[#FEE2E2] transition-colors"
            title="Limpiar mensajes"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </ProcrastinatorBox>
      </ProcrastinatorBox>

      {/* Lista de Mensajes */}
      <ProcrastinatorBox className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
        {messages.map(msg => (
          <ProcrastinatorBox
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <ProcrastinatorBox
              className={`max-w-[85%] rounded-lg p-3.5 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#2563EB] text-white '
                  : 'bg-white border border-[#E2E8F0] text-[#334155] '
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Botones sugeridos */}
              {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-[#E2E8F0] flex flex-wrap gap-1.5">
                  {msg.suggestedActions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(action.command)}
                      className="px-2.5 py-1 text-[11px] font-medium bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] rounded border border-[#E2E8F0] transition-colors"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}

              <span className={`block text-[10px] mt-1 text-right ${
                msg.role === 'user' ? 'text-blue-100' : 'text-[#94A3B8]'
              }`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </ProcrastinatorBox>
          </ProcrastinatorBox>
        ))}

        {isTyping && (
          <ProcrastinatorBox className="text-xs text-[#64748B] flex items-center gap-1.5 p-2 bg-white border border-[#E2E8F0] rounded-lg w-fit">
            <span>Escribiendo respuesta...</span>
          </ProcrastinatorBox>
        )}

        <div ref={messagesEndRef} />
      </ProcrastinatorBox>

      {/* Barra de Entrada y Comandos Rápidos */}
      <ProcrastinatorBox className="p-3 border-t border-[#E2E8F0] bg-white space-y-2">
        {/* Atajos de comandos */}
        <ProcrastinatorBox className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <ProcrastinatorButton
            variant="secondary"
            onClick={() => handleSend('Tengo 1 hora extra hoy')}
          >
            +1h extra hoy
          </ProcrastinatorButton>
          <ProcrastinatorButton
            variant="secondary"
            onClick={() => handleSend('Hoy solo puedo dedicar 1 hora')}
          >
            Solo 1h hoy
          </ProcrastinatorButton>
          <ProcrastinatorButton
            variant="secondary"
            onClick={() => handleSend('¿Cuál es mi tarea prioritaria de hoy?')}
          >
            ¿Cuál es mi foco?
          </ProcrastinatorButton>
        </ProcrastinatorBox>

        {/* Formulario */}
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <ProcrastinatorInput
            type="text"
            placeholder="Escribe aquí (ej: 'Tengo 2 horas extra', 'Hoy solo puedo 45 minutos')..."
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
        </form>
      </ProcrastinatorBox>
    </ProcrastinatorBox>
  );
};
