import React, { useEffect, useMemo, useState } from 'react';
import { fetchTasks, TaskItem, updateTaskStatus } from '../services/agentService';
import { useFeatureFlags } from '../contexts/FeatureFlagContext';

const categoryOrder: TaskItem['category'][] = ['Focus', 'Quick Win', 'Insight'];

const Nudges: React.FC = () => (
  <div className="nudge" role="note" aria-label="Experimental nudges">
    <div>
      <strong>Experimental nudge</strong>
      <p>Shift one block later today based on late-night energy pattern.</p>
    </div>
    <button className="ghost" onClick={() => console.info('Nudge accepted for experimentation')}>Adopt</button>
  </div>
);

/**
 * TodayHub renders the live daily plan with optimistic updates. Experimental
 * nudges are wrapped in a feature flag to keep rollouts blast-radius aware.
 */
export const TodayHub: React.FC = () => {
  const { flags } = useFeatureFlags();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [filter, setFilter] = useState<'all' | TaskItem['category']>('all');

  useEffect(() => {
    fetchTasks().then(setTasks);
  }, []);

  const filtered = useMemo(() =>
    tasks.filter((task) => filter === 'all' || task.category === filter),
  [tasks, filter]);

  const toggleTask = (task: TaskItem) => {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)));
    updateTaskStatus(task.id, !task.done);
  };

  return (
    <section className="card">
      <header className="card-header">
        <div>
          <h2>Today Hub</h2>
          <p className="description">Live focus plan with interactive controls.</p>
        </div>
        <label className="filter-inline">
          Filter
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <option value="all">All</option>
            {categoryOrder.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
      </header>
      <ul className="list" aria-label="Today tasks">
        {filtered.map((task) => (
          <li key={task.id}>
            <label className="task-row">
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => toggleTask(task)}
                aria-label={`Mark ${task.label} as ${task.done ? 'not done' : 'done'}`}
              />
              <span className="label">{task.category}</span>
              <span className={task.done ? 'completed' : ''}>{task.label}</span>
            </label>
          </li>
        ))}
      </ul>

      {flags.experimentalNudges && <Nudges />}
    </section>
  );
};

export default TodayHub;
