/**
 * The language context. The server always renders English; the saved choice is
 * read after mount, so server and client markup never disagree.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { readStoredLang, storeLang, translate, type Lang, type MessageKey } from "./i18n";

type LangValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
};

const LangContext = createContext<LangValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = readStoredLang();
    if (saved) setLangState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    storeLang(next);
  }, []);

  const value = useMemo<LangValue>(
    () => ({ lang, setLang, t: (key, vars) => translate(lang, key, vars) }),
    [lang, setLang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

/** Used when no provider is above a component: English, with one console warning. Never throws, so a provider slip cannot blank the page. */
const FALLBACK: LangValue = {
  lang: "en",
  setLang: () => {},
  t: (key, vars) => translate("en", key, vars),
};
let warned = false;

export function useLang(): LangValue {
  const value = useContext(LangContext);
  if (value) return value;
  if (!warned && typeof console !== "undefined") {
    warned = true;
    console.warn("useLang used outside LangProvider; falling back to English");
  }
  return FALLBACK;
}
