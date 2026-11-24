import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle2, Key, Send, Trash2 } from 'lucide-react';
import { ChatMessage, ProjectPlanProposal, UserSettings } from '../../types';
import { api } from '../../services/api';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorButton } from '../ProcrastinatorButton';
import { ProcrastinatorBadge } from '../ProcrastinatorBadge';
import { ProcrastinatorInput } from '../ProcrastinatorInput';
import { ProcrastinatorText } from '../ProcrastinatorText';
import { FormattedText } from '../FormattedText';
import { ChatProposalCard } from '../ChatProposalCard';
import { useI18n } from '../../i18n';

interface ChatbotProps {
  settings: UserSettings;
  onRefreshData: () => void;
  onOpenSettings: () => void;
  onOpenPlannerWithProposal?: (proposal: ProjectPlanProposal) => void;
  onGoToProjects?: () => void;
}

export const Chatbot: React.FC<ChatbotProps> = ({
  settings,
  onRefreshData,
  onOpenSettings,
  onOpenPlannerWithProposal,
  onGoToProjects
}) => {
  const { t } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [committingMsgId, setCommittingMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const copilotCopy = t.conversations.copilot;

  useEffect(() => {
    api.getChatHistory().then(setMessages).catch(err => console.warn('Chat history error:', err));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: copilotCopy.connectionError,
          timestamp: new Date().toISOString()
        }
      ]);
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
                  `${result.project.name} (${result.tasksCreated} ${copilotCopy.proposal.tasks})`
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

  const hasApiKey = Boolean(settings.hasApiKey || (settings.apiKey && settings.apiKey.trim().length > 0));

  return (
    <ProcrastinatorBox variant="chat-container" className="animate-fadeIn">
      <ProcrastinatorBox className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-white">
        <ProcrastinatorBox>
          <ProcrastinatorBox className="flex items-center gap-2">
            <ProcrastinatorText variant="h3">{copilotCopy.title}</ProcrastinatorText>
            <ProcrastinatorBadge variant={hasApiKey ? 'success' : 'neutral'}>
              {hasApiKey
                ? `${settings.aiProvider.toUpperCase()} ${copilotCopy.connectedSuffix}`
                : copilotCopy.localEngineBadge}
            </ProcrastinatorBadge>
          </ProcrastinatorBox>
          <ProcrastinatorText variant="caption">{copilotCopy.subtitle}</ProcrastinatorText>
        </ProcrastinatorBox>

        <ProcrastinatorBox className="flex items-center gap-2">
          {!hasApiKey && (
            <ProcrastinatorButton variant="ghost" onClick={onOpenSettings}>
              <Key className="w-3.5 h-3.5 text-[#2563EB]" />
              <span className="text-xs">{copilotCopy.addApiKey}</span>
            </ProcrastinatorButton>
          )}

          <button
            onClick={handleClearHistory}
            className="p-1.5 text-[#94A3B8] hover:text-[#DC2626] rounded-lg hover:bg-[#FEE2E2] transition-colors"
            title={copilotCopy.clearTitle}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </ProcrastinatorBox>
      </ProcrastinatorBox>

      <ProcrastinatorBox variant="chat-messages">
        {messages.map(msg => (
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

              {msg.planProposal && msg.planProposal.tasks.length > 0 && (
                <ChatProposalCard
                  msgId={msg.id}
                  proposal={msg.planProposal}
                  isCommitting={committingMsgId === msg.id}
                  onCommit={handleCommitProposal}
                  onOpenInPlanner={onOpenPlannerWithProposal}
                  onGoToProjects={onGoToProjects}
                />
              )}

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
        ))}

        {isTyping && (
          <ProcrastinatorBox className="text-xs text-[#64748B] flex items-center gap-1.5 p-2.5 bg-white border border-[#E2E8F0] rounded-lg w-fit">
            <span>{copilotCopy.typing}</span>
          </ProcrastinatorBox>
        )}

        <div ref={messagesEndRef} />
      </ProcrastinatorBox>

      <ProcrastinatorBox className="p-3 border-t border-[#E2E8F0] bg-white space-y-2">
        <ProcrastinatorBox className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {copilotCopy.quickCommands.map(cmd => (
            <ProcrastinatorButton
              key={cmd.label}
              variant="secondary"
              onClick={() => handleSend(cmd.command)}
              className="text-xs py-1 px-2.5"
            >
              {cmd.label}
            </ProcrastinatorButton>
          ))}
          <ProcrastinatorButton
            variant="secondary"
            onClick={() => setInput(copilotCopy.planProjectTemplateText)}
            className="text-xs py-1 px-2.5"
          >
            {copilotCopy.planProjectTemplateLabel}
          </ProcrastinatorButton>
        </ProcrastinatorBox>

        <form
          onSubmit={e => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <ProcrastinatorInput
            type="text"
            placeholder={copilotCopy.inputPlaceholder}
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={isTyping}
          />
          <ProcrastinatorButton type="submit" variant="primary" disabled={!input.trim() || isTyping}>
            <Send className="w-4 h-4" />
          </ProcrastinatorButton>
        </form>
      </ProcrastinatorBox>
    </ProcrastinatorBox>
  );
};
