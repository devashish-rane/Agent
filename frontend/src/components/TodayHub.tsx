import React from 'react';

/**
 * TodayHub shows the daily intelligence set. Cards are short to keep the
 * cognitive load low when users open the app between meetings.
 */
export const TodayHub: React.FC = () => (
  <section className="card">
    <h2>Today Hub</h2>
    <ul className="list">
      <li>
        <span className="label">Focus</span>
        <span>System design drill + 45 minute code block</span>
      </li>
      <li>
        <span className="label">Quick Win</span>
        <span>Send scheduler email to mock interview partner</span>
      </li>
      <li>
        <span className="label">Insight</span>
        <span>Energy spikes at night; suggest late focus blocks.</span>
      </li>
    </ul>
  </section>
);
