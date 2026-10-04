import { useMemo, useState } from 'react';
import { useRecordedTrace } from '../hooks/useRecordedTrace';
import RecordedTraceControls from './RecordedTraceControls';
import RecordedTraceLog from './RecordedTraceLog';
import './SimulationPanel.css';
import './RecordedOrderingReplay.css';

const SCENES = {
  'foo-bar': { name: 'FooBar', field: 'n', label: 'Repetitions', initial: '5', maximum: 1000, tokenField: 'item', printed: ['FOO_PRINTED', 'BAR_PRINTED'], explanation: 'Two real threads alternate using foo and bar semaphores. Printed events precede the handoff release; no permit count or next running thread is inferred.' },
  'zero-even-odd': { name: 'Zero Even Odd', field: 'n', label: 'Upper bound', initial: '10', maximum: 2000, tokenField: 'token', printed: ['ZERO_PRINTED', 'ODD_PRINTED', 'EVEN_PRINTED'], explanation: 'Three real threads coordinate zero, odd, and even output with semaphores. The browser displays recorded tokens; it does not calculate parity or generate the next number.' },
  'fizz-buzz': { name: 'FizzBuzz', field: 'n', label: 'Upper bound', initial: '20', maximum: 3000, tokenField: 'token', printed: ['NUMBER_PRINTED', 'FIZZ_PRINTED', 'BUZZ_PRINTED', 'FIZZBUZZ_PRINTED'], explanation: 'Four real threads share a lock and condition. Attempt events mean a worker checked the counter, not that it printed or stayed running. All FizzBuzz decisions belong to the backend.' },
  h2o: { name: 'H2O', field: 'moleculeCount', label: 'Molecules to bond', initial: '10', maximum: 150, tokenField: 'item', printed: ['MOLECULE_BONDED'], explanation: 'Hydrogen and oxygen threads coordinate through semaphores and a three-party barrier. A bond event records a molecule, not the departure of its individual atom threads.' },
};
const OUTPUT_PAGE_SIZE = 24;
const WORKER_PAGE_SIZE = 12;

function describeEvent(event) {
  const token = event.token ?? event.item;
  const context = event.repetition != null ? ` · repetition ${event.repetition}` : event.n != null ? ` · observed counter ${event.n}` : ` · recorded output length ${event.outputLength}`;
  return `#${event.sequence} · +${(event.elapsedNanos / 1000000).toFixed(1)} ms · ${event.threadName} · ${event.type}${token != null ? ` · ${token}` : ''}${context}`;
}

function OutputStream({ events, currentSequence, molecules, tokenField }) {
  const [page, setPage] = useState(0);
  const [follow, setFollow] = useState(true);
  const pages = Math.max(1, Math.ceil(events.length / OUTPUT_PAGE_SIZE));
  const currentPage = follow ? pages - 1 : Math.min(page, pages - 1);
  const first = currentPage * OUTPUT_PAGE_SIZE;
  return <section className="simulation-panel-card" aria-label={molecules ? 'Recorded molecule output' : 'Recorded printed output'}>
    <h3>{molecules ? 'Recorded molecules' : 'Printed output'} · {events.length} {molecules ? 'bond events' : 'tokens'}</h3>
    <p>Only applied {molecules ? 'MOLECULE_BONDED' : 'PRINTED'} events appear here, in backend sequence order. Attempts never append output.</p>
    {events.length > OUTPUT_PAGE_SIZE && <>
      <label className="ordering-recording-follow"><input type="checkbox" checked={follow} onChange={event => setFollow(event.target.checked)} />Follow latest output</label>
      <div className="recorded-trace-pagination">
        <button type="button" disabled={currentPage === 0} onClick={() => { setFollow(false); setPage(currentPage - 1); }}>Previous output page</button>
        <span>Output page {currentPage + 1} of {pages}</span>
        <button type="button" disabled={currentPage + 1 >= pages} onClick={() => { setFollow(false); setPage(currentPage + 1); }}>Next output page</button>
      </div>
    </>}
    {!events.length ? <p>No output events have been applied.</p> : <div role="list" aria-label={molecules ? 'Recorded molecule cards' : 'Recorded output tokens'} className="ordering-recording-stream">
      {events.slice(first, first + OUTPUT_PAGE_SIZE).map((event, offset) => <div key={event.sequence} role="listitem" aria-current={event.sequence === currentSequence ? 'step' : undefined} className="ordering-recording-token">
        <strong>{event[tokenField]}</strong><small>Output {first + offset + 1} · event #{event.sequence}</small><small>{event.threadName}</small>
      </div>)}
    </div>}
  </section>;
}

function Workers({ workers, currentThread }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(workers.size / WORKER_PAGE_SIZE));
  const currentPage = Math.min(page, pages - 1);
  return <section className="simulation-panel-card" aria-label="Recorded worker activity">
    <h3>Worker observations</h3>
    <p>Last applied events are not live thread states. The outline identifies the selected event's source, not a currently running worker.</p>
    <details open={workers.size <= 4}>
      <summary>Worker observations · {workers.size} threads</summary>
      {pages > 1 && <div className="recorded-trace-pagination">
        <button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous worker page</button>
        <span>Worker page {currentPage + 1} of {pages}</span>
        <button type="button" disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>Next worker page</button>
      </div>}
      <div className="simulation-panel-grid">{[...workers].slice(currentPage * WORKER_PAGE_SIZE, (currentPage + 1) * WORKER_PAGE_SIZE).map(([name, event]) => <div key={name} className={name === currentThread ? 'ordering-recording-selected' : ''}>
        <h4>{name}</h4><p>{event ? `Last recorded: ${event.type}` : 'No applied events'}</p>
      </div>)}</div>
    </details>
  </section>;
}

export default function RecordedOrderingReplay({ kind, executeRun }) {
  const scene = SCENES[kind];
  const [value, setValue] = useState(scene.initial);
  const playback = useRecordedTrace(executeRun, { traceKey: 'events' });
  const { result, trace, position, loading } = playback;
  const lastEvent = trace[position - 1];
  const recorded = useMemo(() => {
    const output = [];
    const acquired = new Map();
    const workers = new Map([...new Set(trace.map(event => event.threadName))].map(name => [name, null]));
    for (const event of trace.slice(0, position)) {
      workers.set(event.threadName, event);
      if (scene.printed.includes(event.type)) output.push(event);
      if (['HYDROGEN_ACQUIRED', 'OXYGEN_ACQUIRED'].includes(event.type)) acquired.set(event.threadName, event);
      if (['HYDROGEN_DEPARTED', 'OXYGEN_DEPARTED'].includes(event.type)) acquired.delete(event.threadName);
    }
    return { output, acquired, workers };
  }, [trace, position, scene]);
  return <div className="simulation-panel recorded-trace-panel">
    <p className="simulation-panel-note">{scene.explanation}</p>
    <form className="recorded-trace-form" onSubmit={event => {
      event.preventDefault();
      if (event.currentTarget.reportValidity()) void playback.run({ [scene.field]: Number(value) });
    }}>
      <label>{scene.label}<input type="number" min="1" max={scene.maximum} step="1" required value={value} disabled={loading} onChange={event => setValue(event.target.value)} /></label>
      <button type="submit" disabled={loading}>{loading ? 'Collecting backend recording…' : 'Run backend experiment'}</button>
    </form>
    <RecordedTraceControls playback={playback} />
    {!result && <p className="simulation-panel-note">No recording yet. No output, atoms, or workers are generated from draft settings.</p>}
    {result && <>
      <section className="simulation-panel-card" aria-label="Selected ordering event">
        <h3>{scene.name} recording</h3>
        <p>Run {result.runId} · actual {scene.label.toLowerCase()}: {result[scene.field]} · {result.threadCount} backend threads</p>
        <p>{lastEvent ? describeEvent(lastEvent) : 'Before the first recorded event. No output has been applied.'}</p>
      </section>
      {kind === 'h2o' && <section className="simulation-panel-card" aria-label="Recorded atom acquisitions">
        <h3>Acquired atoms without a recorded departure · {recorded.acquired.size}</h3>
        <p>Acquisition does not prove an atom is parked at the barrier. Bonding does not remove atoms here; only each thread's DEPARTED event does. Departure is recorded before semaphore release.</p>
        {!recorded.acquired.size ? <p>No acquisitions remain without a departure event at this point.</p> : <div role="list" aria-label="Atoms acquired without a recorded departure" className="ordering-recording-atoms">{[...recorded.acquired].map(([name, event]) => <div key={name} role="listitem"><span className="ordering-recording-atom">{event.item}</span><small>{name}</small></div>)}</div>}
      </section>}
      <OutputStream key={`output-${result.runId}`} events={recorded.output} currentSequence={lastEvent?.sequence} molecules={kind === 'h2o'} tokenField={scene.tokenField} />
      <Workers key={`workers-${result.runId}`} workers={recorded.workers} currentThread={lastEvent?.threadName} />
      <details className="simulation-panel-card">
        <summary>Backend run summary and complete result</summary>
        <dl><div><dt>Recorded duration</dt><dd>{result.durationMillis} ms</dd></div><div><dt>Thread count</dt><dd>{result.threadCount}</dd></div></dl>
        {kind === 'h2o' && <p>{result.hydrogenCount} hydrogen threads · {result.oxygenCount} oxygen threads · {result.moleculeCount} molecules</p>}
        <p className="ordering-recording-result">Backend result: {result.result}</p>
        <p>This completed-run result is independent of the selected replay event. No local alternation, FizzBuzz calculation, or molecule output is fabricated.</p>
      </details>
      <RecordedTraceLog key={result.runId} trace={trace} position={position} describeEvent={describeEvent} />
    </>}
  </div>;
}
