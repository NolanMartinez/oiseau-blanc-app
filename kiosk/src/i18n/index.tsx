import { createContext, useContext, useState, type ReactNode } from "react";
import {
  SUPPORTED_LANGS,
  translations,
  type LangCode,
  type TranslationKey,
} from "./translations";

interface LangContextType {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const LangContext = createContext<LangContextType | null>(null);

const LS_KEY = "friggo_kiosk_lang";

function initialLang(): LangCode {
  const saved = localStorage.getItem(LS_KEY) as LangCode | null;
  if (saved && SUPPORTED_LANGS.some((l) => l.code === saved)) return saved;
  return "fr";
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(initialLang);

  function setLang(l: LangCode) {
    setLangState(l);
    localStorage.setItem(LS_KEY, l);
  }

  function t(key: TranslationKey, vars?: Record<string, string | number>): string {
    const dict = translations[lang] ?? translations.fr;
    let str: string = dict[key] ?? translations.fr[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return str;
  }

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextType {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}

export { SUPPORTED_LANGS };
export type { LangCode, TranslationKey };
