import React, { useState } from 'react';
import { UserSettings } from '../../types';
import { api } from '../../services/api';
import { ProcrastinatorModal } from '../ProcrastinatorModal';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorButton } from '../ProcrastinatorButton';
import { ProcrastinatorInput } from '../ProcrastinatorInput';
import { ProcrastinatorText } from '../ProcrastinatorText';
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
        <ProcrastinatorBox variant="stack-sm">
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
        <ProcrastinatorBox variant="stack-sm">
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
        <ProcrastinatorBox variant="stack-sm">
          <ProcrastinatorBox variant="row-between">
            <label className={styles.input.label}>Clave de API ({form.aiProvider.toUpperCase()})</label>
            <a
              href={getProviderDocLink()}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#2563EB] hover:underline flex items-center gap-1"
            >
              <span>Obtener clave gratis</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </ProcrastinatorBox>

          <div className="relative">
            <ProcrastinatorInput
              type={showKey ? 'text' : 'password'}
              placeholder="Pega tu clave (ej. AIzaSy...)"
              value={form.apiKey || ''}
              onChange={e => setForm({ ...form, apiKey: e.target.value })}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-2.5 text-[#94A3B8] hover:text-[#0F172A]"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <ProcrastinatorText variant="caption">
            Tu clave se guarda localmente en tu base de datos SQLite y nunca sale de tu ordenador. Si la dejas vacía, la app funcionará con el copiloto técnico offline.
          </ProcrastinatorText>
        </ProcrastinatorBox>

        {/* Estilo del Copiloto */}
        <ProcrastinatorBox variant="stack-sm">
          <label className={styles.input.label}>Tono del Copiloto</label>
          <select
            value={form.strictness}
            onChange={e => setForm({ ...form, strictness: e.target.value as any })}
            className={styles.input.select}
          >
            <option value="gentle">Comprensivo y paciente</option>
            <option value="balanced">Equilibrado y realista (Recomendado)</option>
            <option value="tough_love">Estricto / Directo (Cero excusas)</option>
          </select>
        </ProcrastinatorBox>

        {/* Botones */}
        <ProcrastinatorBox variant="row-end" className="pt-4 border-t border-[#E2E8F0]">
          <ProcrastinatorButton
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            Cancelar
          </ProcrastinatorButton>

          <ProcrastinatorButton
            type="submit"
            variant={justSaved ? 'success' : 'primary'}
          >
            {justSaved ? (
              <>
                <Check className="w-4 h-4" />
                <span>¡Guardado!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar Ajustes</span>
              </>
            )}
          </ProcrastinatorButton>
        </ProcrastinatorBox>
      </form>
    </ProcrastinatorModal>
  );
};
