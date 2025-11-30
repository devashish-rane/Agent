import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type AccessibilitySetting = {
  fontScale: number;
  highContrast: boolean;
  reduceMotion: boolean;
};

interface AccessibilityContextValue extends AccessibilitySetting {
  setFontScale: (value: number) => void;
  toggleHighContrast: () => void;
  toggleReduceMotion: () => void;
}

const STORAGE_KEY = 'frontier.accessibility.v1';

const defaultSettings: AccessibilitySetting = {
  fontScale: 1,
  highContrast: false,
  reduceMotion: false,
};

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined);

const persistSettings = (settings: AccessibilitySetting) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

export const AccessibilityProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySetting>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;
    try {
      return { ...defaultSettings, ...JSON.parse(raw) } as AccessibilitySetting;
    } catch {
      return defaultSettings;
    }
  });

  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', settings.fontScale.toString());
    document.documentElement.dataset.contrast = settings.highContrast ? 'high' : 'normal';
    document.documentElement.dataset.reduceMotion = settings.reduceMotion ? 'true' : 'false';
    persistSettings(settings);
  }, [settings]);

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      ...settings,
      setFontScale: (value) => setSettings((prev) => ({ ...prev, fontScale: Math.min(1.4, Math.max(0.85, value)) })),
      toggleHighContrast: () => setSettings((prev) => ({ ...prev, highContrast: !prev.highContrast })),
      toggleReduceMotion: () => setSettings((prev) => ({ ...prev, reduceMotion: !prev.reduceMotion })),
    }),
    [settings]
  );

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
};

export const useAccessibility = (): AccessibilityContextValue => {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error('useAccessibility must be used inside AccessibilityProvider');
  return ctx;
};
