import { useState, useEffect, useRef, useCallback } from 'react';
import LldPage from '../../components/LldPage';
import { runFooBar } from './api';
import { ApiError } from '../../utils/api';

const CSS = `
.fb-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.fb-controls { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 16px; align-items: flex-end; }
.fb-field { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: var(--text-muted); font-weight: 600; }
.fb-field input { width: 72px; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--border-primary); background: var(--bg-primary); color: var(--text-primary); font-size: 13px; }
.fb-btn { padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; border: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-primary); transition: all 0.2s; }
.fb-btn.primary { background: var(--accent-gradient); color: #fff; border: none; }
.fb-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.fb-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }

.fb-status { text-align: center; font-size: 12px; color: var(--text-muted); margin-bottom: 14px; min-height: 16px; }
.fb-status.error { color: var(--danger); font-weight: 600; }

.fb-progress { width: 100%; height: 6px; border-radius: 4px; background: var(--bg-tertiary); overflow: hidden; margin-bottom: 14px; }
.fb-progress-bar { height: 100%; background: var(--accent-gradient); transition: width 0.15s linear; }

.threads-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
.thread-card { background: var(--bg-card); border: 2px solid var(--border-primary); border-radius: 10px; padding: 14px; text-align: center; transition: all 0.3s; }
.thread-card.active { border-color: var(--accent); box-shadow: 0 0 14px rgba(102,126,234,0.4); transform: scale(1.03); }
.thread-card.blocked { border-color: var(--danger); background: rgba(248,81,73,0.1); }

.foobar-stream { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 16px; min-height: 120px; max-height: 220px; overflow-y: auto; font-family: monospace; font-size: 14px; display: flex; flex-wrap: wrap; gap: 8px; align-content: flex-start; }
.foobar-tag { padding: 6px 12px; border-radius: 6px; font-weight: 700; }
.foobar-tag.foo { background: rgba(102,126,234,0.2); color: var(--accent); border: 1px solid var(--accent); }
.foobar-tag.bar { background: rgba(63,185,80,0.2); color: var(--success); border: 1px solid var(--success); }
`;

const DEFAULTS = { n: 5 };
const REPLAY_MS_PER_EVENT = 180;

function describeEvent(e) {
  const ms = (e.elapsedNanos / 1_000_000).toFixed(1);
  switch (e.type) {
    case 'FOO_ATTEMPT': return `[+${ms}ms] ${e.threadName} attempting fooSemaphore.acquire() (rep ${e.repetition})`;
    case 'FOO_PRINTED': return `[+${ms}ms] ${e.threadName} printed "Foo" (rep ${e.repetition}) -> released barSemaphore`;
    case 'BAR_ATTEMPT': return `[+${ms}ms] ${e.threadName} attempting barSemaphore.acquire() (rep ${e.repetition})`;
    case 'BAR_PRINTED': return `[+${ms}ms] ${e.threadName} printed "Bar" (rep ${e.repetition}) -> released fooSemaphore`;
    default: return `[+${ms}ms] ${e.threadName}: ${e.type}`;
  }
}

function RealTraceReplay() {
  const [params, setParams] = useState(DEFAULTS);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);
  const [runResult, setRunResult] = useState(null);
  const [playIndex, setPlayIndex] = useState(0);
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
      const result = await runFooBar(params);
      setRunResult(result);
      setFetching(false);
      setReplaying(true);
      let i = 0;
      const total = result.events.length;
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
      setError(e instanceof ApiError ? e.message : 'Failed to reach the foo-bar backend');
    }
  };

  const handleField = (field) => (ev) => {
    const v = ev.target.value === '' ? '' : Number(ev.target.value);
    setParams((p) => ({ ...p, [field]: v }));
  };

  const events = runResult?.events ?? [];
  const appliedEvents = events.slice(0, playIndex);

  let fooState = 'IDLE';
  let barState = 'IDLE';
  const output = [];
  let lastThread = null;

  for (const e of appliedEvents) {
    switch (e.type) {
      case 'FOO_ATTEMPT':
        fooState = 'RUNNING';
        break;
      case 'FOO_PRINTED':
        fooState = 'RUNNING';
        output.push({ text: 'Foo', type: 'foo' });
        break;
      case 'BAR_ATTEMPT':
        barState = 'RUNNING';
        break;
      case 'BAR_PRINTED':
        barState = 'RUNNING';
        output.push({ text: 'Bar', type: 'bar' });
        break;
      default:
        break;
    }
    lastThread = e.threadName;
  }

  const lastEvent = appliedEvents[appliedEvents.length - 1];
  const logs = appliedEvents.slice(-6).reverse().map(describeEvent);
  const isDone = runResult && playIndex >= events.length && events.length > 0;
  const activeThread = isDone ? null : lastThread;

  return (
    <div className="fb-container">
      <style>{CSS}</style>

      <div className="fb-controls">
        <label className="fb-field">Repetitions (n)
          <input type="number" min="1" max="1000" value={params.n} onChange={handleField('n')} />
        </label>
        <button className="fb-btn primary" onClick={handleRun} disabled={fetching || replaying}>
          {fetching ? '⏳ Running real threads on backend...' : replaying ? '▶ Replaying trace...' : '🏓 Run Real Simulation'}
        </button>
      </div>

      <div className={`fb-status ${error ? 'error' : ''}`}>
        {error && `⚠️ ${error}`}
        {!error && fetching && 'Spinning up genuine foo/bar threads on the backend (two Semaphores)...'}
        {!error && !fetching && runResult && replaying && `Replaying real execution trace: event ${playIndex}/${events.length}`}
        {!error && !fetching && runResult && isDone &&
          `Done — "${runResult.result.length > 60 ? runResult.result.slice(0, 60) + '…' : runResult.result}" assembled in ${runResult.durationMillis}ms real wall-clock time.`}
        {!error && !fetching && !runResult && 'Configure n and run — this executes real Java threads on the backend, not an animation.'}
      </div>

      {events.length > 0 && (
        <div className="fb-progress">
          <div className="fb-progress-bar" style={{ width: `${(playIndex / events.length) * 100}%` }} />
        </div>
      )}

      <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginBottom: 16 }}>
        SEMAPHORE PING-PONG SYNCHRONIZATION (real backend threads)
      </div>

      <div className="threads-pair">
        <div className={`thread-card ${activeThread === 'foo-thread' ? 'active' : ''}`}>
          <div style={{ fontSize: 24 }}>🔵</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>foo-thread</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>state: {fooState}</div>
        </div>

        <div className={`thread-card ${activeThread === 'bar-thread' ? 'active' : ''}`}>
          <div style={{ fontSize: 24 }}>🟢</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>bar-thread</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>state: {barState}</div>
        </div>
      </div>

      <div className="foobar-stream">
        {output.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Click "Run Real Simulation" to spin up genuine backend threads and replay the actual recorded trace.</div>
        ) : (
          output.map((item, idx) => (
            <div key={idx} className={`foobar-tag ${item.type}`}>
              {item.text}
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: 16, background: 'var(--bg-primary)', padding: 12, borderRadius: 8, border: '1px solid var(--border-primary)', fontFamily: 'monospace', fontSize: 12 }}>
        <div style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>Real Execution Trace (backend-recorded, thread-attributed, timestamped):</div>
        {logs.length === 0
          ? <div style={{ color: 'var(--text-muted)' }}>No events yet.</div>
          : logs.map((l, idx) => (
            <div key={idx} style={{ color: idx === 0 ? 'var(--info)' : 'var(--text-muted)' }}>{l}</div>
          ))}
      </div>
    </div>
  );
}

export default function FooBarPage() {
  return (
    <LldPage module="foo-bar" title="Print FooBar Alternately" icon="🏓" tabs={['app', 'simulation', 'diagram', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'simulation' && <RealTraceReplay />}
          {activeTab === 'app' && <RealTraceReplay />}
        </>
      )}
    </LldPage>
  );
}
