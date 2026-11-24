import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, UserSettings, ProjectPlanProposal, ProposedTask } from '../../types';
import { api } from '../../services/api';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorButton } from '../ProcrastinatorButton';
import { ProcrastinatorBadge } from '../ProcrastinatorBadge';
import { ProcrastinatorInput } from '../ProcrastinatorInput';
import { ProcrastinatorText } from '../ProcrastinatorText';
import { FormattedText } from '../FormattedText';
import {
  Send,
  Key,
  Trash2,
  Check,
  FolderKanban,
  Layers,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  SlidersHorizontal
} from 'lucide-react';

interface ChatbotProps {
  settings: UserSettings;
  onRefreshData: () => void;
  onOpenSettings: () => void;
  onOpenPlannerWithProposal?: (proposal: ProjectPlanProposal) => void;
  onGoToProjects?: () => void;
}

function groupByEpic(tasks: ProposedTask[]): [string, ProposedTask[]][] {
  const map = new Map<string, ProposedTask[]>();
  for (const t of tasks) {
    const epic = t.epic || 'General';
    if (!map.has(epic)) map.set(epic, []);
    map.get(epic)!.push(t);
  }
  return Array.from(map.entries());
}

export const Chatbot: React.FC<ChatbotProps> = ({
  settings,
  onRefreshData,
  onOpenSettings,
  onOpenPlannerWithProposal,
  onGoToProjects
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [committingMsgId, setCommittingMsgId] = useState<string | null>(null);
  const [expandedProposalTasks, setExpandedProposalTasks] = useState<Record<string, boolean>>({});
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

  const handleCommitProposal = async (msgId: string, proposal: ProjectPlanProposal) => {
    if (committingMsgId || proposal.applied) return;
    setCommittingMsgId(msgId);
    try {
      const result = await api.commitProjectPlan({
        name: proposal.projectName,
        description: proposal.projectDescription,
        targetHours: proposal.targetHours,
        tasks: proposal.tasks,
        sourceMessageId: msgId
      });

      setMessages(prev =>
        prev.map(m =>
          m.id === msgId && m.planProposal
            ? {
                ...m,
                planProposal: {
                  ...m.planProposal,
                  applied: true,
                  createdProjectId: result.project.id
                },
                actionsTaken: [
                  ...(m.actionsTaken || []),
                  `Proyecto '${result.project.name}' creado con ${result.tasksCreated} tareas`
                ]
              }
            : m
        )
      );
      onRefreshData();
    } catch (err) {
      console.error(err);
    } finally {
      setCommittingMsgId(null);
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

  const toggleProposalTask = (key: string) => {
    setExpandedProposalTasks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const hasApiKey = Boolean(settings.apiKey && settings.apiKey.trim().length > 0);

  return (
    <ProcrastinatorBox variant="chat-container" className="animate-fadeIn">
      {/* Header del Copiloto */}
      <ProcrastinatorBox className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-white">
        <ProcrastinatorBox>
          <ProcrastinatorBox className="flex items-center gap-2">
            <ProcrastinatorText variant="h3">Copiloto PM & Jornada</ProcrastinatorText>
            <ProcrastinatorBadge variant={hasApiKey ? 'success' : 'neutral'}>
              {hasApiKey ? `${settings.aiProvider.toUpperCase()} Conectado` : 'Motor Local PM'}
            </ProcrastinatorBadge>
          </ProcrastinatorBox>
          <ProcrastinatorText variant="caption">
            Descríbeme un proyecto para desglosarlo por épicas, añade tareas al backlog o ajusta tu jornada de hoy.
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
      <ProcrastinatorBox variant="chat-messages">
        {messages.map(msg => {
          const proposal = msg.planProposal;
          const epicGroups = proposal ? groupByEpic(proposal.tasks) : [];
          const totalProposalMins = proposal
            ? proposal.tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0)
            : 0;
          const totalProposalSubs = proposal
            ? proposal.tasks.reduce((sum, t) => sum + (t.subtasks?.length || 0), 0)
            : 0;

          return (
            <ProcrastinatorBox
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <ProcrastinatorBox
                className={`max-w-[90%] rounded-xl p-3.5 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-white border border-[#E2E8F0] text-[#334155]'
                }`}
              >
                {/* Badges de acciones ejecutadas por el PM */}
                {msg.actionsTaken && msg.actionsTaken.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {msg.actionsTaken.map((act, idx) => (
                      <ProcrastinatorBadge key={idx} variant="success">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{act}</span>
                      </ProcrastinatorBadge>
                    ))}
                  </div>
                )}

                <FormattedText text={msg.content} inverse={msg.role === 'user'} />

                {/* Tarjeta interactiva de Propuesta de Proyecto (Épicas + Tareas + Subtareas) */}
                {proposal && proposal.tasks.length > 0 && (
                  <ProcrastinatorBox variant="proposal-card">
                    <ProcrastinatorBox className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#E2E8F0]">
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-[#0F172A] text-sm">
                          <FolderKanban className="w-4 h-4 text-[#2563EB]" />
                          <span>{proposal.projectName}</span>
                        </div>
                        <div className="text-[11px] text-[#64748B] flex items-center gap-2 mt-0.5 flex-wrap">
                          <span>{epicGroups.length} épicas</span>
                          <span>•</span>
                          <span>{proposal.tasks.length} tareas</span>
                          <span>•</span>
                          <span>{totalProposalSubs} subtareas</span>
                          <span>•</span>
                          <span>~{(totalProposalMins / 60).toFixed(1)}h est.</span>
                        </div>
                      </div>

                      {proposal.applied && (
                        <ProcrastinatorBadge variant="success">
                          <Check className="w-3 h-3" /> Guardado en Backlog
                        </ProcrastinatorBadge>
                      )}
                    </ProcrastinatorBox>

                    {/* Vista agrupada por Épicas */}
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {epicGroups.map(([epicName, epicTasks]) => (
                        <div key={epicName} className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
                          <div className="px-2.5 py-1.5 bg-[#F1F5F9] border-b border-[#E2E8F0] flex items-center justify-between">
                            <span className="font-semibold text-[#0F172A] text-[11px] flex items-center gap-1.5">
                              <Layers className="w-3 h-3 text-[#2563EB]" />
                              {epicName}
                            </span>
                            <span className="text-[10px] text-[#64748B]">
                              {epicTasks.length} tareas • {epicTasks.reduce((s, t) => s + t.estimatedMinutes, 0)}m
                            </span>
                          </div>

                          <div className="divide-y divide-[#F1F5F9]">
                            {epicTasks.map(t => {
                              const rowKey = `${msg.id}-${t.id}`;
                              const isExpanded = Boolean(expandedProposalTasks[rowKey]);
                              const subs = t.subtasks || [];

                              return (
                                <div key={t.id} className="p-2 text-[11px]">
                                  <div
                                    className="flex items-center justify-between gap-2 cursor-pointer"
                                    onClick={() => toggleProposalTask(rowKey)}
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      {subs.length > 0 ? (
                                        isExpanded ? (
                                          <ChevronDown className="w-3.5 h-3.5 text-[#64748B] flex-shrink-0" />
                                        ) : (
                                          <ChevronRight className="w-3.5 h-3.5 text-[#64748B] flex-shrink-0" />
                                        )
                                      ) : null}
                                      <span className="font-medium text-[#0F172A] truncate">{t.title}</span>
                                    </div>

                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                      {subs.length > 0 && (
                                        <span className="text-[10px] text-[#64748B] bg-[#F1F5F9] px-1.5 py-0.5 rounded">
                                          {subs.length} pasos
                                        </span>
                                      )}
                                      <span className="font-mono text-[10px] text-[#475569]">{t.estimatedMinutes}m</span>
                                    </div>
                                  </div>

                                  {isExpanded && (
                                    <div className="mt-1.5 pl-5 space-y-1 text-[#475569]">
                                      {t.description && (
                                        <p className="text-[10px] text-[#64748B]">{t.description}</p>
                                      )}
                                      {subs.map(st => (
                                        <div key={st.id} className="flex items-start gap-1.5 text-[10px] text-[#334155]">
                                          <span className="text-[#2563EB]">•</span>
                                          <span>{st.title}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Botones de acción de la Propuesta */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                      {!proposal.applied ? (
                        <>
                          {onOpenPlannerWithProposal && (
                            <ProcrastinatorButton
                              variant="secondary"
                              onClick={() => onOpenPlannerWithProposal(proposal)}
                              className="text-xs py-1.5 px-3"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5" />
                              <span>Abrir y editar en Planificador</span>
                            </ProcrastinatorButton>
                          )}
                          <ProcrastinatorButton
                            variant="success"
                            onClick={() => handleCommitProposal(msg.id, proposal)}
                            disabled={committingMsgId === msg.id}
                            className="text-xs py-1.5 px-3"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>
                              {committingMsgId === msg.id
                                ? 'Creando proyecto...'
                                : `Crear Proyecto (${proposal.tasks.length} tareas)`}
                            </span>
                          </ProcrastinatorButton>
                        </>
                      ) : (
                        onGoToProjects && (
                          <ProcrastinatorButton
                            variant="secondary"
                            onClick={onGoToProjects}
                            className="text-xs py-1.5 px-3"
                          >
                            <FolderKanban className="w-3.5 h-3.5 text-[#2563EB]" />
                            <span>Ver en Proyectos & Backlog</span>
                          </ProcrastinatorButton>
                        )
                      )}
                    </div>
                  </ProcrastinatorBox>
                )}

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

                <span
                  className={`block text-[10px] mt-1.5 text-right ${
                    msg.role === 'user' ? 'text-blue-100' : 'text-[#94A3B8]'
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </ProcrastinatorBox>
            </ProcrastinatorBox>
          );
        })}

        {isTyping && (
          <ProcrastinatorBox className="text-xs text-[#64748B] flex items-center gap-1.5 p-2.5 bg-white border border-[#E2E8F0] rounded-lg w-fit">
            <span>El PM está analizando y planificando...</span>
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
            className="text-xs py-1 px-2.5"
          >
            +1h extra hoy
          </ProcrastinatorButton>
          <ProcrastinatorButton
            variant="secondary"
            onClick={() => handleSend('Hoy solo puedo dedicar 1 hora')}
            className="text-xs py-1 px-2.5"
          >
            Solo 1h hoy
          </ProcrastinatorButton>
          <ProcrastinatorButton
            variant="secondary"
            onClick={() => handleSend('¿Cuál es mi tarea prioritaria de hoy?')}
            className="text-xs py-1 px-2.5"
          >
            ¿Cuál es mi foco?
          </ProcrastinatorButton>
          <ProcrastinatorButton
            variant="secondary"
            onClick={() =>
              setInput(
                'Desglósame un proyecto de [tu idea] con [tecnologías], módulos principales y unas 20h estimadas'
              )
            }
            className="text-xs py-1 px-2.5"
          >
            Planificar proyecto nuevo
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
            placeholder="Explícame un proyecto para desglosarlo, pide añadir tareas o ajusta tus horas de hoy..."
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
