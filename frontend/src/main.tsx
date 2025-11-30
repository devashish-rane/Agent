import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Accent, ThemeContext, ThemeProvider } from './designSystem/theme';
import { AccessibilityProvider, useAccessibility } from './contexts/AccessibilityContext';
import { FeatureFlagProvider } from './contexts/FeatureFlagContext';
import './styles.css';

const CommandPalette = React.lazy(() => import('./components/CommandPalette'));
const TodayHub = React.lazy(() => import('./components/TodayHub'));
const Timeline = React.lazy(() => import('./components/Timeline'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ThemeSwitcher: React.FC = () => {
  const theme = React.useContext(ThemeContext);
  if (!theme) return null;
  const { mode, setMode, accent, setAccent } = theme;
  return (
    <div className="switcher" aria-label="Theme controls">
      <button className="ghost" onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}>
        {mode === 'dark' ? 'Light' : 'Dark'} mode
      </button>
      <select value={accent} onChange={(e) => setAccent(e.target.value as Accent)} aria-label="Accent color">
        <option value="indigo">Indigo</option>
        <option value="teal">Teal</option>
        <option value="sunrise">Sunrise</option>
      </select>
    </div>
  );
};

const AccessibilitySwitcher: React.FC = () => {
  const { fontScale, setFontScale, highContrast, toggleHighContrast, reduceMotion, toggleReduceMotion } =
    useAccessibility();
  return (
    <div className="switcher" aria-label="Accessibility controls">
      <button className="ghost" onClick={() => setFontScale(fontScale + 0.05)}>Font +</button>
      <button className="ghost" onClick={() => setFontScale(fontScale - 0.05)}>Font -</button>
      <label className="toggle">
        <input type="checkbox" checked={highContrast} onChange={toggleHighContrast} /> High contrast
      </label>
      <label className="toggle">
        <input type="checkbox" checked={reduceMotion} onChange={toggleReduceMotion} /> Reduce motion
      </label>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AccessibilityProvider>
        <FeatureFlagProvider>
          <div className="app-shell">
            <header className="app-header">
              <div>
                <h1>Frontier Agent</h1>
                <p className="subtitle">Contextual Personal Growth OS</p>
              </div>
              <div className="settings" aria-label="Appearance toggles">
                <ThemeSwitcher />
                <AccessibilitySwitcher />
              </div>
            </header>
            <div className="layout">
              <Suspense fallback={<div className="skeleton" aria-label="Loading command palette" />}>
                <CommandPalette />
              </Suspense>
              <Suspense fallback={<div className="skeleton" aria-label="Loading today hub" />}>
                <TodayHub />
              </Suspense>
              <Suspense fallback={<div className="skeleton" aria-label="Loading timeline" />}>
                <Timeline />
              </Suspense>
            </div>
              <footer className="helper-text">
                Config is pulled from AppConfig/SSM when available; see console for fallbacks.
              </footer>
          </div>
        </FeatureFlagProvider>
      </AccessibilityProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
