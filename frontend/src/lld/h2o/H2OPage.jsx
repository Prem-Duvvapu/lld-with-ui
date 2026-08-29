import { useState, useEffect, useRef, useCallback } from 'react';
import LldPage from '../../components/LldPage';
import { runH2O } from './api';
import { ApiError } from '../../utils/api';

const CSS = `
.h2o-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.h2o-controls { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 16px; align-items: flex-end; }
.h2o-field { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: var(--text-muted); font-weight: 600; }
.h2o-field input { width: 90px; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--border-primary); background: var(--bg-primary); color: var(--text-primary); font-size: 13px; }
.h2o-btn { padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; border: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-primary); transition: all 0.2s; }
.h2o-btn.primary { background: var(--accent-gradient); color: #fff; border: none; }
.h2o-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.h2o-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }

.h2o-status { text-align: center; font-size: 12px; color: var(--text-muted); margin-bottom: 14px; min-height: 16px; }
.h2o-status.error { color: var(--danger); font-weight: 600; }

.h2o-progress { width: 100%; height: 6px; border-radius: 4px; background: var(--bg-tertiary); overflow: hidden; margin-bottom: 14px; }
.h2o-progress-bar { height: 100%; background: var(--accent-gradient); transition: width 0.15s linear; }

.h2o-stage { position: relative; background: var(--bg-primary); border-radius: 12px; border: 1px solid var(--border-primary); padding: 20px; min-height: 240px; display: flex; flex-direction: column; align-items: center; justify-content: center; margin-bottom: 20px; }

.atoms-pool { display: flex; gap: 12px; margin: 16px 0; min-height: 60px; align-items: center; flex-wrap: wrap; justify-content: center; }
.atom-bubble { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; color: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.2); transition: all 0.4s; }
.atom-bubble.H { background: var(--accent); border: 2px solid #8ab4f8; }
.atom-bubble.O { background: var(--danger); border: 2px solid #f85149; }

.molecules-list { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-top: 12px; max-height: 90px; overflow-y: auto; }
.molecule-badge { padding: 8px 16px; background: rgba(63,185,80,0.15); border: 2px solid var(--success); border-radius: 20px; font-weight: 700; font-size: 13px; color: var(--success); box-shadow: 0 0 12px rgba(63,185,80,0.3); }
`;

const DEFAULTS = { moleculeCount: 10 };
const REPLAY_MS_PER_EVENT = 60;

function describeEvent(e) {
  const ms = (e.elapsedNanos / 1_000_000).toFixed(1);
  switch (e.type) {
    case 'HYDROGEN_ATTEMPT': return `[+${ms}ms] ${e.threadName} attempting hydrogenSemaphore.acquire()`;
    case 'HYDROGEN_ACQUIRED': return `[+${ms}ms] ${e.threadName} acquired permit -> waiting at CyclicBarrier(3)`;
    case 'HYDROGEN_DEPARTED': return `[+${ms}ms] ${e.threadName} departed barrier -> released hydrogenSemaphore`;
    case 'OXYGEN_ATTEMPT': return `[+${ms}ms] ${e.threadName} attempting oxygenSemaphore.acquire()`;
    case 'OXYGEN_ACQUIRED': return `[+${ms}ms] ${e.threadName} acquired permit -> waiting at CyclicBarrier(3)`;
    case 'OXYGEN_DEPARTED': return `[+${ms}ms] ${e.threadName} departed barrier -> released oxygenSemaphore`;
    case 'MOLECULE_BONDED': return `[+${ms}ms] 💧 Barrier tripped (2H+1O) -> bonded ${e.item}!`;
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
      const result = await runH2O(params);
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
      setError(e instanceof ApiError ? e.message : 'Failed to reach the h2o backend');
    }
  };

  const handleField = (field) => (ev) => {
    const v = ev.target.value === '' ? '' : Number(ev.target.value);
    setParams((p) => ({ ...p, [field]: v }));
  };

  const events = runResult?.events ?? [];
  const appliedEvents = events.slice(0, playIndex);

  // "Waiting" atoms: acquired their permit but not yet departed the barrier
  // (i.e. currently parked in barrier.await()).
  const waiting = []; // list of 'H' | 'O' in acquisition order
  const molecules = [];
  for (const e of appliedEvents) {
    if (e.type === 'HYDROGEN_ACQUIRED') waiting.push('H');
    else if (e.type === 'OXYGEN_ACQUIRED') waiting.push('O');
    else if (e.type === 'MOLECULE_BONDED') {
      // Exactly 3 waiting atoms (2H+1O) just bonded; clear them from the pool.
      let h = 0, o = 0;
      for (let i = waiting.length - 1; i >= 0 && (h < 2 || o < 1); i--) {
        if (waiting[i] === 'H' && h < 2) { waiting.splice(i, 1); h++; }
        else if (waiting[i] === 'O' && o < 1) { waiting.splice(i, 1); o++; }
      }
      molecules.push(e.item);
    }
  }

  const logs = appliedEvents.slice(-6).reverse().map(describeEvent);
  const isDone = runResult && playIndex >= events.length && events.length > 0;
  const hWaiting = waiting.filter((a) => a === 'H').length;
  const oWaiting = waiting.filter((a) => a === 'O').length;

  return (
    <div className="h2o-container">
      <style>{CSS}</style>

      <div className="h2o-controls">
        <label className="h2o-field">Molecules to bond
          <input type="number" min="1" max="150" value={params.moleculeCount} onChange={handleField('moleculeCount')} />
        </label>
        <button className="h2o-btn primary" onClick={handleRun} disabled={fetching || replaying}>
          {fetching ? '⏳ Running real threads on backend...' : replaying ? '▶ Replaying trace...' : '💧 Run Real Simulation'}
        </button>
      </div>

      <div className={`h2o-status ${error ? 'error' : ''}`}>
        {error && `⚠️ ${error}`}
        {!error && fetching && 'Spinning up genuine hydrogen/oxygen threads on the backend (Semaphores + CyclicBarrier)...'}
        {!error && !fetching && runResult && replaying && `Replaying real execution trace: event ${playIndex}/${events.length}`}
        {!error && !fetching && runResult && isDone &&
          `Done — ${runResult.moleculeCount} H2O molecules bonded from ${runResult.hydrogenCount} H + ${runResult.oxygenCount} O in ${runResult.durationMillis}ms real wall-clock time.`}
        {!error && !fetching && !runResult && 'Configure molecule count and run — this executes real Java threads on the backend, not an animation.'}
      </div>

      {events.length > 0 && (
        <div className="h2o-progress">
          <div className="h2o-progress-bar" style={{ width: `${(playIndex / events.length) * 100}%` }} />
        </div>
      )}

      <div className="h2o-stage">
        <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginBottom: 8 }}>
          SEMAPHORE-BOUNDED CYCLICBARRIER(3) MOLECULE BONDER (real backend threads)
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Atoms waiting at the barrier:</div>
        <div className="atoms-pool">
          {Array.from({ length: hWaiting }).map((_, i) => (
            <div key={`h-${i}`} className="atom-bubble H">H</div>
          ))}
          {Array.from({ length: oWaiting }).map((_, i) => (
            <div key={`o-${i}`} className="atom-bubble O">O</div>
          ))}
          {hWaiting === 0 && oWaiting === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No atoms currently parked at the barrier</div>
          )}
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
          Formed water molecules ({molecules.length}/{runResult?.moleculeCount ?? params.moleculeCount}):
        </div>
        <div className="molecules-list">
          {molecules.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No H2O formed yet</div>
          ) : (
            molecules.map((m) => (
              <div key={m} className="molecule-badge">
                💧 {m}
              </div>
            ))
          )}
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

export default function H2OPage() {
  return (
    <LldPage module="h2o" title="Building H2O Molecule" icon="💧" tabs={['app', 'simulation', 'diagram', 'sequence', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'simulation' && <RealTraceReplay />}
          {activeTab === 'app' && <RealTraceReplay />}
        </>
      )}
    </LldPage>
  );
}
