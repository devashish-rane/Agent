import React from 'react';

/**
 * Timeline mirrors the Dynamo-backed projection. This static view keeps the UI
 * concept visible even before wiring data, and its columns match the projection keys.
 */
export const Timeline: React.FC = () => (
  <section className="card">
    <h2>Timeline</h2>
    <div className="timeline">
      <div className="timeline-row">
        <div className="meta">Goal</div>
        <div className="content">Prepare for SDE-2 interviews</div>
        <div className="status">Active</div>
      </div>
      <div className="timeline-row">
        <div className="meta">Task</div>
        <div className="content">Day 3: Arrays + Strings drills</div>
        <div className="status">Planned</div>
      </div>
      <div className="timeline-row">
        <div className="meta">Snapshot</div>
        <div className="content">3/4 tasks done, load stable</div>
        <div className="status">Insight</div>
      </div>
    </div>
  </section>
);
