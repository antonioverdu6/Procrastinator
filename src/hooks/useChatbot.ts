import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { api } from '../services/api';

interface UseChatbotProps {
  onRefreshData?: () => void;
}

export function useChatbot({ onRefreshData }: UseChatbotProps = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchHistory = async () => {
    try {
      const history = await api.getChatHistory();
      setMessages(history);
    } catch (err) {
      console.warn('Error cargando historial de chat:', err);
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

  const sendMessage = async (textToSend?: string) => {
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
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      console.error('Error enviando mensaje de chat:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'No pude conectar con el copiloto en el servidor FastAPI.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearHistory = async () => {
    try {
      await api.clearChatHistory();
      setMessages([]);
    } catch (err) {
      console.error('Error limpiando historial de chat:', err);
    }
  };

  return {
    messages,
    input,
    setInput,
    isTyping,
    messagesEndRef,
    sendMessage,
    clearHistory
  };
}
