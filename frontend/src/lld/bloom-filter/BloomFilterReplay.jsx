import { useMemo, useState } from 'react';
import { useRecordedTrace } from '../../hooks/useRecordedTrace';
import RecordedTraceControls from '../../components/RecordedTraceControls';
import RecordedTraceLog from '../../components/RecordedTraceLog';
import { runBloomFilter } from './api';
import '../../components/SimulationPanel.css';

const BIT_WINDOW = 64;
const BIT_EVENTS = ['BIT_NEWLY_SET', 'BIT_ALREADY_SET', 'QUERY_BIT_HIT', 'QUERY_BIT_MISS'];

function describeEvent(event) {
  return `#${event.sequence} · +${(event.elapsedNanos / 1000000).toFixed(1)} ms · ${event.threadName} · ${event.type} · ${event.item}${BIT_EVENTS.includes(event.type) ? ` · bit ${event.bitIndex}` : ''}`;
}

export default function BloomFilterReplay() {
  const [parameters, setParameters] = useState({ bitSize: '28', hashCount: '3', addThreads: '4' });
  const [bitPage, setBitPage] = useState(0);
  const [follow, setFollow] = useState(true);
  const playback = useRecordedTrace(runBloomFilter);
  const { result, trace, position, loading } = playback;
  const lastEvent = trace[position - 1];
  const touchedBit = lastEvent && BIT_EVENTS.includes(lastEvent.type) ? lastEvent.bitIndex : null;
  const recorded = useMemo(() => {
    const bits = new Set();
    let lastBit = null;
    const threads = new Map([...new Set(trace.map(event => event.threadName))].map(name => [name, 'Idle in recording']));
    for (const event of trace.slice(0, position)) {
      if (BIT_EVENTS.includes(event.type)) lastBit = event.bitIndex;
      if (event.type === 'BIT_NEWLY_SET') bits.add(event.bitIndex);
      if (event.type === 'ADD_ATTEMPT') threads.set(event.threadName, `Adding ${event.item}`);
      if (event.type === 'QUERY_ATTEMPT') threads.set(event.threadName, `Querying ${event.item}`);
      if (['ADD_COMPLETE', 'QUERY_RESULT_POSITIVE', 'QUERY_RESULT_NEGATIVE'].includes(event.type)) threads.set(event.threadName, 'Idle in recording');
    }
    return { bits, threads, lastBit };
  }, [trace, position]);
  const pages = result ? Math.ceil(result.bitSize / BIT_WINDOW) : 1;
  const currentPage = follow && recorded.lastBit !== null ? Math.floor(recorded.lastBit / BIT_WINDOW) : Math.min(bitPage, pages - 1);
  const firstBit = currentPage * BIT_WINDOW;
  const queryGroups = result ? [
    ['Added items', result.queries.filter(query => query.wasAdded)],
    ['Not added · reported absent', result.queries.filter(query => !query.wasAdded && !query.mightContain)],
    ['False positives reported by backend', result.queries.filter(query => query.falsePositive)],
  ] : [];
  return (
    <div className="simulation-panel recorded-trace-panel">
      <p className="simulation-panel-note">Real backend adder threads produce one recording. Replay displays recorded bit changes and query outcomes; it does not run hashes or invent a false positive.</p>
      <form className="recorded-trace-form" onSubmit={event => {
        event.preventDefault();
        if (event.currentTarget.reportValidity()) void playback.run(Object.fromEntries(Object.entries(parameters).map(([key, value]) => [key, Number(value)])));
      }}>
        {[['bitSize', 'Bit size', 4096], ['hashCount', 'Hash count', 12], ['addThreads', 'Adder threads', 16]].map(([key, label, maximum]) => <label key={key}>{label}<input type="number" min="1" max={maximum} step="1" required value={parameters[key]} disabled={loading} onChange={event => setParameters(current => ({ ...current, [key]: event.target.value }))} /></label>)}
        <button type="submit" disabled={loading}>{loading ? 'Collecting backend recording…' : 'Run backend experiment'}</button>
      </form>
      <RecordedTraceControls playback={playback} />
      {!result && <p className="simulation-panel-note">No bit array is allocated from draft settings. Submit valid parameters to load a backend recording.</p>}
      {result && <>
        <section className="simulation-panel-card" aria-label="Recorded Bloom filter state">
          <h3>Recorded bit array · {recorded.bits.size} bits set at this event</h3>
          <p>Run {result.runId} · {result.bitSize} bits · {result.hashCount} hashes · {result.addThreads} adder threads</p>
          <p>{lastEvent ? describeEvent(lastEvent) : 'Before the first recorded event. All displayed bits are unset.'}</p>
          <label className="recorded-bloom-follow"><input type="checkbox" checked={follow} onChange={event => setFollow(event.target.checked)} />Follow current bit</label>
          <div className="recorded-trace-pagination">
            <button type="button" disabled={currentPage === 0} onClick={() => { setFollow(false); setBitPage(currentPage - 1); }}>Previous bits</button>
            <span>Bits {firstBit}–{Math.min(result.bitSize, firstBit + BIT_WINDOW) - 1} of {result.bitSize}</span>
            <button type="button" disabled={currentPage + 1 >= pages} onClick={() => { setFollow(false); setBitPage(currentPage + 1); }}>Next bits</button>
          </div>
          <div className="recorded-bloom-bits" role="group" aria-label="Recorded bits in the selected window">
            {Array.from({ length: Math.min(BIT_WINDOW, result.bitSize - firstBit) }, (_, offset) => {
              const bit = firstBit + offset;
              return <div key={bit} role="img" aria-label={`Bit ${bit}: ${recorded.bits.has(bit) ? 1 : 0}${touchedBit === bit ? ', current event' : ''}`} className={`recorded-bloom-bit ${recorded.bits.has(bit) ? 'set' : ''} ${touchedBit === bit ? 'current' : ''}`}><strong aria-hidden="true">{recorded.bits.has(bit) ? 1 : 0}</strong><small aria-hidden="true">{bit}</small></div>;
            })}
          </div>
          <p>Each cell shows its index and recorded 0/1 value; the outlined cell is touched by the selected event. Large arrays are shown in windows of at most 64 bits.</p>
          <div className="simulation-panel-grid">{[...recorded.threads].map(([name, status]) => <div key={name}><h4>{name}</h4><p>{status}</p></div>)}</div>
        </section>
        <details className="simulation-panel-card">
          <summary>Backend run summary and query outcomes</summary>
          <dl><div><dt>Recorded duration</dt><dd>{result.durationMillis} ms</dd></div><div><dt>Items added</dt><dd>{result.itemsAdded.length}</dd></div><div><dt>Final bits set</dt><dd>{result.bitsSetCount} / {result.bitSize}</dd></div><div><dt>False positive demonstrated</dt><dd>{result.falsePositiveDemonstrated ? 'Yes' : 'No'}</dd></div></dl>
          <p>{result.falsePositiveDemonstrated ? 'The backend found a never-added item reported as possibly present. Membership results below are recorded outcomes, not a prediction.' : 'The backend did not demonstrate a false positive in this run. No positive result is fabricated for the animation.'}</p>
          <p>This summary describes the completed backend experiment, independent of the selected replay event.</p>
          <div className="simulation-panel-grid">{queryGroups.map(([label, queries]) => <div key={label}><h4>{label}</h4>{queries.length ? queries.map(query => <p key={query.item}><strong>{query.item}</strong>: {query.mightContain ? 'Might contain' : 'Not present'}</p>) : <p>None recorded.</p>}</div>)}</div>
        </details>
        <RecordedTraceLog key={result.runId} trace={trace} position={position} describeEvent={describeEvent} />
      </>}
    </div>
  );
}
