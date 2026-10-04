import { useMemo, useState } from 'react';
import { useRecordedTrace } from '../../hooks/useRecordedTrace';
import RecordedTraceControls from '../../components/RecordedTraceControls';
import RecordedTraceLog from '../../components/RecordedTraceLog';
import { runMergeSort } from './api';
import '../../components/SimulationPanel.css';
import './MergeSortReplay.css';

const TASK_LABELS = {
  PARTITION: 'Partitioned', BASE_CASE: 'Base case', FORK_RIGHT: 'Right half forked',
  MERGE_START: 'Merging', MERGE_WRITE: 'Writing scratch buffer', MERGE_COMPLETE: 'Merge committed',
};
const ARRAY_WINDOW = 16;

function describeEvent(event) {
  const prefix = `#${event.sequence} · +${(event.elapsedNanos / 1000000).toFixed(1)} ms · ${event.threadName} · [${event.lo}, ${event.hi}]`;
  switch (event.type) {
    case 'PARTITION': return `${prefix} · PARTITION at ${event.mid}`;
    case 'BASE_CASE': return `${prefix} · BASE_CASE, no sorting needed`;
    case 'FORK_RIGHT': return `${prefix} · FORK_RIGHT, handed the right half to the pool`;
    case 'MERGE_START': return `${prefix} · MERGE_START`;
    case 'MERGE_WRITE': return `${prefix} · MERGE_WRITE ${event.value} to scratch index ${event.position}, from ${event.sourceSide}`;
    case 'MERGE_COMPLETE': return `${prefix} · MERGE_COMPLETE, copied this scratch range back to the array`;
    default: return `${prefix} · ${event.type}`;
  }
}

function ArrayView({ label, values, firstIndex, lastEvent, scratch }) {
  const maximum = Math.max(1, ...values.map(value => Math.abs(value ?? 0)));
  return (
    <div role="list" aria-label={label} className="merge-recording-array">
      {values.map((value, offset) => {
        const index = firstIndex + offset;
        const current = scratch
          ? lastEvent?.type === 'MERGE_WRITE' && lastEvent.position === index
          : lastEvent?.type === 'MERGE_COMPLETE' && index >= lastEvent.lo && index <= lastEvent.hi;
        return <div key={index} role="listitem" aria-label={`Index ${index}: ${value ?? 'not written'}${current ? ', selected event' : ''}`} className={`merge-recording-cell ${current ? 'current' : ''}`}>
          <span className="merge-recording-bar" aria-hidden="true" style={{ height: `${8 + (Math.abs(value ?? 0) / maximum) * 56}px` }} />
          <strong>{value ?? '—'}</strong><small>Index {index}</small>
        </div>;
      })}
    </div>
  );
}

export default function MergeSortReplay() {
  const [parameters, setParameters] = useState({ size: '12', parallelism: '4', sequentialThreshold: '2' });
  const [arrayPage, setArrayPage] = useState(0);
  const [follow, setFollow] = useState(true);
  const playback = useRecordedTrace(runMergeSort);
  const { result, trace, position, loading } = playback;
  const lastEvent = trace[position - 1];
  const recorded = useMemo(() => {
    const array = [...(result?.originalArray || [])];
    const scratch = Array(array.length).fill(null);
    const tasks = new Map();
    const workers = new Map([...new Set(trace.map(event => event.threadName))].map(name => [name, 'No applied events']));
    for (const event of trace.slice(0, position)) {
      const key = `${event.lo}:${event.hi}`;
      tasks.set(key, { ...tasks.get(key), lo: event.lo, hi: event.hi, mid: event.mid ?? tasks.get(key)?.mid, type: event.type, threadName: event.threadName });
      workers.set(event.threadName, `Last recorded: ${event.type}`);
      if (event.type === 'MERGE_WRITE') scratch[event.position] = event.value;
      if (event.type === 'MERGE_COMPLETE') {
        for (let index = event.lo; index <= event.hi; index++) array[index] = scratch[index];
      }
    }
    return { array, scratch, tasks, workers };
  }, [result, trace, position]);
  const pages = Math.max(1, Math.ceil(recorded.array.length / ARRAY_WINDOW));
  const currentPage = follow ? Math.floor((lastEvent?.position ?? lastEvent?.lo ?? 0) / ARRAY_WINDOW) : Math.min(arrayPage, pages - 1);
  const firstIndex = currentPage * ARRAY_WINDOW;
  return (
    <div className="simulation-panel recorded-trace-panel">
      <p className="simulation-panel-note">Run a real ForkJoinPool experiment once, then inspect its recorded partitions, worker events, and merges. Playback does not sort anything in the browser.</p>
      <form className="recorded-trace-form" onSubmit={event => {
        event.preventDefault();
        if (event.currentTarget.reportValidity()) void playback.run(Object.fromEntries(Object.entries(parameters).map(([key, value]) => [key, Number(value)])));
      }}>
        {[['size', 'Array size', 64], ['parallelism', 'Parallelism', 16], ['sequentialThreshold', 'Sequential threshold', 64]].map(([key, label, maximum]) => <label key={key}>{label}<input type="number" min="1" max={maximum} step="1" required value={parameters[key]} disabled={loading} onChange={event => setParameters(current => ({ ...current, [key]: event.target.value }))} /></label>)}
        <button type="submit" disabled={loading}>{loading ? 'Collecting backend recording…' : 'Run backend experiment'}</button>
      </form>
      <p className="simulation-panel-note">The threshold is the largest range processed without additional forks. Parallelism is the pool size, not a promise that every worker is used. This view accepts 1–64 elements and a threshold of 1–64; invalid inputs are reported, not silently clamped. The backend API supports larger arrays.</p>
      <RecordedTraceControls playback={playback} />
      {!result && <p className="simulation-panel-note">No recording yet. Array values, partitions, and worker names appear only after the backend returns a run.</p>}
      {result && <>
        <section className="simulation-panel-card" aria-label="Recorded merge sort state">
          <h3>Array and scratch buffer</h3>
          <p>Run {result.runId} · {result.size} elements · parallelism {result.parallelism} · sequential threshold {result.sequentialThreshold}</p>
          <p>{lastEvent ? describeEvent(lastEvent) : 'Before the first recorded event. The committed array is the original backend input.'}</p>
          {pages > 1 && <>
            <label className="merge-recording-follow"><input type="checkbox" checked={follow} onChange={event => setFollow(event.target.checked)} />Follow selected event</label>
            <div className="recorded-trace-pagination">
              <button type="button" disabled={currentPage === 0} onClick={() => { setFollow(false); setArrayPage(currentPage - 1); }}>Previous indices</button>
              <span>Indices {firstIndex}–{Math.min(recorded.array.length, firstIndex + ARRAY_WINDOW) - 1} of {recorded.array.length}</span>
              <button type="button" disabled={currentPage + 1 >= pages} onClick={() => { setFollow(false); setArrayPage(currentPage + 1); }}>Next indices</button>
            </div>
            <p>Both arrays share the same 16-index window. Following uses the selected write index or the start of its recorded task range.</p>
          </>}
          <h4>Committed array</h4>
          <ArrayView label="Committed array values" values={recorded.array.slice(firstIndex, firstIndex + ARRAY_WINDOW)} firstIndex={firstIndex} lastEvent={lastEvent} />
          <h4>Merge scratch buffer</h4>
          <ArrayView label="Scratch buffer values" values={recorded.scratch.slice(firstIndex, firstIndex + ARRAY_WINDOW)} firstIndex={firstIndex} lastEvent={lastEvent} scratch />
          <p>MERGE_WRITE writes scratch values only. MERGE_COMPLETE copies the recorded range into the committed array. An outline marks cells affected by the selected event; bars show magnitude, and labels preserve signed values. “—” means no scratch write has been applied.</p>
        </section>
        <section className="simulation-panel-card" aria-label="Recorded merge sort workers">
          <h3>Worker activity in the recording</h3>
          <p>These are backend thread names and their last applied event, not live worker or lock status.</p>
          <div className="simulation-panel-grid">{[...recorded.workers].map(([name, status]) => <div key={name}><h4>{name}</h4><p>{status}</p></div>)}</div>
        </section>
        <details className="simulation-panel-card">
          <summary>Recorded partition and merge tasks · {recorded.tasks.size} ranges</summary>
          <p>Only ranges encountered in applied backend events are shown. Each card reports the latest event for that range, not a predicted recursion tree.</p>
          {!recorded.tasks.size ? <p>No task events have been applied.</p> : <div className="simulation-panel-grid">{[...recorded.tasks].map(([key, task]) => <div key={key}>
            <h4>Range [{task.lo}, {task.hi}]</h4><p>{TASK_LABELS[task.type] || task.type} · {task.threadName}</p>
            {task.mid != null && <p>Recorded split: [{task.lo}, {task.mid}] and [{task.mid + 1}, {task.hi}]</p>}
          </div>)}</div>}
        </details>
        <details className="simulation-panel-card">
          <summary>Backend run summary and sorted result</summary>
          <dl><div><dt>Recorded duration</dt><dd>{result.durationMillis} ms</dd></div><div><dt>Distinct threads used</dt><dd>{result.distinctThreadsUsed}</dd></div></dl>
          <p>Sorted result reported by backend: {result.sortedArray.join(', ')}</p>
          <p>This completed-run result is independent of the selected replay event. No client-side sorting is performed.</p>
        </details>
        <RecordedTraceLog key={result.runId} trace={trace} position={position} describeEvent={describeEvent} />
      </>}
    </div>
  );
}
