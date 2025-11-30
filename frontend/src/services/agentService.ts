import { cachedFetch } from './apiClient';

export interface CommandPayload {
  text: string;
  intent: 'goal' | 'task' | 'note';
}

export interface AgentPreview {
  agent: string;
  confidence: number;
  summary: string;
}

export interface TimelineEntry {
  id: string;
  type: 'Goal' | 'Task' | 'Snapshot';
  content: string;
  status: 'Active' | 'Planned' | 'Insight' | 'Blocked';
  heat: number;
}

export interface TaskItem {
  id: string;
  label: string;
  done: boolean;
  category: 'Focus' | 'Quick Win' | 'Insight';
}

const API_ROOT = import.meta.env.VITE_API_ROOT ?? '/api';

export const submitCommand = async (payload: CommandPayload): Promise<{ id: string }> => {
  const url = `${API_ROOT}/commands`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Command submission failed: ${res.status} ${body}`);
  }
  return res.json();
};

export const fetchAgentPreviews = async (text: string): Promise<AgentPreview[]> => {
  if (!text.trim()) return [];
  try {
    const url = `${API_ROOT}/agent-preview?text=${encodeURIComponent(text)}`;
    const data = await cachedFetch<AgentPreview[]>(url, { cacheKey: `preview:${text}` });
    return data;
  } catch {
    // fall back to deterministic previews so UI is never empty and is testable
    return [
      { agent: 'Planner', confidence: 0.82, summary: 'Schedule slots and checkpoints automatically.' },
      { agent: 'Researcher', confidence: 0.61, summary: 'Gather context and best practices.' },
    ];
  }
};

export const fetchTimeline = async (): Promise<TimelineEntry[]> => {
  try {
    return await cachedFetch<TimelineEntry[]>(`${API_ROOT}/timeline`, { cacheKey: 'timeline', ttlMs: 1000 * 60 });
  } catch {
    return [
      { id: 'g1', type: 'Goal', content: 'Prepare for SDE-2 interviews', status: 'Active', heat: 0.84 },
      { id: 't1', type: 'Task', content: 'Day 3: Arrays + Strings drills', status: 'Planned', heat: 0.64 },
      { id: 's1', type: 'Snapshot', content: '3/4 tasks done, load stable', status: 'Insight', heat: 0.45 },
    ];
  }
};

export const fetchTasks = async (): Promise<TaskItem[]> => {
  try {
    return await cachedFetch<TaskItem[]>(`${API_ROOT}/tasks`, { cacheKey: 'tasks', ttlMs: 1000 * 30 });
  } catch {
    return [
      { id: 'focus', label: 'System design drill + 45 minute code block', done: false, category: 'Focus' },
      { id: 'quick', label: 'Send scheduler email to mock interview partner', done: true, category: 'Quick Win' },
      { id: 'insight', label: 'Energy spikes at night; suggest late focus blocks.', done: false, category: 'Insight' },
    ];
  }
};

export const updateTaskStatus = async (id: string, done: boolean) => {
  try {
    await fetch(`${API_ROOT}/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done }),
    });
  } catch (error) {
    console.warn('task status update failed; leaving UI optimistic', error);
  }
};
