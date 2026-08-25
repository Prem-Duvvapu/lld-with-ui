import { useState, useEffect, useRef, useCallback } from 'react';
import LldPage from '../../components/LldPage';
import { runFizzBuzz } from './api';
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

.threads-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
.thread-box { background: var(--bg-card); border: 2px solid var(--border-primary); border-radius: 10px; padding: 12px; text-align: center; transition: all 0.3s; }
.thread-box.active { border-color: var(--accent); box-shadow: 0 0 14px rgba(102,126,234,0.4); transform: scale(1.04); }

.stream-output { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 16px; min-height: 140px; max-height: 220px; overflow-y: auto; font-family: monospace; font-size: 13px; display: flex; flex-wrap: wrap; gap: 8px; align-content: flex-start; }
.output-pill { padding: 4px 10px; border-radius: 6px; font-weight: 700; background: var(--bg-tertiary); border: 1px solid var(--border-secondary); }
.output-pill.fizz { background: rgba(102,126,234,0.2); color: var(--accent); border-color: var(--accent); }
.output-pill.buzz { background: rgba(234,179,8,0.2); color: var(--warning); border-color: var(--warning); }
.output-pill.fizzbuzz { background: rgba(239,68,68,0.2); color: var(--danger); border-color: var(--danger); }
.output-pill.num { color: var(--text-primary); }
`;

const DEFAULTS = { n: 20 };
const REPLAY_MS_PER_EVENT = 90;

const THREAD_FOR_TYPE = {
  NUMBER_ATTEMPT: 'number-thread', NUMBER_PRINTED: 'number-thread',
  FIZZ_ATTEMPT: 'fizz-thread', FIZZ_PRINTED: 'fizz-thread',
  BUZZ_ATTEMPT: 'buzz-thread', BUZZ_PRINTED: 'buzz-thread',
  FIZZBUZZ_ATTEMPT: 'fizzbuzz-thread', FIZZBUZZ_PRINTED: 'fizzbuzz-thread',
};

function describeEvent(e) {
  const ms = (e.elapsedNanos / 1_000_000).toFixed(1);
  const printed = e.type.endsWith('_PRINTED');
  const verb = printed ? `printed "${e.token}"` : 'checking whether it is its turn';
  return `[+${ms}ms] ${THREAD_FOR_TYPE[e.type] || e.threadName} ${verb} for n=${e.n}`;
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
      const result = await runFizzBuzz(params);
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
      setError(e instanceof ApiError ? e.message : 'Failed to reach the fizz-buzz backend');
    }
  };

  const handleField = (field) => (ev) => {
    const v = ev.target.value === '' ? '' : Number(ev.target.value);
    setParams((p) => ({ ...p, [field]: v }));
  };

  const events = runResult?.events ?? [];
  const appliedEvents = events.slice(0, playIndex);

  const outputs = [];
  let activeThread = null;
  for (const e of appliedEvents) {
    activeThread = THREAD_FOR_TYPE[e.type] || activeThread;
    if (e.type === 'NUMBER_PRINTED') outputs.push({ val: e.token, type: 'num', num: e.n });
    else if (e.type === 'FIZZ_PRINTED') outputs.push({ val: e.token, type: 'fizz', num: e.n });
    else if (e.type === 'BUZZ_PRINTED') outputs.push({ val: e.token, type: 'buzz', num: e.n });
    else if (e.type === 'FIZZBUZZ_PRINTED') outputs.push({ val: e.token, type: 'fizzbuzz', num: e.n });
  }

  const logs = appliedEvents.slice(-6).reverse().map(describeEvent);
  const isDone = runResult && playIndex >= events.length && events.length > 0;
  const displayActiveThread = isDone ? null : activeThread;

  return (
    <div className="fb-container">
      <style>{CSS}</style>

      <div className="fb-controls">
        <label className="fb-field">Upper bound (n)
          <input type="number" min="1" max="3000" value={params.n} onChange={handleField('n')} />
        </label>
        <button className="fb-btn primary" onClick={handleRun} disabled={fetching || replaying}>
          {fetching ? '⏳ Running real threads on backend...' : replaying ? '▶ Replaying trace...' : '▶ Run Real Simulation'}
        </button>
      </div>

      <div className={`fb-status ${error ? 'error' : ''}`}>
        {error && `⚠️ ${error}`}
        {!error && fetching && 'Spinning up genuine number/fizz/buzz/fizzbuzz threads on the backend (ReentrantLock + Condition)...'}
        {!error && !fetching && runResult && replaying && `Replaying real execution trace: event ${playIndex}/${events.length}`}
        {!error && !fetching && runResult && isDone &&
          `Done — 1..${runResult.n} assembled in ${runResult.durationMillis}ms real wall-clock time.`}
        {!error && !fetching && !runResult && 'Configure n and run — this executes real Java threads on the backend, not an animation.'}
      </div>

      {events.length > 0 && (
        <div className="fb-progress">
          <div className="fb-progress-bar" style={{ width: `${(playIndex / events.length) * 100}%` }} />
        </div>
      )}

      <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginBottom: 12 }}>
        4-THREAD MONITOR SYNCHRONIZATION (real backend threads)
      </div>

      <div className="threads-grid">
        <div className={`thread-box ${displayActiveThread === 'fizz-thread' ? 'active' : ''}`}>
          <div style={{ fontSize: 24 }}>⚡</div>
          <div style={{ fontSize: 12, fontWeight: 700 }}>fizz-thread</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Condition: n % 3 == 0 &amp;&amp; n % 5 != 0</div>
        </div>

        <div className={`thread-box ${displayActiveThread === 'buzz-thread' ? 'active' : ''}`}>
          <div style={{ fontSize: 24 }}>🔔</div>
          <div style={{ fontSize: 12, fontWeight: 700 }}>buzz-thread</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Condition: n % 5 == 0 &amp;&amp; n % 3 != 0</div>
        </div>

        <div className={`thread-box ${displayActiveThread === 'fizzbuzz-thread' ? 'active' : ''}`}>
          <div style={{ fontSize: 24 }}>🎆</div>
          <div style={{ fontSize: 12, fontWeight: 700 }}>fizzbuzz-thread</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Condition: n % 15 == 0</div>
        </div>

        <div className={`thread-box ${displayActiveThread === 'number-thread' ? 'active' : ''}`}>
          <div style={{ fontSize: 24 }}>🔢</div>
          <div style={{ fontSize: 12, fontWeight: 700 }}>number-thread</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Condition: else</div>
        </div>
      </div>

      <div className="stream-output">
        {outputs.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Click "Run Real Simulation" to spin up genuine backend threads and replay the actual recorded trace.</div>
        ) : (
          outputs.map((item, idx) => (
            <div key={idx} className={`output-pill ${item.type}`}>
              {item.num}: {item.val}
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

export default function FizzBuzzPage() {
  return (
    <LldPage module="fizz-buzz" title="Fizz Buzz Multithreaded" icon="⚡" tabs={['app', 'simulation', 'diagram', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'simulation' && <RealTraceReplay />}
          {activeTab === 'app' && <RealTraceReplay />}
        </>
      )}
    </LldPage>
  );
}
