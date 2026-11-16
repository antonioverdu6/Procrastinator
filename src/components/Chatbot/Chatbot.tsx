import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, UserSettings } from '../../types';
import { StorageService } from '../../services/storageService';
import { AIService } from '../../services/aiService';
import { Send, Key, Trash2 } from 'lucide-react';
import { styles } from '../../style';

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
  const [messages, setMessages] = useState<ChatMessage[]>(() => StorageService.getChatMessages());
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    const updated = [...messages, userMsg];
    setMessages(updated);
    StorageService.saveChatMessages(updated);
    setInput('');
    setIsTyping(true);

    try {
      const response = await AIService.sendMessage(text);
      const withReply = [...updated, response];
      setMessages(withReply);
      StorageService.saveChatMessages(withReply);
      onRefreshData();
    } catch (err: any) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'No pude procesar tu solicitud en este momento.',
        timestamp: new Date().toISOString()
      };
      const withError = [...updated, errorMsg];
      setMessages(withError);
      StorageService.saveChatMessages(withError);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearHistory = () => {
    localStorage.removeItem('devpace_chat_messages');
    const initial = StorageService.getChatMessages();
    setMessages(initial);
  };

  const hasApiKey = Boolean(settings.apiKey && settings.apiKey.trim().length > 0);

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm flex flex-col h-[calc(100vh-140px)] animate-fadeIn">
      {/* Header del Copiloto */}
      <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-[#0F172A] text-sm">Copiloto de Jornada</h3>
            <span className={hasApiKey ? styles.badge.success : styles.badge.neutral}>
              {hasApiKey ? `${settings.aiProvider.toUpperCase()} Conectado` : 'Motor Local'}
            </span>
          </div>
          <p className="text-xs text-[#64748B]">
            Ajusta tus horas diarias o pide consejo para desglosar tareas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!hasApiKey && (
            <button
              onClick={onOpenSettings}
              className={styles.button.ghost}
              title="Configurar clave de API"
            >
              <Key className="w-3.5 h-3.5 text-[#2563EB]" />
              <span className="text-xs">Añadir API Key</span>
            </button>
          )}

          <button
            onClick={handleClearHistory}
            className="p-1.5 text-[#94A3B8] hover:text-[#DC2626] rounded-lg hover:bg-[#FEE2E2] transition-colors"
            title="Limpiar mensajes"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lista de Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3.5 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'bg-white border border-[#E2E8F0] text-[#334155] shadow-xs'
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
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="text-xs text-[#64748B] flex items-center gap-1.5 p-2 bg-white border border-[#E2E8F0] rounded-lg w-fit">
            <span>Escribiendo respuesta...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Barra de Entrada y Comandos Rápidos */}
      <div className="p-3 border-t border-[#E2E8F0] bg-white space-y-2">
        {/* Atajos de comandos */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => handleSend('Tengo 1 hora extra hoy')}
            className={styles.button.secondary}
          >
            +1h extra hoy
          </button>
          <button
            onClick={() => handleSend('Hoy solo puedo dedicar 1 hora')}
            className={styles.button.secondary}
          >
            Solo 1h hoy
          </button>
          <button
            onClick={() => handleSend('¿Cuál es mi tarea prioritaria de hoy?')}
            className={styles.button.secondary}
          >
            ¿Cuál es mi foco?
          </button>
        </div>

        {/* Formulario */}
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Escribe aquí (ej: 'Tengo 2 horas extra', 'Hoy solo puedo 45 minutos')..."
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={isTyping}
            className={styles.input.base}
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className={styles.button.primary}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
