import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { translations } from '../i18n/translations';

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
  t: (key: string, count?: number) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'fr',
  setLang: () => {},
  t: (key) => key,
});

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

  const t = useCallback((key: string, count?: number): string => {
    const dict = (translations[lang] ?? translations.fr) as Record<string, string>;
    if (count !== undefined) {
      const pluralKey = count === 1 ? `${key}_one` : `${key}_other`;
      const str = dict[pluralKey] ?? dict[key] ?? key;
      return str.replace('{{count}}', String(count));
    }
    return dict[key] ?? key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);
