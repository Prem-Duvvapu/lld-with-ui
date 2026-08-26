import { useState, useEffect, useRef, useCallback } from 'react';
import LldPage from '../../components/LldPage';
import { runConcurrentHashMap } from './api';
import { ApiError } from '../../utils/api';

const CSS = `
.chm-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.chm-controls { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 16px; align-items: flex-end; }
.chm-field { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: var(--text-muted); font-weight: 600; }
.chm-field input { width: 76px; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--border-primary); background: var(--bg-primary); color: var(--text-primary); font-size: 13px; }
.chm-btn { padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; border: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-primary); transition: all 0.2s; }
.chm-btn.primary { background: var(--accent-gradient); color: #fff; border: none; }
.chm-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.chm-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }

.chm-status { text-align: center; font-size: 12px; color: var(--text-muted); margin-bottom: 14px; min-height: 16px; }
.chm-status.error { color: var(--danger); font-weight: 600; }

.chm-progress { width: 100%; height: 6px; border-radius: 4px; background: var(--bg-tertiary); overflow: hidden; margin-bottom: 14px; }
.chm-progress-bar { height: 100%; background: var(--accent-gradient); transition: width 0.15s linear; }

.chm-meta { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 16px; }
.chm-badge { padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; background: var(--bg-tertiary); border: 1px solid var(--border-primary); color: var(--text-muted); }
.chm-badge.phase-increment { border-color: var(--accent); color: var(--accent); background: rgba(102,126,234,0.1); }
.chm-badge.phase-compute { border-color: var(--info); color: var(--info); background: rgba(56,189,248,0.1); }
.chm-badge.phase-verify { border-color: var(--success); color: var(--success); background: rgba(63,185,80,0.1); }
.chm-badge.compute-ok { border-color: var(--success); color: var(--success); }
.chm-badge.compute-bad { border-color: var(--danger); color: var(--danger); }

.chm-stage { background: var(--bg-primary); border-radius: 12px; border: 1px solid var(--border-primary); padding: 20px; margin-bottom: 20px; }
.segment-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; margin-top: 16px; }
.segment-card { background: var(--bg-card); border: 2px solid var(--border-primary); border-radius: 10px; padding: 12px; transition: all 0.25s; position: relative; }
.segment-card.locked { border-color: var(--danger); box-shadow: 0 0 14px rgba(248,81,73,0.3); background: rgba(248,81,73,0.05); }

.seg-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-secondary); padding-bottom: 6px; margin-bottom: 8px; font-size: 12px; font-weight: 700; }
.bucket-list { display: flex; flex-direction: column; gap: 4px; min-height: 40px; }
.bucket-item { padding: 4px 8px; background: var(--bg-tertiary); border: 1px solid var(--border-secondary); border-radius: 4px; font-family: monospace; font-size: 11px; display: flex; justify-content: space-between; gap: 6px; }
.bucket-empty { font-size: 10px; color: var(--text-muted); text-align: center; padding: 8px; }

.chm-log { background: var(--bg-primary); padding: 12px; border-radius: 8px; border: 1px solid var(--border-primary); font-family: monospace; font-size: 12px; }
.chm-log-title { font-weight: 700; color: var(--text-muted); margin-bottom: 4px; }
`;

const DEFAULTS = { segments: 6, threads: 4, incrementsPerThread: 5, distinctKeys: 3, computeRacers: 5 };
const REPLAY_MS_PER_EVENT = 150;

function phaseFor(event) {
  if (!event) return null;
  if (event.threadName?.startsWith('incrementer-')) return 'increment';
  if (event.threadName?.startsWith('racer-')) return 'compute';
  return 'verify';
}

const PHASE_LABEL = {
  increment: 'Phase A — Concurrent Increments (merge)',
  compute: 'Phase B — computeIfAbsent Race',
  verify: 'Verifying — reading final counters',
};

function describeEvent(e) {
  const ms = (e.elapsedNanos / 1_000_000).toFixed(1);
  switch (e.type) {
    case 'SEGMENT_LOCK_ACQUIRED': return `[+${ms}ms] ${e.threadName} acquired lock on Segment[${e.segmentIndex}] for key "${e.key}"`;
    case 'SEGMENT_LOCK_RELEASED': return `[+${ms}ms] ${e.threadName} released lock on Segment[${e.segmentIndex}]`;
    case 'PUT_SUCCESS': return `[+${ms}ms] ${e.threadName} put("${e.key}") = ${e.valueAfter} in Segment[${e.segmentIndex}] (size ${e.segmentSize})`;
    case 'GET_HIT': return `[+${ms}ms] ${e.threadName} get("${e.key}") -> HIT ${e.valueAfter}`;
    case 'GET_MISS': return `[+${ms}ms] ${e.threadName} get("${e.key}") -> MISS`;
    case 'REMOVE_SUCCESS': return `[+${ms}ms] ${e.threadName} removed "${e.key}" (was ${e.valueAfter})`;
    case 'REMOVE_MISS': return `[+${ms}ms] ${e.threadName} remove("${e.key}") -> nothing to remove`;
    case 'MERGE_SUCCESS': return `[+${ms}ms] ${e.threadName} merge("${e.key}") -> ${e.valueAfter} in Segment[${e.segmentIndex}]`;
    case 'COMPUTE_IF_ABSENT_ATTEMPT': return `[+${ms}ms] ${e.threadName} sees "${e.key}" ABSENT — invoking mapping function...`;
    case 'COMPUTE_IF_ABSENT_COMPUTED': return `[+${ms}ms] ${e.threadName} computed "${e.key}" = ${e.valueAfter} (only this racer ever ran the function)`;
    case 'COMPUTE_IF_ABSENT_SKIPPED': return `[+${ms}ms] ${e.threadName} sees "${e.key}" already present (${e.valueAfter}) — skipped, no compute`;
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
      const result = await runConcurrentHashMap(params);
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
      setError(e instanceof ApiError ? e.message : 'Failed to reach the concurrent-hashmap backend');
    }
  };

  const handleField = (field) => (ev) => {
    const v = ev.target.value === '' ? '' : Number(ev.target.value);
    setParams((p) => ({ ...p, [field]: v }));
  };

  // Replay derivation: fold every event up to playIndex into segment/grid state,
  // exactly the way blocking-queue folds its trace into queue/thread state.
  const trace = runResult?.trace ?? [];
  const appliedEvents = trace.slice(0, playIndex);

  const segmentCount = runResult?.segments ?? params.segments ?? DEFAULTS.segments;
  const segmentState = Array.from({ length: segmentCount }, () => ({ lockedBy: null, entries: {} }));
  let computeCount = 0;

  for (const e of appliedEvents) {
    const seg = segmentState[e.segmentIndex];
    switch (e.type) {
      case 'SEGMENT_LOCK_ACQUIRED':
        if (seg) seg.lockedBy = e.threadName;
        break;
      case 'SEGMENT_LOCK_RELEASED':
        if (seg && seg.lockedBy === e.threadName) seg.lockedBy = null;
        break;
      case 'PUT_SUCCESS':
      case 'MERGE_SUCCESS':
      case 'COMPUTE_IF_ABSENT_COMPUTED':
        if (seg) seg.entries[e.key] = e.valueAfter;
        if (e.type === 'COMPUTE_IF_ABSENT_COMPUTED') computeCount += 1;
        break;
      case 'REMOVE_SUCCESS':
        if (seg) delete seg.entries[e.key];
        break;
      default:
        break;
    }
  }

  const lastEvent = appliedEvents[appliedEvents.length - 1];
  const currentPhase = phaseFor(lastEvent);
  const logs = appliedEvents.slice(-6).reverse().map(describeEvent);

  const isDone = runResult && playIndex >= trace.length && trace.length > 0;
  const computeBadgeClass = isDone ? (computeCount === 1 ? 'compute-ok' : 'compute-bad') : '';

  return (
    <div className="chm-container">
      <style>{CSS}</style>

      <div className="chm-controls">
        <label className="chm-field">Segments
          <input type="number" min="1" max="32" value={params.segments} onChange={handleField('segments')} />
        </label>
        <label className="chm-field">Threads
          <input type="number" min="1" max="24" value={params.threads} onChange={handleField('threads')} />
        </label>
        <label className="chm-field">Increments/Thread
          <input type="number" min="1" max="200" value={params.incrementsPerThread} onChange={handleField('incrementsPerThread')} />
        </label>
        <label className="chm-field">Distinct Keys
          <input type="number" min="1" max="16" value={params.distinctKeys} onChange={handleField('distinctKeys')} />
        </label>
        <label className="chm-field">Compute Racers
          <input type="number" min="1" max="24" value={params.computeRacers} onChange={handleField('computeRacers')} />
        </label>
        <button className="chm-btn primary" onClick={handleRun} disabled={fetching || replaying}>
          {fetching ? '⏳ Running real threads on backend...' : replaying ? '▶ Replaying trace...' : '⚡ Run Real Simulation'}
        </button>
      </div>

      <div className={`chm-status ${error ? 'error' : ''}`}>
        {error && `⚠️ ${error}`}
        {!error && fetching && 'Spinning up genuine threads on the backend against a striped-lock map (ReentrantLock[] + HashMap[])...'}
        {!error && !fetching && runResult && replaying && `Replaying real execution trace: event ${playIndex}/${trace.length}`}
        {!error && !fetching && runResult && isDone &&
          `Done in ${runResult.durationMillis}ms — ${runResult.sumOfFinalCounters}/${runResult.totalIncrements} increments landed (no lost updates), ${runResult.computeExecutions} compute execution(s) across ${runResult.computeRacers} racers (expect exactly 1).`}
        {!error && !fetching && !runResult && 'Configure parameters and run — this executes real Java threads on the backend, not an animation.'}
      </div>

      {trace.length > 0 && (
        <div className="chm-progress">
          <div className="chm-progress-bar" style={{ width: `${(playIndex / trace.length) * 100}%` }} />
        </div>
      )}

      <div className="chm-meta">
        <span className={`chm-badge ${currentPhase ? `phase-${currentPhase}` : ''}`}>
          {currentPhase ? PHASE_LABEL[currentPhase] : 'Idle — no run yet'}
        </span>
        <span className={`chm-badge ${computeBadgeClass}`}>
          computeIfAbsent executions observed: {computeCount}{isDone ? (computeCount === 1 ? ' ✓' : ' ✗ expected 1') : ''}
        </span>
      </div>

      <div className="chm-stage">
        <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>
          CONCURRENT HASHMAP — STRIPED LOCK SEGMENTS ({segmentCount} independent {segmentCount === 1 ? 'lock' : 'locks'})
        </div>
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
          Each segment is guarded by its own ReentrantLock over a plain HashMap — a highlighted border means a real thread currently holds that segment's lock.
        </div>

        <div className="segment-grid">
          {segmentState.map((seg, idx) => {
            const entryList = Object.entries(seg.entries);
            return (
              <div key={idx} className={`segment-card ${seg.lockedBy ? 'locked' : ''}`}>
                <div className="seg-header">
                  <span>Seg #{idx}</span>
                  <span style={{ fontSize: 10, color: seg.lockedBy ? 'var(--danger)' : 'var(--success)' }}>
                    {seg.lockedBy ? `🔒 ${seg.lockedBy}` : '🔓 Open'}
                  </span>
                </div>
                <div className="bucket-list">
                  {entryList.length === 0 ? (
                    <div className="bucket-empty">Empty</div>
                  ) : (
                    entryList.map(([key, val]) => (
                      <div key={key} className="bucket-item">
                        <span>"{key}"</span>
                        <span>{val}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="chm-log">
        <div className="chm-log-title">Real Execution Trace (backend-recorded, thread-attributed, timestamped):</div>
        {logs.length === 0
          ? <div style={{ color: 'var(--text-muted)' }}>Click "Run Real Simulation" to spin up genuine backend threads and replay the actual recorded trace.</div>
          : logs.map((l, idx) => (
            <div key={idx} style={{ color: idx === 0 ? 'var(--info)' : 'var(--text-muted)' }}>{l}</div>
          ))}
      </div>
    </div>
  );
}

export default function ConcurrentHashMapPage() {
  return (
    <LldPage module="concurrent-hashmap" title="Concurrent HashMap System" icon="🗺️" tabs={['app', 'simulation', 'diagram', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'simulation' && <RealTraceReplay />}
          {activeTab === 'app' && <RealTraceReplay />}
        </>
      )}
    </LldPage>
  );
}
