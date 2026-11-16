import React, { useState } from 'react';
import { UserSettings } from '../../types';
import { StorageService } from '../../services/storageService';
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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveSettings(form);
    onSaved(form);
    setJustSaved(true);
    setTimeout(() => {
      setJustSaved(false);
      onClose();
    }, 500);
  };

  const getProviderDocLink = () => {
    if (form.aiProvider === 'gemini') return 'https://aistudio.google.com/app/apikey';
    if (form.aiProvider === 'groq') return 'https://console.groq.com/keys';
    return 'https://platform.openai.com/api-keys';
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 w-full max-w-lg shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#2563EB]" />
            <h3 className={styles.typography.h2}>Configuración</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#94A3B8] hover:text-[#0F172A] p-1 rounded-lg text-sm"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {/* Capacidad Diaria */}
          <div>
            <label className={styles.input.label}>Capacidad Diaria Habitual</label>
            <p className="text-xs text-[#64748B] mb-1.5">
              Horas que dedicas normalmente al día a tus desarrollos.
            </p>
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
          </div>

          {/* Proveedor de IA */}
          <div>
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
          </div>

          {/* API Key */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={styles.input.label}>API Key</label>
              <a
                href={getProviderDocLink()}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#2563EB] hover:underline flex items-center gap-1"
              >
                Obtener clave <ExternalLink className="w-3 h-3" />
              </a>
            </div>
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
          </div>

          {/* Tono */}
          <div>
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
          </div>

          {/* Botones */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={onClose}
              className={styles.button.ghost}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.button.primary}
            >
              {justSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{justSaved ? 'Guardado' : 'Guardar Ajustes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
