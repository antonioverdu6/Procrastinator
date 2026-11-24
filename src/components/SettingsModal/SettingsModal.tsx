import React, { useState, useEffect } from 'react';
import { Settings, Eye, EyeOff, Save, Check, ExternalLink, Globe } from 'lucide-react';
import { UserSettings } from '../../types';
import { api } from '../../services/api';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorButton } from '../ProcrastinatorButton';
import { ProcrastinatorBadge } from '../ProcrastinatorBadge';
import { ProcrastinatorText } from '../ProcrastinatorText';
import { ProcrastinatorModal } from '../ProcrastinatorModal';
import { useI18n } from '../../i18n';
import { styles } from '../../style';

interface SettingsModalProps {
  settings: UserSettings;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (newSettings: UserSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  isOpen,
  onClose,
  onSaved
}) => {
  const { t } = useI18n();
  const [form, setForm] = useState<UserSettings>(settings);
  const [showKey, setShowKey] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setForm({
      ...settings,
      apiKey: '',
      githubToken: '',
      clearApiKey: false,
      clearGithubToken: false
    });
    setShowKey(false);
  }, [settings, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const saved = await api.saveSettings(form);
      onSaved(saved);
      setJustSaved(true);
      setTimeout(() => {
        setJustSaved(false);
        onClose();
      }, 450);
    } catch (err) {
      console.error(err);
    }
  };

  const getProviderDocLink = () => {
    if (form.aiProvider === 'gemini') return 'https://aistudio.google.com/app/apikey';
    if (form.aiProvider === 'groq') return 'https://console.groq.com/keys';
    return 'https://platform.openai.com/api-keys';
  };

  return (
    <ProcrastinatorModal
      isOpen={isOpen}
      onClose={onClose}
      title={t.settings.title}
      icon={<Settings className="w-5 h-5 text-[#2563EB]" />}
      size="md"
      shadow="no"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        {/* Idioma ES / EN */}
        <ProcrastinatorBox>
          <label className={styles.input.label}>{t.settings.uiLanguageLabel}</label>
          <ProcrastinatorText variant="caption" className="mb-1.5 block">
            {t.settings.uiLanguageHelp}
          </ProcrastinatorText>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'es' as const, label: 'Español (ES)' },
              { id: 'en' as const, label: 'English (EN)' }
            ].map(opt => (
              <button
                type="button"
                key={opt.id}
                onClick={() => setForm({ ...form, language: opt.id })}
                className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  (form.language || 'es') === opt.id
                    ? 'bg-[#EFF6FF] border-[#2563EB] text-[#2563EB]'
                    : 'bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </ProcrastinatorBox>

        {/* Capacidad Diaria */}
        <ProcrastinatorBox>
          <label className={styles.input.label}>{t.settings.dailyCapacityLabel}</label>
          <ProcrastinatorText variant="caption" className="mb-1.5 block">
            {t.settings.dailyCapacityHelp}
          </ProcrastinatorText>
          <select
            value={form.defaultDailyHours}
            onChange={e => setForm({ ...form, defaultDailyHours: Number(e.target.value) })}
            className={styles.input.select}
          >
            <option value={1.5}>1.5 {t.settings.hoursPerDay}</option>
            <option value={2.0}>2.0 {t.settings.hoursPerDay}</option>
            <option value={2.5}>
              2.5 {t.settings.hoursPerDay} {t.settings.recommended}
            </option>
            <option value={3.0}>3.0 {t.settings.hoursPerDay}</option>
            <option value={4.0}>4.0 {t.settings.hoursPerDay}</option>
            <option value={6.0}>6.0 {t.settings.hoursPerDay}</option>
          </select>
        </ProcrastinatorBox>

        {/* Proveedor de IA */}
        <ProcrastinatorBox>
          <label className={styles.input.label}>{t.settings.aiProviderLabel}</label>
          <select
            value={form.aiProvider}
            onChange={e => setForm({ ...form, aiProvider: e.target.value as any })}
            className={styles.input.select}
          >
            <option value="gemini">Google Gemini</option>
            <option value="openai">OpenAI (GPT-4o-mini)</option>
            <option value="groq">Groq (Llama 3.3 70B)</option>
          </select>
        </ProcrastinatorBox>

        {/* API Key (nunca se rellena con la clave guardada) */}
        <ProcrastinatorBox>
          <ProcrastinatorBox className="flex items-center justify-between mb-1 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <label className={styles.input.label}>{t.settings.apiKeyLabel}</label>
              {settings.hasApiKey && !form.clearApiKey && (
                <ProcrastinatorBadge variant="success">
                  {t.settings.apiKeyConfigured} ({settings.apiKeyPreview})
                </ProcrastinatorBadge>
              )}
              {form.clearApiKey && (
                <ProcrastinatorBadge variant="warning">{t.settings.clearedPending}</ProcrastinatorBadge>
              )}
            </div>
            <div className="flex items-center gap-3">
              {settings.hasApiKey && !form.clearApiKey && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, apiKey: '', clearApiKey: true })}
                  className="text-xs text-[#DC2626] hover:underline"
                >
                  {t.settings.clearSecret}
                </button>
              )}
              <a
                href={getProviderDocLink()}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#2563EB] hover:underline flex items-center gap-1"
              >
                {t.settings.getKey} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </ProcrastinatorBox>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              placeholder={
                settings.hasApiKey
                  ? t.settings.apiKeyReplacePlaceholder
                  : t.settings.apiKeyNewPlaceholder
              }
              value={form.apiKey}
              onChange={e => setForm({ ...form, apiKey: e.target.value, clearApiKey: false })}
              className={`${styles.input.base} pr-10`}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-2.5 text-[#94A3B8] hover:text-[#0F172A]"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">{t.settings.apiKeyHelp}</p>
        </ProcrastinatorBox>

        {/* GitHub Token opcional (nunca se rellena con el token guardado) */}
        <ProcrastinatorBox>
          <ProcrastinatorBox className="flex items-center justify-between mb-1 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <label className={styles.input.label}>{t.settings.githubTokenLabel}</label>
              {settings.hasGithubToken && !form.clearGithubToken && (
                <ProcrastinatorBadge variant="success">
                  {t.settings.apiKeyConfigured} ({settings.githubTokenPreview})
                </ProcrastinatorBadge>
              )}
              {form.clearGithubToken && (
                <ProcrastinatorBadge variant="warning">{t.settings.clearedPending}</ProcrastinatorBadge>
              )}
            </div>
            <div className="flex items-center gap-3">
              {settings.hasGithubToken && !form.clearGithubToken && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, githubToken: '', clearGithubToken: true })}
                  className="text-xs text-[#DC2626] hover:underline"
                >
                  {t.settings.clearSecret}
                </button>
              )}
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#2563EB] hover:underline flex items-center gap-1"
              >
                {t.settings.createToken} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </ProcrastinatorBox>
          <input
            type="password"
            placeholder={
              settings.hasGithubToken ? t.settings.githubTokenReplacePlaceholder : 'ghp_... / github_pat_...'
            }
            value={form.githubToken || ''}
            onChange={e => setForm({ ...form, githubToken: e.target.value, clearGithubToken: false })}
            className={styles.input.base}
            autoComplete="off"
          />
          <p className="text-[11px] text-[#94A3B8] mt-1">{t.settings.githubTokenHelp}</p>
        </ProcrastinatorBox>

        {/* Exigencia */}
        <ProcrastinatorBox>
          <label className={styles.input.label}>{t.settings.strictnessLabel}</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'gentle', label: t.settings.strictnessGentle },
              { id: 'balanced', label: t.settings.strictnessBalanced },
              { id: 'tough_love', label: t.settings.strictnessTough }
            ].map(item => (
              <button
                type="button"
                key={item.id}
                onClick={() => setForm({ ...form, strictness: item.id as any })}
                className={`py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                  form.strictness === item.id
                    ? 'bg-[#EFF6FF] border-[#2563EB] text-[#2563EB]'
                    : 'bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </ProcrastinatorBox>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E2E8F0]">
          <ProcrastinatorButton type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </ProcrastinatorButton>
          <ProcrastinatorButton type="submit" variant="primary">
            {justSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{justSaved ? t.common.saved : t.settings.saveSettings}</span>
          </ProcrastinatorButton>
        </div>
      </form>
    </ProcrastinatorModal>
  );
};
