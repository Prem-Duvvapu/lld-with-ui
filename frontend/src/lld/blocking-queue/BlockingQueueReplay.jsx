import { useMemo, useState } from 'react';
import { useRecordedTrace } from '../../hooks/useRecordedTrace';
import RecordedTraceControls from '../../components/RecordedTraceControls';
import RecordedTraceLog from '../../components/RecordedTraceLog';
import { runBlockingQueue } from './api';
import '../../components/SimulationPanel.css';
import './BlockingQueueReplay.css';

function describeEvent(event) {
  const prefix = `#${event.sequence} · +${(event.elapsedNanos / 1000000).toFixed(1)} ms · ${event.threadName}`;
  switch (event.type) {
    case 'ENQUEUE_ATTEMPT': return `${prefix} · ENQUEUE_ATTEMPT ${event.item}`;
    case 'ENQUEUE_SUCCESS': return `${prefix} · ENQUEUE_SUCCESS ${event.item} · size ${event.queueSize}/${event.capacity}`;
    case 'ENQUEUE_BLOCKED': return `${prefix} · ENQUEUE_BLOCKED, entering notFull.await()`;
    case 'QUEUE_FULL': return `${prefix} · QUEUE_FULL observed at ${event.queueSize}/${event.capacity}`;
    case 'DEQUEUE_ATTEMPT': return `${prefix} · DEQUEUE_ATTEMPT`;
    case 'DEQUEUE_SUCCESS': return `${prefix} · DEQUEUE_SUCCESS ${event.item} · size ${event.queueSize}/${event.capacity}`;
    case 'DEQUEUE_BLOCKED': return `${prefix} · DEQUEUE_BLOCKED, entering notEmpty.await()`;
    case 'QUEUE_EMPTY': return `${prefix} · QUEUE_EMPTY observed`;
    default: return `${prefix} · ${event.type}`;
  }
}

function ThreadColumn({ title, workers }) {
  return <section className="simulation-panel-card queue-recording-threads" aria-label={title}>
    <h3>{title}</h3>
    <details open={workers.length <= 4}>
      <summary>Worker observations · {workers.length} threads</summary>
    <div className="simulation-panel-grid">{workers.map(([name, event]) => <div key={name} className={event?.type.endsWith('_BLOCKED') ? 'queue-recording-wait' : ''}>
      <h4>{name}</h4><p>{event ? `Last recorded: ${event.type}` : 'No applied events'}</p>
      {event?.type === 'ENQUEUE_BLOCKED' && <p>Entered notFull.await() in this event.</p>}
      {event?.type === 'DEQUEUE_BLOCKED' && <p>Entered notEmpty.await() in this event.</p>}
    </div>)}</div>
    </details>
  </section>;
}

export default function BlockingQueueReplay() {
  const [parameters, setParameters] = useState({ capacity: '5', producers: '2', consumers: '2', itemsPerProducer: '3' });
  const playback = useRecordedTrace(runBlockingQueue);
  const { result, trace, position, loading } = playback;
  const lastEvent = trace[position - 1];
  const recorded = useMemo(() => {
    const items = [];
    const workers = new Map([...new Set(trace.map(event => event.threadName))].map(name => [name, null]));
    for (const event of trace.slice(0, position)) {
      workers.set(event.threadName, event);
      if (event.type === 'ENQUEUE_SUCCESS') items.push(event.item);
      if (event.type === 'DEQUEUE_SUCCESS') items.shift();
    }
    return { items, workers };
  }, [trace, position]);
  return (
    <div className="simulation-panel recorded-trace-panel">
      <p className="simulation-panel-note">Record a real producer/consumer experiment, then inspect its FIFO buffer and condition-wait events at your own pace. Playback is not live Java thread execution.</p>
      <form className="recorded-trace-form" onSubmit={event => {
        event.preventDefault();
        if (event.currentTarget.reportValidity()) void playback.run(Object.fromEntries(Object.entries(parameters).map(([key, value]) => [key, Number(value)])));
      }}>
        {[['capacity', 'Capacity', 50], ['producers', 'Producers', 12], ['consumers', 'Consumers', 12], ['itemsPerProducer', 'Items per producer', 50]].map(([key, label, maximum]) => <label key={key}>{label}<input type="number" min="1" max={maximum} step="1" required value={parameters[key]} disabled={loading} onChange={event => setParameters(current => ({ ...current, [key]: event.target.value }))} /></label>)}
        <button type="submit" disabled={loading}>{loading ? 'Collecting backend recording…' : 'Run backend experiment'}</button>
      </form>
      <RecordedTraceControls playback={playback} />
      {!result && <p className="simulation-panel-note">No recording yet. Queue slots and worker cards are created only from returned run data, not draft settings.</p>}
      {result && <>
        <section className="simulation-panel-card" aria-label="Recorded blocking queue event">
          <h3>Recorded queue state</h3>
          <p>Run {result.runId} · capacity {result.capacity} · producers: {result.producers} · consumers: {result.consumers} · items per producer: {result.itemsPerProducer}</p>
          <p>{lastEvent ? describeEvent(lastEvent) : 'Before the first recorded event. The queue starts empty.'}</p>
          <p>No lock-release, wakeup, or thread-exit events are recorded. Worker cards show the last applied observation; they do not claim current lock ownership or a live wait set.</p>
        </section>
        <div className="queue-recording-stage">
          <section className="simulation-panel-card queue-recording-buffer" aria-label="Recorded FIFO buffer">
            <h3>FIFO buffer · {recorded.items.length}/{result.capacity} occupied</h3>
            <p>Front is the next item to be taken. Only successful recorded enqueues and dequeues change this view.</p>
            <div role="list" aria-label="Recorded queue slots" className="queue-recording-slots">{Array.from({ length: result.capacity }, (_, index) => <div key={index} role="listitem" aria-label={`Slot ${index}: ${recorded.items[index] ?? 'empty'}${index === 0 && recorded.items.length ? ', front' : ''}`} className={`queue-recording-slot ${index < recorded.items.length ? 'filled' : ''}`}>
              <small>Slot {index}{index === 0 && recorded.items.length ? ' · Front' : ''}</small><strong>{recorded.items[index] ?? 'Empty'}</strong>
            </div>)}</div>
            <p>This is FIFO order, not physical circular-buffer indices. {lastEvent ? `Backend occupancy at the selected event: ${lastEvent.queueSize}/${lastEvent.capacity}.` : 'No events have been applied.'}</p>
          </section>
          <div className="queue-recording-producers"><ThreadColumn title="Recorded producer activity" workers={[...recorded.workers].filter(([name]) => name.startsWith('producer-'))} /></div>
          <div className="queue-recording-consumers"><ThreadColumn title="Recorded consumer activity" workers={[...recorded.workers].filter(([name]) => name.startsWith('consumer-'))} /></div>
        </div>
        <details className="simulation-panel-card">
          <summary>Backend run summary</summary>
          <dl><div><dt>Recorded duration</dt><dd>{result.durationMillis} ms</dd></div><div><dt>Total items delivered</dt><dd>{result.totalItems}</dd></div><div><dt>Maximum observed occupancy</dt><dd>{result.maxObservedSize} / {result.capacity}</dd></div></dl>
          <p>The experiment is already complete. Summary metrics are backend outcomes, not the state of the selected replay event. Workers with no events in this recording are not shown.</p>
        </details>
        <RecordedTraceLog key={result.runId} trace={trace} position={position} describeEvent={describeEvent} />
      </>}
    </div>
  );
}
