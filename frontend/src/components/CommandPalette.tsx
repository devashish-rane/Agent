import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AgentPreview, CommandPayload, fetchAgentPreviews, submitCommand } from '../services/agentService';
import { useFeatureFlags } from '../contexts/FeatureFlagContext';

type Status = 'idle' | 'submitting' | 'submitted' | 'error';

const intents: CommandPayload['intent'][] = ['goal', 'task', 'note'];

const describeIntent = (intent: CommandPayload['intent']) =>
  intent === 'goal' ? 'Set direction' : intent === 'task' ? 'Action' : 'Capture';

const useHotkeys = (onOpen: () => void, onSubmit: () => void) => {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpen();
      }
      if (event.key === 'Enter' && event.altKey) {
        event.preventDefault();
        onSubmit();
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [onOpen, onSubmit]);
};

/**
 * CommandPalette renders a fully keyboard-driven capture flow. The hook above
 * keeps shortcuts minimal and production-ready (Ctrl/Cmd+K to focus, Alt+Enter
 * to submit). To avoid noisy failures in environments where the backend is not
 * available, submission errors are surfaced inline and recover gracefully.
 */
export const CommandPalette: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { flags } = useFeatureFlags();
  const [text, setText] = useState('');
  const [intent, setIntent] = useState<CommandPayload['intent']>('goal');
  const [status, setStatus] = useState<Status>('idle');
  const [previews, setPreviews] = useState<AgentPreview[]>([]);
  const [error, setError] = useState<string | null>(null);

  const currentHint = useMemo(() => {
    if (!text) return 'Hints: "Prepare for SDE-2", "Date on Friday in HSR"';
    return `Agents ready to assist: ${previews.map((p) => p.agent).join(', ') || 'calculating...'}`;
  }, [text, previews]);

  const focusInput = () => inputRef.current?.focus();
  const handleSubmit = async () => {
    if (!text.trim()) return;
    setStatus('submitting');
    setError(null);
    try {
      await submitCommand({ text, intent });
      setStatus('submitted');
      setText('');
      setPreviews([]);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unable to submit command');
    }
  };

  useHotkeys(focusInput, handleSubmit);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const run = async () => {
      if (!flags.showAgentPreview) return setPreviews([]);
      const data = await fetchAgentPreviews(text);
      if (active) setPreviews(data);
    };
    run();
    return () => {
      active = false;
      controller.abort();
    };
  }, [text, flags.showAgentPreview]);

  return (
    <section className="card" aria-label="Command palette">
      <header className="card-header">
        <div>
          <h2>Command Palette</h2>
          <p className="description">Capture goals, notes, and todos with smart defaults and agent previews.</p>
        </div>
        <kbd className="pill" aria-label="Shortcut">⌘/Ctrl + K</kbd>
      </header>
      <div className="command-row" role="form" aria-label="Command capture">
        <label className="sr-only" htmlFor="intent">Intent</label>
        <select
          id="intent"
          value={intent}
          onChange={(e) => setIntent(e.target.value as CommandPayload['intent'])}
          aria-label="Command intent"
        >
          {intents.map((value) => (
            <option key={value} value={value}>{`${value.toUpperCase()} — ${describeIntent(value)}`}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="command-text">Command text</label>
        <input
          id="command-text"
          ref={inputRef}
          placeholder="Type a goal, todo, or note"
          aria-label="Command input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setStatus('idle')}
        />
        <button className="primary" onClick={handleSubmit} disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Submitting…' : 'Submit'}
        </button>
        <kbd className="pill" aria-label="Submit shortcut">⌥ + Enter</kbd>
      </div>

      {error && <p className="error" role="alert">{error}</p>}
      {status === 'submitted' && <p className="success" role="status">Command captured and queued.</p>}

      {flags.showAgentPreview && previews.length > 0 && (
        <div className="preview-grid" role="list" aria-label="Agent previews">
          {previews.map((preview) => (
            <article key={preview.agent} className="preview" role="listitem">
              <header>
                <strong>{preview.agent}</strong>
                <span className="confidence">{Math.round(preview.confidence * 100)}%</span>
              </header>
              <p>{preview.summary}</p>
            </article>
          ))}
        </div>
      )}

      <small className="hint" role="status">{currentHint}</small>
    </section>
  );
};

export default CommandPalette;
