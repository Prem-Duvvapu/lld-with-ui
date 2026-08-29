import { useState, useEffect, useRef, useCallback } from 'react';
import LldPage from '../../components/LldPage';
import { runZeroEvenOdd } from './api';
import { ApiError } from '../../utils/api';

const CSS = `
.zeo-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.zeo-controls { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 16px; align-items: flex-end; }
.zeo-field { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: var(--text-muted); font-weight: 600; }
.zeo-field input { width: 72px; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--border-primary); background: var(--bg-primary); color: var(--text-primary); font-size: 13px; }
.zeo-btn { padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; border: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-primary); transition: all 0.2s; }
.zeo-btn.primary { background: var(--accent-gradient); color: #fff; border: none; }
.zeo-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.zeo-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }

.zeo-status { text-align: center; font-size: 12px; color: var(--text-muted); margin-bottom: 14px; min-height: 16px; }
.zeo-status.error { color: var(--danger); font-weight: 600; }

.zeo-progress { width: 100%; height: 6px; border-radius: 4px; background: var(--bg-tertiary); overflow: hidden; margin-bottom: 14px; }
.zeo-progress-bar { height: 100%; background: var(--accent-gradient); transition: width 0.15s linear; }

.threads-trio { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
.thread-card { background: var(--bg-card); border: 2px solid var(--border-primary); border-radius: 10px; padding: 12px; text-align: center; transition: all 0.3s; }
.thread-card.active { border-color: var(--accent); box-shadow: 0 0 14px rgba(102,126,234,0.4); transform: scale(1.04); }

.seq-stream { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 16px; min-height: 120px; max-height: 220px; overflow-y: auto; font-family: monospace; font-size: 14px; display: flex; flex-wrap: wrap; gap: 8px; align-content: flex-start; }
.seq-tag { padding: 6px 12px; border-radius: 6px; font-weight: 700; }
.seq-tag.zero { background: rgba(102,126,234,0.2); color: var(--accent); border: 1px solid var(--accent); }
.seq-tag.odd { background: rgba(234,179,8,0.2); color: var(--warning); border: 1px solid var(--warning); }
.seq-tag.even { background: rgba(63,185,80,0.2); color: var(--success); border: 1px solid var(--success); }
`;

const DEFAULTS = { n: 10 };
const REPLAY_MS_PER_EVENT = 140;

function describeEvent(e) {
  const ms = (e.elapsedNanos / 1_000_000).toFixed(1);
  switch (e.type) {
    case 'ZERO_ATTEMPT': return `[+${ms}ms] ${e.threadName} attempting zeroSemaphore.acquire() (n=${e.n})`;
    case 'ZERO_PRINTED': return `[+${ms}ms] ${e.threadName} printed "0" (n=${e.n}) -> released ${e.n % 2 === 1 ? 'oddSemaphore' : 'evenSemaphore'}`;
    case 'ODD_ATTEMPT': return `[+${ms}ms] ${e.threadName} attempting oddSemaphore.acquire() (n=${e.n})`;
    case 'ODD_PRINTED': return `[+${ms}ms] ${e.threadName} printed "${e.token}" -> released zeroSemaphore`;
    case 'EVEN_ATTEMPT': return `[+${ms}ms] ${e.threadName} attempting evenSemaphore.acquire() (n=${e.n})`;
    case 'EVEN_PRINTED': return `[+${ms}ms] ${e.threadName} printed "${e.token}" -> released zeroSemaphore`;
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
      const result = await runZeroEvenOdd(params);
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
      setError(e instanceof ApiError ? e.message : 'Failed to reach the zero-even-odd backend');
    }
  };

  const handleField = (field) => (ev) => {
    const v = ev.target.value === '' ? '' : Number(ev.target.value);
    setParams((p) => ({ ...p, [field]: v }));
  };

  const events = runResult?.events ?? [];
  const appliedEvents = events.slice(0, playIndex);

  let zeroState = 'IDLE';
  let oddState = 'IDLE';
  let evenState = 'IDLE';
  const output = [];
  let lastThread = null;

  for (const e of appliedEvents) {
    switch (e.type) {
      case 'ZERO_ATTEMPT': zeroState = 'RUNNING'; break;
      case 'ZERO_PRINTED': zeroState = 'RUNNING'; output.push({ val: '0', type: 'zero' }); break;
      case 'ODD_ATTEMPT': oddState = 'RUNNING'; break;
      case 'ODD_PRINTED': oddState = 'RUNNING'; output.push({ val: e.token, type: 'odd' }); break;
      case 'EVEN_ATTEMPT': evenState = 'RUNNING'; break;
      case 'EVEN_PRINTED': evenState = 'RUNNING'; output.push({ val: e.token, type: 'even' }); break;
      default: break;
    }
    lastThread = e.threadName;
  }

  const logs = appliedEvents.slice(-6).reverse().map(describeEvent);
  const isDone = runResult && playIndex >= events.length && events.length > 0;
  const activeThread = isDone ? null : lastThread;

  return (
    <div className="zeo-container">
      <style>{CSS}</style>

      <div className="zeo-controls">
        <label className="zeo-field">Upper bound (n)
          <input type="number" min="1" max="2000" value={params.n} onChange={handleField('n')} />
        </label>
        <button className="zeo-btn primary" onClick={handleRun} disabled={fetching || replaying}>
          {fetching ? '⏳ Running real threads on backend...' : replaying ? '▶ Replaying trace...' : '▶ Run Real Simulation'}
        </button>
      </div>

      <div className={`zeo-status ${error ? 'error' : ''}`}>
        {error && `⚠️ ${error}`}
        {!error && fetching && 'Spinning up genuine zero/odd/even threads on the backend (three Semaphores)...'}
        {!error && !fetching && runResult && replaying && `Replaying real execution trace: event ${playIndex}/${events.length}`}
        {!error && !fetching && runResult && isDone &&
          `Done — sequence for n=${runResult.n} assembled in ${runResult.durationMillis}ms real wall-clock time.`}
        {!error && !fetching && !runResult && 'Configure n and run — this executes real Java threads on the backend, not an animation.'}
      </div>

      {events.length > 0 && (
        <div className="zeo-progress">
          <div className="zeo-progress-bar" style={{ width: `${(playIndex / events.length) * 100}%` }} />
        </div>
      )}

      <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginBottom: 16 }}>
        3-THREAD SEMAPHORE INTERLEAVED SEQUENCE (real backend threads)
      </div>

      <div className="threads-trio">
        <div className={`thread-card ${activeThread === 'zero-thread' ? 'active' : ''}`}>
          <div style={{ fontSize: 24 }}>0️⃣</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>zero-thread</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>state: {zeroState}</div>
        </div>

        <div className={`thread-card ${activeThread === 'odd-thread' ? 'active' : ''}`}>
          <div style={{ fontSize: 24 }}>1️⃣</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>odd-thread</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>state: {oddState}</div>
        </div>

        <div className={`thread-card ${activeThread === 'even-thread' ? 'active' : ''}`}>
          <div style={{ fontSize: 24 }}>2️⃣</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>even-thread</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>state: {evenState}</div>
        </div>
      </div>

      <div className="seq-stream">
        {output.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Click "Run Real Simulation" to spin up genuine backend threads and replay the actual recorded trace.</div>
        ) : (
          output.map((item, idx) => (
            <div key={idx} className={`seq-tag ${item.type}`}>
              {item.val}
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

export default function ZeroEvenOddPage() {
  return (
    <LldPage module="zero-even-odd" title="Print Zero Even Odd" icon="0️⃣" tabs={['app', 'simulation', 'diagram', 'sequence', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'simulation' && <RealTraceReplay />}
          {activeTab === 'app' && <RealTraceReplay />}
        </>
      )}
    </LldPage>
  );
}
