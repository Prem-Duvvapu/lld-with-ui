import { useState, useEffect, useRef, useCallback } from 'react';
import LldPage from '../../components/LldPage';
import { runBlockingQueue } from './api';
import { ApiError } from '../../utils/api';

const CSS = `
.bq-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.bq-controls { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 16px; align-items: flex-end; }
.bq-field { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: var(--text-muted); font-weight: 600; }
.bq-field input { width: 64px; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--border-primary); background: var(--bg-primary); color: var(--text-primary); font-size: 13px; }
.bq-btn { padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; border: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-primary); transition: all 0.2s; }
.bq-btn.primary { background: var(--accent-gradient); color: #fff; border: none; }
.bq-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.bq-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }

.bq-status { text-align: center; font-size: 12px; color: var(--text-muted); margin-bottom: 14px; min-height: 16px; }
.bq-status.error { color: var(--danger); font-weight: 600; }

.bq-stage { position: relative; width: 100%; min-height: 320px; background: var(--bg-primary); border-radius: 12px; border: 1px solid var(--border-primary); padding: 20px; display: grid; grid-template-columns: 200px 1fr 200px; gap: 20px; margin-bottom: 20px; }

.thread-col { display: flex; flex-direction: column; gap: 10px; }
.thread-card { background: var(--bg-card); border: 2px solid var(--border-primary); border-radius: 10px; padding: 10px; text-align: center; transition: all 0.3s; }
.thread-card.active { border-color: var(--accent); box-shadow: 0 0 12px rgba(102,126,234,0.3); }
.thread-card.blocked { border-color: var(--danger); background: rgba(248,81,73,0.1); }

.queue-core { display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg-secondary); border: 1px dashed var(--border-primary); border-radius: 10px; padding: 16px; position: relative; }
.buffer-slots { display: flex; gap: 10px; margin: 16px 0; flex-wrap: wrap; justify-content: center; }
.slot { width: 50px; height: 50px; border: 2px dashed var(--border-primary); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; background: var(--bg-card); transition: all 0.3s; }
.slot.filled { border-style: solid; border-color: var(--success); background: rgba(63,185,80,0.15); color: var(--success); transform: scale(1.05); }

.lock-badge { position: absolute; top: 12px; right: 12px; padding: 4px 10px; border-radius: 12px; font-size: 10px; font-weight: 700; background: var(--bg-tertiary); border: 1px solid var(--border-primary); }
.lock-badge.locked { background: var(--accent); color: white; }

.wait-set { width: 100%; padding: 8px; background: var(--bg-primary); border-radius: 6px; font-size: 11px; color: var(--text-muted); text-align: center; margin-top: 6px; }

.bq-progress { width: 100%; height: 6px; border-radius: 4px; background: var(--bg-tertiary); overflow: hidden; margin-bottom: 14px; }
.bq-progress-bar { height: 100%; background: var(--accent-gradient); transition: width 0.15s linear; }
`;

const DEFAULTS = { capacity: 5, producers: 2, consumers: 2, itemsPerProducer: 3 };
const REPLAY_MS_PER_EVENT = 260;

function threadNames(prefix, count) {
  return Array.from({ length: count }, (_, i) => `${prefix}-${i + 1}`);
}

function describeEvent(e) {
  const ms = (e.elapsedNanos / 1_000_000).toFixed(1);
  switch (e.type) {
    case 'ENQUEUE_ATTEMPT': return `[+${ms}ms] ${e.threadName} attempting put(${e.item})`;
    case 'ENQUEUE_SUCCESS': return `[+${ms}ms] ${e.threadName} produced ${e.item} -> size ${e.queueSize}/${e.capacity}. Signalled notEmpty.`;
    case 'ENQUEUE_BLOCKED': return `[+${ms}ms] ${e.threadName} BLOCKED on notFull.await() (queue full)`;
    case 'QUEUE_FULL': return `[+${ms}ms] Queue observed FULL (${e.queueSize}/${e.capacity}) by ${e.threadName}`;
    case 'DEQUEUE_ATTEMPT': return `[+${ms}ms] ${e.threadName} attempting take()`;
    case 'DEQUEUE_SUCCESS': return `[+${ms}ms] ${e.threadName} consumed ${e.item} <- size ${e.queueSize}/${e.capacity}. Signalled notFull.`;
    case 'DEQUEUE_BLOCKED': return `[+${ms}ms] ${e.threadName} BLOCKED on notEmpty.await() (queue empty)`;
    case 'QUEUE_EMPTY': return `[+${ms}ms] Queue observed EMPTY by ${e.threadName}`;
    default: return `[+${ms}ms] ${e.threadName}: ${e.type}`;
  }
}

function RealTraceReplay() {
  const [params, setParams] = useState(DEFAULTS);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);
  const [runResult, setRunResult] = useState(null);
  const [playIndex, setPlayIndex] = useState(0); // number of events applied so far
  const [replaying, setReplaying] = useState(false);
  const intervalRef = useRef(null);

  const stopReplay = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setReplaying(false);
  }, []);

  useEffect(() => () => stopReplay(), [stopReplay]);

  const handleRun = async () => {
    stopReplay();
    setError(null);
    setRunResult(null);
    setPlayIndex(0);
    setFetching(true);
    try {
      const result = await runBlockingQueue(params);
      setRunResult(result);
      setFetching(false);
      setReplaying(true);
      let i = 0;
      const total = result.trace.length;
      intervalRef.current = setInterval(() => {
        i += 1;
        setPlayIndex(i);
        if (i >= total) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setReplaying(false);
        }
      }, REPLAY_MS_PER_EVENT);
    } catch (e) {
      setFetching(false);
      setError(e instanceof ApiError ? e.message : 'Failed to reach the blocking-queue backend');
    }
  };

  const handleField = (field) => (ev) => {
    const v = ev.target.value === '' ? '' : Number(ev.target.value);
    setParams((p) => ({ ...p, [field]: v }));
  };

  // Replay derivation: fold every event up to playIndex into visual state.
  const trace = runResult?.trace ?? [];
  const appliedEvents = trace.slice(0, playIndex);

  const producers = threadNames('producer', runResult?.producers ?? params.producers ?? DEFAULTS.producers);
  const consumers = threadNames('consumer', runResult?.consumers ?? params.consumers ?? DEFAULTS.consumers);

  const threadState = {};
  [...producers, ...consumers].forEach((n) => { threadState[n] = 'IDLE'; });
  let lockOwner = null;
  const blockedSet = new Set();
  const queueContents = [];

  for (const e of appliedEvents) {
    switch (e.type) {
      case 'ENQUEUE_ATTEMPT':
      case 'DEQUEUE_ATTEMPT':
        threadState[e.threadName] = 'RUNNING';
        blockedSet.delete(e.threadName);
        break;
      case 'ENQUEUE_BLOCKED':
      case 'DEQUEUE_BLOCKED':
        threadState[e.threadName] = 'BLOCKED';
        blockedSet.add(e.threadName);
        break;
      case 'ENQUEUE_SUCCESS':
        threadState[e.threadName] = 'RUNNING';
        blockedSet.delete(e.threadName);
        queueContents.push(e.item);
        break;
      case 'DEQUEUE_SUCCESS':
        threadState[e.threadName] = 'RUNNING';
        blockedSet.delete(e.threadName);
        queueContents.shift();
        break;
      default:
        break;
    }
    lockOwner = e.threadName;
  }

  const lastEvent = appliedEvents[appliedEvents.length - 1];
  const logs = appliedEvents.slice(-6).reverse().map(describeEvent);
  const capacity = runResult?.capacity ?? params.capacity ?? DEFAULTS.capacity;

  const isDone = runResult && playIndex >= trace.length && trace.length > 0;
  const stillHoldingLock = lastEvent && (lastEvent.type === 'ENQUEUE_SUCCESS' || lastEvent.type === 'DEQUEUE_SUCCESS'
    || lastEvent.type === 'ENQUEUE_ATTEMPT' || lastEvent.type === 'DEQUEUE_ATTEMPT') && !isDone;

  return (
    <div className="bq-container">
      <style>{CSS}</style>

      <div className="bq-controls">
        <label className="bq-field">Capacity
          <input type="number" min="1" max="50" value={params.capacity} onChange={handleField('capacity')} />
        </label>
        <label className="bq-field">Producers
          <input type="number" min="1" max="12" value={params.producers} onChange={handleField('producers')} />
        </label>
        <label className="bq-field">Consumers
          <input type="number" min="1" max="12" value={params.consumers} onChange={handleField('consumers')} />
        </label>
        <label className="bq-field">Items/Producer
          <input type="number" min="1" max="50" value={params.itemsPerProducer} onChange={handleField('itemsPerProducer')} />
        </label>
        <button className="bq-btn primary" onClick={handleRun} disabled={fetching || replaying}>
          {fetching ? '⏳ Running real threads on backend...' : replaying ? '▶ Replaying trace...' : '⚡ Run Real Simulation'}
        </button>
      </div>

      <div className={`bq-status ${error ? 'error' : ''}`}>
        {error && `⚠️ ${error}`}
        {!error && fetching && 'Spinning up genuine producer/consumer threads on the backend (ReentrantLock + Condition)...'}
        {!error && !fetching && runResult && replaying && `Replaying real execution trace: event ${playIndex}/${trace.length}`}
        {!error && !fetching && runResult && isDone &&
          `Done — ${runResult.totalItems} items delivered exactly once in ${runResult.durationMillis}ms real wall-clock time. Max queue size ever observed: ${runResult.maxObservedSize}/${runResult.capacity}.`}
        {!error && !fetching && !runResult && 'Configure parameters and run — this executes real Java threads on the backend, not an animation.'}
      </div>

      {trace.length > 0 && (
        <div className="bq-progress">
          <div className="bq-progress-bar" style={{ width: `${(playIndex / trace.length) * 100}%` }} />
        </div>
      )}

      <div className="bq-stage">
        <div className="thread-col">
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center' }}>PRODUCER THREADS</div>
          {producers.map((name) => {
            const state = threadState[name];
            return (
              <div key={name} className={`thread-card ${lockOwner === name && stillHoldingLock ? 'active' : ''} ${state === 'BLOCKED' ? 'blocked' : ''}`}>
                <div style={{ fontSize: 20 }}>⚙️</div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{name}</div>
                <div style={{ fontSize: 10, marginTop: 4, color: state === 'BLOCKED' ? 'var(--danger)' : 'var(--text-muted)' }}>
                  {state === 'BLOCKED' ? 'BLOCKED (notFull.await)' : state}
                </div>
              </div>
            );
          })}
        </div>

        <div className="queue-core">
          <div className={`lock-badge ${stillHoldingLock ? 'locked' : ''}`}>
            {stillHoldingLock ? `🔒 Locked by ${lockOwner}` : '🔓 ReentrantLock Unlocked'}
          </div>

          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--info)' }}>BOUNDED QUEUE BUFFER</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Capacity = {capacity} slots (real backend state)</div>

          <div className="buffer-slots">
            {Array.from({ length: capacity }).map((_, idx) => {
              const item = queueContents[idx];
              return (
                <div key={idx} className={`slot ${item ? 'filled' : ''}`}>
                  {item || idx}
                </div>
              );
            })}
          </div>

          <div className="wait-set">
            Condition <strong>notFull</strong>: {producers.filter((n) => blockedSet.has(n)).join(', ') || 'empty'}
          </div>
          <div className="wait-set">
            Condition <strong>notEmpty</strong>: {consumers.filter((n) => blockedSet.has(n)).join(', ') || 'empty'}
          </div>
        </div>

        <div className="thread-col">
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center' }}>CONSUMER THREADS</div>
          {consumers.map((name) => {
            const state = threadState[name];
            return (
              <div key={name} className={`thread-card ${lockOwner === name && stillHoldingLock ? 'active' : ''} ${state === 'BLOCKED' ? 'blocked' : ''}`}>
                <div style={{ fontSize: 20 }}>🛒</div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{name}</div>
                <div style={{ fontSize: 10, marginTop: 4, color: state === 'BLOCKED' ? 'var(--danger)' : 'var(--text-muted)' }}>
                  {state === 'BLOCKED' ? 'BLOCKED (notEmpty.await)' : state}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ background: 'var(--bg-primary)', padding: 12, borderRadius: 8, border: '1px solid var(--border-primary)', fontFamily: 'monospace', fontSize: 12 }}>
        <div style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>Real Execution Trace (backend-recorded, thread-attributed, timestamped):</div>
        {logs.length === 0
          ? <div style={{ color: 'var(--text-muted)' }}>Click "Run Real Simulation" to spin up genuine backend threads and replay the actual recorded trace.</div>
          : logs.map((l, idx) => (
            <div key={idx} style={{ color: idx === 0 ? 'var(--info)' : 'var(--text-muted)' }}>{l}</div>
          ))}
      </div>
    </div>
  );
}

export default function BlockingQueuePage() {
  return (
    <LldPage module="blocking-queue" title="Blocking Queue System" icon="🔄" tabs={['app', 'simulation', 'diagram', 'sequence', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'simulation' && <RealTraceReplay />}
          {activeTab === 'app' && <RealTraceReplay />}
        </>
      )}
    </LldPage>
  );
}
