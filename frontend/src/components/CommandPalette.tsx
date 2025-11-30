import React from 'react';

/**
 * CommandPalette surfaces quick capture and agent triggers. The layout is
 * intentionally terse so it works well on both desktop and narrow mobile shells.
 */
export const CommandPalette: React.FC = () => (
  <section className="card">
    <h2>Command Palette</h2>
    <p className="description">Capture goals, notes, and todos with smart defaults and agent previews.</p>
    <div className="command-row">
      <input placeholder="Type a goal, todo, or note" aria-label="command input" />
      <button className="primary">Submit</button>
    </div>
    <small className="hint">Hints: "Prepare for SDE-2", "Date on Friday in HSR"</small>
  </section>
);
