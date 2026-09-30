import { useId } from 'react';
import './SimulationControls.css';

export default function SimulationControls({ steps, playback }) {
  const labelId = useId();
  const { completed, busy, playing, speed, error, done, next, reset, play, pause, setSpeed } = playback;
  const current = steps[Math.min(completed, steps.length - 1)];
  return (
    <section className="simulation-controls" aria-labelledby={labelId}>
      <div className="simulation-controls-heading">
        <h3 id={labelId}>Guided simulation</h3>
        <span role="status">{busy ? 'Waiting for backend…' : error ? 'Stopped after an error' : done ? 'Simulation complete' : playing ? 'Playing' : completed ? 'Paused' : 'Ready'} · {completed}/{steps.length} steps complete</span>
      </div>
      <progress value={completed} max={steps.length} aria-label="Simulation progress" />
      <p><strong>{done ? 'Completed: ' : 'Next: '}{current.title}</strong></p>
      <p>{current.detail || current.desc}</p>
      <div className="simulation-controls-actions">
        <button type="button" onClick={playing ? pause : play} disabled={done || Boolean(error)}>{playing ? 'Pause' : 'Play'}</button>
        <button type="button" onClick={next} disabled={busy || playing || done || Boolean(error)}>{completed ? 'Next step' : 'Start simulation'}</button>
        <button type="button" onClick={reset} disabled={busy}>Reset sandbox</button>
        <label>Playback speed
          <select value={speed} onChange={event => setSpeed(Number(event.target.value))}>
            <option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option>
          </select>
        </label>
      </div>
      <p className="simulation-controls-note">Pause stops upcoming steps, not a request already sent. Speed changes the delay between steps, not backend time. Reset runs the first step again.</p>
      {error && <div role="alert" className="simulation-controls-error"><strong>{error}</strong><p>The server may have received this action. Reset the sandbox before continuing; actions are not automatically retried.</p></div>}
    </section>
  );
}
