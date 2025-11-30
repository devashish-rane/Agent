import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'light' | 'dark';
export type Accent = 'indigo' | 'teal' | 'sunrise';

interface ThemeContextValue {
  mode: ThemeMode;
  accent: Accent;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: Accent) => void;
}

const prefersDark = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;

const THEME_STORAGE_KEY = 'frontier.theme.v1';
const ACCENT_STORAGE_KEY = 'frontier.accent.v1';

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const accentPalettes: Record<Accent, { primary: string; glow: string }> = {
  indigo: { primary: '#7c8cff', glow: '#a48bfe' },
  teal: { primary: '#2dd4bf', glow: '#22d3ee' },
  sunrise: { primary: '#fb923c', glow: '#f97316' },
};

/**
 * ThemeProvider propagates design tokens through CSS custom properties. The
 * context is intentionally thin so it can be tree-shaken when consumers only
 * import the CSS variables. Persistence is split across theme+accent so we can
 * safely roll back either in the future without clobbering both keys.
 */
export const ThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (stored === 'light' || stored === 'dark') return stored;
    return prefersDark() ? 'dark' : 'light';
  });
  const [accent, setAccentState] = useState<Accent>(() => {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY) as Accent | null;
    return stored ?? 'indigo';
  });

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
  }, []);

  const setAccent = useCallback((next: Accent) => {
    setAccentState(next);
    localStorage.setItem(ACCENT_STORAGE_KEY, next);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    const palette = accentPalettes[accent];
    document.documentElement.style.setProperty('--accent', palette.primary);
    document.documentElement.style.setProperty('--accent-strong', palette.glow);
  }, [mode, accent]);

  const value = useMemo(
    () => ({ mode, setMode, accent, setAccent }),
    [mode, accent, setMode, setAccent]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};

export const themeOptions: Accent[] = ['indigo', 'teal', 'sunrise'];
