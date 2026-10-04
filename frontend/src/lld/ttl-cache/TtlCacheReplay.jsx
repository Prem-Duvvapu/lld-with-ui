import { useMemo, useState } from 'react';
import { useRecordedTrace } from '../../hooks/useRecordedTrace';
import RecordedTraceControls from '../../components/RecordedTraceControls';
import RecordedTraceLog from '../../components/RecordedTraceLog';
import { runTtlCache } from './api';
import '../../components/SimulationPanel.css';

function describeEvent(event) {
  const prefix = `#${event.sequence} · +${(event.elapsedNanos / 1000000).toFixed(1)} ms · ${event.threadName}`;
  switch (event.type) {
    case 'PUT': return `${prefix} · PUT ${event.key} = ${event.value} · TTL ${event.ttlMillis} ms · size ${event.cacheSize}`;
    case 'GET_HIT': return `${prefix} · GET ${event.key}: HIT ${event.value}`;
    case 'GET_MISS_NOT_FOUND': return `${prefix} · GET ${event.key}: MISS, key not found`;
    case 'GET_MISS_EXPIRED': return `${prefix} · GET ${event.key}: MISS, expired entry removed lazily on read`;
    case 'BACKGROUND_EVICTION': return `${prefix} · Background sweeper removed ${event.key} · size ${event.cacheSize}`;
    default: return `${prefix} · ${event.type}`;
  }
}

export default function TtlCacheReplay() {
  const [sweepInterval, setSweepInterval] = useState('600');
  const playback = useRecordedTrace(runTtlCache);
  const { result, trace, position, loading } = playback;
  const lastEvent = trace[position - 1];
  const entries = useMemo(() => {
    const recorded = new Map();
    for (const event of trace.slice(0, position)) {
      if (event.type === 'PUT') recorded.set(event.key, { value: event.value, ttlMillis: event.ttlMillis });
      if (event.type === 'GET_MISS_EXPIRED' || event.type === 'BACKGROUND_EVICTION') recorded.delete(event.key);
    }
    return [...recorded.entries()].sort(([left], [right]) => left.localeCompare(right));
  }, [trace, position]);
  return (
    <div className="simulation-panel recorded-trace-panel">
      <p className="simulation-panel-note">Run a real Java TTL-cache experiment once, then inspect its recording at your own pace. Replay is not a live cache or a wall-clock countdown.</p>
      <form className="recorded-trace-form" onSubmit={event => {
        event.preventDefault();
        if (event.currentTarget.reportValidity()) void playback.run({ sweepIntervalMillis: Number(sweepInterval) });
      }}>
        <label>Sweep interval (ms)<input type="number" min="50" max="5000" step="1" required value={sweepInterval} disabled={loading} onChange={event => setSweepInterval(event.target.value)} /></label>
        <button type="submit" disabled={loading}>{loading ? 'Collecting backend recording…' : 'Run backend experiment'}</button>
      </form>
      <RecordedTraceControls playback={playback} />
      {!result && <p className="simulation-panel-note">No recording yet. The backend owns expiration, lazy removal, and the background sweeper.</p>}
      {result && <>
        <section className="simulation-panel-card" aria-label="Recorded TTL cache state">
          <h3>Recorded cache entries · {entries.length} present</h3>
          <p>Run {result.runId} · actual sweep interval: {result.sweepIntervalMillis} ms</p>
          <p>{lastEvent ? describeEvent(lastEvent) : 'Before the first recorded event. No puts have been applied to the view.'}</p>
          <p>Entries disappear only when an applied backend event records their removal. Waiting or changing replay speed does not expire anything here.</p>
          {!entries.length ? <p className="simulation-panel-note">No entries are present at this point in the recording.</p> : <div className="simulation-panel-grid">
            {entries.map(([key, entry]) => <div key={key}><h4>{key}</h4><dl><div><dt>Recorded value</dt><dd>{entry.value}</dd></div><div><dt>Configured TTL</dt><dd>{entry.ttlMillis} ms</dd></div></dl></div>)}
          </div>}
        </section>
        <details className="simulation-panel-card">
          <summary>Backend run summary</summary>
          <dl><div><dt>Recorded duration</dt><dd>{result.durationMillis} ms</dd></div><div><dt>Puts / gets</dt><dd>{result.totalPuts} / {result.totalGets}</dd></div><div><dt>Final entry count reported by backend</dt><dd>{result.finalCacheSize}</dd></div></dl>
          <p>The experiment has already finished. This summary belongs to the recorded run, not the currently selected replay event.</p>
        </details>
        <RecordedTraceLog key={result.runId} trace={trace} position={position} describeEvent={describeEvent} />
      </>}
    </div>
  );
}
