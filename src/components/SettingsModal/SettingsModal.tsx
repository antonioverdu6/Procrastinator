import React, { useState } from 'react';
import { UserSettings } from '../../types';
import { api } from '../../services/api';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorButton } from '../ProcrastinatorButton';
import { ProcrastinatorText } from '../ProcrastinatorText';
import { ProcrastinatorModal } from '../ProcrastinatorModal';
import { Settings, Eye, EyeOff, Save, Check, ExternalLink } from 'lucide-react';
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
  const [form, setForm] = useState<UserSettings>(settings);
  const [showKey, setShowKey] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.saveSettings(form);
      onSaved(form);
      setJustSaved(true);
      setTimeout(() => {
        setJustSaved(false);
        onClose();
      }, 500);
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
      title="Configuración"
      icon={<Settings className="w-5 h-5 text-[#2563EB]" />}
      size="md"
      shadow="no"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        {/* Capacidad Diaria */}
        <ProcrastinatorBox>
          <label className={styles.input.label}>Capacidad Diaria Habitual</label>
          <ProcrastinatorText variant="caption" className="mb-1.5 block">
            Horas que dedicas normalmente al día a tus desarrollos.
          </ProcrastinatorText>
          <select
            value={form.defaultDailyHours}
            onChange={e => setForm({ ...form, defaultDailyHours: Number(e.target.value) })}
            className={styles.input.select}
          >
            <option value={1.5}>1.5 horas al día</option>
            <option value={2.0}>2.0 horas al día</option>
            <option value={2.5}>2.5 horas al día (Recomendado)</option>
            <option value={3.0}>3.0 horas al día</option>
            <option value={4.0}>4.0 horas al día</option>
            <option value={6.0}>6.0 horas al día</option>
          </select>
        </ProcrastinatorBox>

        {/* Proveedor de IA */}
        <ProcrastinatorBox>
          <label className={styles.input.label}>Proveedor de IA</label>
          <select
            value={form.aiProvider}
            onChange={e => setForm({ ...form, aiProvider: e.target.value as any })}
            className={styles.input.select}
          >
            <option value="gemini">Google Gemini (Gratuito y rápido)</option>
            <option value="openai">OpenAI (GPT-4o-mini)</option>
            <option value="groq">Groq (Llama 3.3 70B)</option>
          </select>
        </ProcrastinatorBox>

        {/* API Key */}
        <ProcrastinatorBox>
          <ProcrastinatorBox className="flex items-center justify-between mb-1">
            <label className={styles.input.label}>API Key</label>
            <a
              href={getProviderDocLink()}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#2563EB] hover:underline flex items-center gap-1"
            >
              Obtener clave <ExternalLink className="w-3 h-3" />
            </a>
          </ProcrastinatorBox>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              placeholder={`Introduce tu clave de ${form.aiProvider.toUpperCase()}...`}
              value={form.apiKey}
              onChange={e => setForm({ ...form, apiKey: e.target.value })}
              className={`${styles.input.base} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-2.5 text-[#94A3B8] hover:text-[#0F172A]"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">
            Se almacena únicamente de manera local en tu máquina.
          </p>
        </ProcrastinatorBox>

        {/* GitHub Token opcional */}
        <ProcrastinatorBox>
          <ProcrastinatorBox className="flex items-center justify-between mb-1">
            <label className={styles.input.label}>GitHub Token (opcional, para repos privados o +cuota)</label>
            <a
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#2563EB] hover:underline flex items-center gap-1"
            >
              Crear token <ExternalLink className="w-3 h-3" />
            </a>
          </ProcrastinatorBox>
          <input
            type="password"
            placeholder="ghp_... o github_pat_... (opcional para repos públicos)"
            value={form.githubToken || ''}
            onChange={e => setForm({ ...form, githubToken: e.target.value })}
            className={styles.input.base}
          />
          <p className="text-[11px] text-[#94A3B8] mt-1">
            Sube el límite de GitHub de 60 a 5.000 peticiones/hora y permite leer repos privados. Para repos públicos también puedes pegar la ruta local de tu carpeta.
          </p>
        </ProcrastinatorBox>

        {/* Tono */}
        <ProcrastinatorBox>
          <label className={styles.input.label}>Exigencia del Copiloto</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'gentle', label: 'Empático' },
              { id: 'balanced', label: 'Equilibrado' },
              { id: 'tough_love', label: 'Exigente' }
            ].map(t => (
              <button
                type="button"
                key={t.id}
                onClick={() => setForm({ ...form, strictness: t.id as any })}
                className={`py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                  form.strictness === t.id
                    ? 'bg-[#EFF6FF] border-[#2563EB] text-[#2563EB]'
                    : 'bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </ProcrastinatorBox>

        {/* Botones */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E2E8F0]">
          <ProcrastinatorButton
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            Cancelar
          </ProcrastinatorButton>
          <ProcrastinatorButton
            type="submit"
            variant="primary"
          >
            {justSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{justSaved ? 'Guardado' : 'Guardar Ajustes'}</span>
          </ProcrastinatorButton>
        </div>
      </form>
    </ProcrastinatorModal>
  );
};
