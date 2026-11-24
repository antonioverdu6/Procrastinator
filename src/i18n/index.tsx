import React, { createContext, useContext } from 'react';
import { es } from './es';
import { en } from './en';

export type Language = 'es' | 'en';
export type Translations = typeof es;

const DICTIONARIES: Record<Language, Translations> = { es, en };

const I18nContext = createContext<{ lang: Language; t: Translations }>({
  lang: 'es',
  t: es,
});

export const I18nProvider: React.FC<{ language?: Language; children: React.ReactNode }> = ({
  language = 'es',
  children,
}) => {
  const lang: Language = language === 'en' ? 'en' : 'es';
  const t = DICTIONARIES[lang];
  return <I18nContext.Provider value={{ lang, t }}>{children}</I18nContext.Provider>;
};

export function useI18n() {
  return useContext(I18nContext);
}

export function formatMsg(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (acc, [key, val]) => acc.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val)),
    template
  );
}
