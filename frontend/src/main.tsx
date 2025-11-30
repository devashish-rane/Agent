import React from 'react';
import ReactDOM from 'react-dom/client';
import { CommandPalette } from './components/CommandPalette';
import { TodayHub } from './components/TodayHub';
import { Timeline } from './components/Timeline';
import './styles.css';

const App = () => (
  <div className="app-shell">
    <header className="app-header">
      <h1>Frontier Agent</h1>
      <p className="subtitle">Contextual Personal Growth OS</p>
    </header>
    <div className="layout">
      <CommandPalette />
      <TodayHub />
      <Timeline />
    </div>
  </div>
);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
