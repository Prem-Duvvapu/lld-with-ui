import { useMemo, useState } from 'react';
import { useRecordedTrace } from '../../hooks/useRecordedTrace';
import RecordedTraceControls from '../../components/RecordedTraceControls';
import RecordedTraceLog from '../../components/RecordedTraceLog';
import { runConcurrentHashMap } from './api';
import '../../components/SimulationPanel.css';
import './ConcurrentHashMapReplay.css';

const FIELDS = [
  ['segments', 'Segments per map', '6', 32],
  ['threads', 'Increment threads', '4', 24],
  ['incrementsPerThread', 'Increments per thread', '5', 200],
  ['distinctKeys', 'Distinct counter keys', '3', 16],
  ['computeRacers', 'Compute racers', '5', 24],
];
const SCOPES = ['COUNTERS', 'CONFIG'];
const SEGMENT_PAGE_SIZE = 8;

async function executeMapRun(parameters, options) {
  const result = await runConcurrentHashMap(parameters, options);
  if (Array.isArray(result?.trace) && result.trace.some(event => !SCOPES.includes(event.mapScope))) {
    throw new Error('This recording lacks map-source telemetry. Update the backend and run again.');
  }
  return result;
}

function describeEvent(event) {
  return `#${event.sequence} · +${(event.elapsedNanos / 1000000).toFixed(1)} ms · ${event.mapScope} map · segment ${event.segmentIndex} · ${event.threadName} · ${event.type}${event.key != null ? ` · ${event.key}` : ''}${event.valueAfter != null ? ` = ${event.valueAfter}` : ''}`;
}

export default function ConcurrentHashMapReplay() {
  const [draft, setDraft] = useState(Object.fromEntries(FIELDS.map(([field, , initial]) => [field, initial])));
  const [selectedScope, setSelectedScope] = useState('COUNTERS');
  const [page, setPage] = useState(0);
  const [follow, setFollow] = useState(true);
  const playback = useRecordedTrace(executeMapRun);
  const { result, trace, position, loading } = playback;
  const lastEvent = trace[position - 1];
  const observed = useMemo(() => {
    const maps = new Map(SCOPES.map(scope => [scope, Array.from({ length: result?.segments || 0 }, () => ({ entries: new Map(), lockEvent: null }))]));
    let computations = 0;
    for (const event of trace.slice(0, position)) {
      const segment = maps.get(event.mapScope)?.[event.segmentIndex];
      if (!segment) continue;
      if (['PUT_SUCCESS', 'MERGE_SUCCESS', 'COMPUTE_IF_ABSENT_COMPUTED'].includes(event.type)) segment.entries.set(event.key, event.valueAfter);
      if (event.type === 'REMOVE_SUCCESS') segment.entries.delete(event.key);
      if (['SEGMENT_LOCK_ACQUIRED', 'SEGMENT_LOCK_RELEASED'].includes(event.type)) segment.lockEvent = event;
      if (event.type === 'COMPUTE_IF_ABSENT_COMPUTED') computations++;
    }
    return { maps, computations };
  }, [trace, position, result]);
  const scope = follow ? lastEvent?.mapScope || 'COUNTERS' : selectedScope;
  const segments = observed.maps.get(scope);
  const pages = Math.max(1, Math.ceil(segments.length / SEGMENT_PAGE_SIZE));
  const currentPage = follow ? Math.floor((lastEvent?.segmentIndex || 0) / SEGMENT_PAGE_SIZE) : Math.min(page, pages - 1);
  const first = currentPage * SEGMENT_PAGE_SIZE;
  return <div className="simulation-panel recorded-trace-panel">
    <p className="simulation-panel-note">The backend runs two independent striped maps: counters in Phase A and configuration in Phase B. Each has its own segment locks. Explicit map-source telemetry keeps their entries and lock observations separate.</p>
    <form className="recorded-trace-form" onSubmit={event => {
      event.preventDefault();
      if (event.currentTarget.reportValidity()) void playback.run(Object.fromEntries(FIELDS.map(([field]) => [field, Number(draft[field])])));
    }}>
      {FIELDS.map(([field, label, , maximum]) => <label key={field}>{label}<input type="number" required min="1" max={maximum} step="1" value={draft[field]} disabled={loading} onChange={event => setDraft(current => ({ ...current, [field]: event.target.value }))} /></label>)}
      <button type="submit" disabled={loading}>{loading ? 'Collecting backend recording…' : 'Run backend experiment'}</button>
    </form>
    <RecordedTraceControls playback={playback} />
    {!result && <p className="simulation-panel-note">No recording yet. Draft settings do not allocate maps or generate threads.</p>}
    {result && <>
      <section className="simulation-panel-card" aria-label="Selected map event">
        <h3>Concurrent HashMap recording</h3>
        <p>Run {result.runId} · actual {result.segments} segments per map · {result.threads} increment threads · {result.incrementsPerThread} increments per thread · {result.distinctKeys} counter keys · {result.computeRacers} compute racers</p>
        <p>{lastEvent ? describeEvent(lastEvent) : 'Before the first recorded event. Both maps have no applied entries or lock observations.'}</p>
        <p>Completed compute events applied: {observed.computations}</p>
      </section>
      <section className="simulation-panel-card" aria-label="Recorded map inspector">
        <div className="map-recording-options">
          <label>Map to inspect<select value={scope} onChange={event => { setSelectedScope(event.target.value); setPage(0); setFollow(false); }}><option value="COUNTERS">Counters · Phase A</option><option value="CONFIG">Configuration · Phase B</option></select></label>
          <label className="map-recording-follow"><input type="checkbox" checked={follow} onChange={event => { setSelectedScope(scope); setPage(currentPage); setFollow(event.target.checked); }} />Follow selected event</label>
        </div>
        <h3>{scope === 'COUNTERS' ? 'Counters map' : 'Configuration map'}</h3>
        <p>Entries come only from applied successful mutation events. Lock labels describe observations, not live ownership: RELEASED is recorded before the backend unlocks.</p>
        {pages > 1 && <div className="recorded-trace-pagination">
          <button type="button" disabled={currentPage === 0} onClick={() => { setSelectedScope(scope); setFollow(false); setPage(currentPage - 1); }}>Previous segments</button>
          <span>Segment page {currentPage + 1} of {pages}</span>
          <button type="button" disabled={currentPage + 1 >= pages} onClick={() => { setSelectedScope(scope); setFollow(false); setPage(currentPage + 1); }}>Next segments</button>
        </div>}
        <div role="list" aria-label={`${scope} map segments`} className="simulation-panel-grid">
          {segments.slice(first, first + SEGMENT_PAGE_SIZE).map((segment, offset) => {
            const index = first + offset;
            return <div key={`${scope}-${index}`} role="listitem" className={lastEvent?.mapScope === scope && lastEvent.segmentIndex === index ? 'map-recording-selected' : ''}>
              <h4>Segment {index}</h4>
              <p>{!segment.lockEvent ? 'No applied lock observations' : `${segment.lockEvent.type === 'SEGMENT_LOCK_ACQUIRED' ? 'Recorded acquisition by' : 'Release announced by'} ${segment.lockEvent.threadName}`}</p>
              {!segment.entries.size ? <p>No applied entries</p> : <dl>{[...segment.entries].map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>}
            </div>;
          })}
        </div>
      </section>
      <details className="simulation-panel-card">
        <summary>Backend run summary</summary>
        <dl><div><dt>Recorded duration</dt><dd>{result.durationMillis} ms</dd></div><div><dt>Total increments</dt><dd>{result.totalIncrements}</dd></div><div><dt>Final counter sum</dt><dd>{result.sumOfFinalCounters}</dd></div><div><dt>Mapping function executions</dt><dd>{result.computeExecutions}</dd></div></dl>
        <p>These completed-run metrics come from the backend, independently of the selected replay event. The browser does not calculate hashes, select locks, or prove a race outcome.</p>
      </details>
      <RecordedTraceLog key={result.runId} trace={trace} position={position} describeEvent={describeEvent} />
    </>}
  </div>;
}
