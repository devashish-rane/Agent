import React, { useEffect, useMemo, useRef, useState } from 'react';
import { fetchTimeline, TimelineEntry } from '../services/agentService';
import { useFeatureFlags } from '../contexts/FeatureFlagContext';

type Filter = 'All' | TimelineEntry['type'];

const statuses: TimelineEntry['status'][] = ['Active', 'Planned', 'Insight', 'Blocked'];

const intensityToColor = (value: number) => `rgba(124, 140, 255, ${0.2 + value * 0.5})`;

const useKeyboardNavigation = (ids: string[], onFocus: (id: string) => void) => {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const currentIndex = ids.findIndex((id) => document.activeElement?.id === `timeline-${id}`);
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const next = ids[Math.min(ids.length - 1, currentIndex + 1)];
        if (next) document.getElementById(`timeline-${next}`)?.focus();
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        const prev = ids[Math.max(0, currentIndex - 1)];
        if (prev) document.getElementById(`timeline-${prev}`)?.focus();
      }
      if (event.key === 'Enter' && currentIndex >= 0) {
        onFocus(ids[currentIndex]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [ids, onFocus]);
};

/**
 * Timeline renders a Dynamo-style projection with adaptive density: the heatmap
 * in the header increases the fidelity when the `timelineHeatmap` flag is on.
 * All rows are reachable by keyboard and filters reduce cognition on busy days.
 */
export const Timeline: React.FC = () => {
  const { flags } = useFeatureFlags();
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [filter, setFilter] = useState<Filter>('All');
  const [statusFilter, setStatusFilter] = useState<TimelineEntry['status'][]>(statuses);
  const lastFocused = useRef<string | null>(null);

  useEffect(() => {
    fetchTimeline().then(setEntries);
  }, []);

  const filtered = useMemo(() =>
    entries.filter(
      (entry) => (filter === 'All' || entry.type === filter) && statusFilter.includes(entry.status)
    ),
  [entries, filter, statusFilter]);

  useKeyboardNavigation(
    filtered.map((entry) => entry.id),
    (id) => (lastFocused.current = id)
  );

  return (
    <section className="card" aria-label="Timeline projection">
      <header className="card-header">
        <div>
          <h2>Timeline</h2>
          <p className="description">Adaptive history with keyboard navigation and insight heat.</p>
        </div>
        <div className="filters" aria-label="Timeline filters">
          <label>
            Type
            <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
              <option value="All">All</option>
              <option value="Goal">Goals</option>
              <option value="Task">Tasks</option>
              <option value="Snapshot">Snapshots</option>
            </select>
          </label>
          <label>
            Status
            <select
              value={statusFilter.join(',')}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value.split(',') as TimelineEntry['status'][]
                )
              }
            >
              <option value={statuses.join(',')}>All</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {flags.timelineHeatmap && (
        <div className="heatmap" aria-label="Attention heatmap">
          {entries.map((entry) => (
            <span
              key={`heat-${entry.id}`}
              className="heat-cell"
              title={`${entry.type}: ${Math.round(entry.heat * 100)} focus`}
              style={{ background: intensityToColor(entry.heat) }}
            />
          ))}
        </div>
      )}

      <div className="timeline" role="list">
        {filtered.map((entry) => (
          <div
            key={entry.id}
            id={`timeline-${entry.id}`}
            tabIndex={0}
            className="timeline-row"
            role="listitem"
            aria-label={`${entry.type} ${entry.content} status ${entry.status}`}
            data-active={entry.id === lastFocused.current}
          >
            <div className="meta">{entry.type}</div>
            <div className="content">{entry.content}</div>
            <div className="status">{entry.status}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Timeline;
