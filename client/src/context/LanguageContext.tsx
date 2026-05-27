import { createContext, useContext, useState, type ReactNode } from 'react';

export const SUPPORTED_LANGS = [
  { code: 'fr', label: 'Français',  flag: '🇫🇷' },
  { code: 'en', label: 'English',   flag: '🇬🇧' },
  { code: 'es', label: 'Español',   flag: '🇪🇸' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'de', label: 'Deutsch',   flag: '🇩🇪' },
  { code: 'it', label: 'Italiano',  flag: '🇮🇹' },
] as const;

export type LangCode = (typeof SUPPORTED_LANGS)[number]['code'];

interface LanguageContextValue {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
}

const LanguageContext = createContext<LanguageContextValue>({ lang: 'fr', setLang: () => {} });

function getInitialLang(): LangCode {
  const stored = localStorage.getItem('app_lang') as LangCode | null;
  if (stored && SUPPORTED_LANGS.some((l) => l.code === stored)) return stored;
  const browser = navigator.language.split('-')[0].toLowerCase() as LangCode;
  return SUPPORTED_LANGS.some((l) => l.code === browser) ? browser : 'fr';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(getInitialLang);

  function setLang(code: LangCode) {
    setLangState(code);
    localStorage.setItem('app_lang', code);
  }

  return <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>;
}

export const useLang = () => useContext(LanguageContext);
