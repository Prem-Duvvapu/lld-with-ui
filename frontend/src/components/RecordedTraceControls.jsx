import { useId } from 'react';
import './SimulationControls.css';
import './RecordedTrace.css';

export default function RecordedTraceControls({ playback }) {
  const headingId = useId();
  const { result, trace, position, loading, playing, speed, error, done } = playback;
  return (
    <section className="simulation-controls recorded-trace-controls" aria-labelledby={headingId}>
      <div className="simulation-controls-heading">
        <h3 id={headingId}>Recorded trace playback</h3>
        <span role="status">{loading ? 'Waiting for backend recording…' : !result ? 'No recording loaded' : !trace.length ? 'Recording has no events' : done ? 'Replay complete' : playing ? 'Playing recording' : 'Paused'} · {position}/{trace.length} events applied</span>
      </div>
      <progress value={position} max={trace.length || 1} aria-label="Trace replay progress" />
      <div className="simulation-controls-actions">
        <button type="button" onClick={playing ? playback.pause : playback.play} disabled={!result || loading || done}>{playing ? 'Pause' : 'Play'}</button>
        <button type="button" onClick={playback.previous} disabled={!result || loading || position === 0}>Previous event</button>
        <button type="button" onClick={playback.next} disabled={!result || loading || done}>Next event</button>
        <button type="button" onClick={playback.rewind} disabled={!result || loading || position === 0}>Rewind recording</button>
        <button type="button" onClick={() => playback.seek(trace.length)} disabled={!result || loading || done}>Show final state</button>
        <label>Playback speed<select value={speed} onChange={event => playback.setSpeed(Number(event.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option></select></label>
        {loading && <button type="button" onClick={playback.stopWaiting}>Stop waiting</button>}
      </div>
      <label className="recorded-trace-seek">Applied events: {position} of {trace.length}
        <input type="range" min="0" max={trace.length || 1} step="1" value={position} disabled={!result || loading || !trace.length} onChange={event => playback.seek(Number(event.target.value))} />
      </label>
      <p className="simulation-controls-note">This is a recording, not a live simulation. Pause, stepping, seeking, speed, and rewind only change what you see; they never call the backend or change recorded timestamps. A new experiment creates a new isolated run.</p>
      {loading && <p>The backend is collecting the full trace before returning it. Stopping the wait or leaving this tab does not guarantee that server-side work is cancelled.</p>}
      {error && <div className="simulation-controls-error" role="alert"><strong>{error}</strong><p>No automatic retry is made. {result ? 'Your previous recording is still available for replay.' : 'Run a new experiment when you are ready.'}</p></div>}
    </section>
  );
}
