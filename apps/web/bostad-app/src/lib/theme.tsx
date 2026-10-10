/**
 * The theme context: light, dark, or follow the system (the default). The
 * choice lives in localStorage (try/catch, a per-browser convenience only). An
 * explicit choice sets data-theme on <html>; "system" removes it, so the
 * prefers-color-scheme rule in tokens.css decides. THEME_SCRIPT runs in <head>
 * before first paint so the page never flashes the wrong theme.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ThemePref = "light" | "dark" | "system";
export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "bostad.theme";
export const THEME_PREFS: ThemePref[] = ["light", "dark", "system"];

/** Inline in <head>. Mirrors applyPref below; keep the two in step. */
export const THEME_SCRIPT = `(function(){try{var m=localStorage.getItem("${THEME_STORAGE_KEY}");if(m==="light"||m==="dark"){document.documentElement.setAttribute("data-theme",m);}}catch(e){}})();`;

function readStoredPref(): ThemePref {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function storePref(pref: ThemePref): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    /* private window or blocked storage: the choice just lasts this page view */
  }
}

function applyPref(pref: ThemePref): void {
  const root = document.documentElement;
  if (pref === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", pref);
}

type ThemeValue = {
  pref: ThemePref;
  /** What is actually on screen right now (system resolved). */
  effective: Theme;
  setPref: (pref: ThemePref) => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Server and first client render agree on "system"; the saved choice is read after mount.
  const [pref, setPrefState] = useState<ThemePref>("system");
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    setPrefState(readStoredPref());
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(media.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => applyPref(pref), [pref]);

  const setPref = useCallback((next: ThemePref) => {
    setPrefState(next);
    storePref(next);
  }, []);

  const value = useMemo<ThemeValue>(
    () => ({
      pref,
      effective: pref === "system" ? (systemDark ? "dark" : "light") : pref,
      setPref,
    }),
    [pref, systemDark, setPref],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}
