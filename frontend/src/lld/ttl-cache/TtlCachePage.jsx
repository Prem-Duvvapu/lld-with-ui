import { useState, useEffect, useRef, useCallback } from 'react';
import LldPage from '../../components/LldPage';
import { runTtlCache } from './api';
import { ApiError } from '../../utils/api';

const CSS = `
.ttl-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.ttl-controls { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 16px; align-items: flex-end; }
.ttl-field { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: var(--text-muted); font-weight: 600; }
.ttl-field input { width: 100px; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--border-primary); background: var(--bg-primary); color: var(--text-primary); font-size: 13px; }
.ttl-btn { padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; border: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-primary); transition: all 0.2s; }
.ttl-btn.primary { background: var(--accent-gradient); color: #fff; border: none; }
.ttl-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.ttl-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }

.ttl-status { text-align: center; font-size: 12px; color: var(--text-muted); margin-bottom: 14px; min-height: 16px; }
.ttl-status.error { color: var(--danger); font-weight: 600; }

.ttl-progress { width: 100%; height: 6px; border-radius: 4px; background: var(--bg-tertiary); overflow: hidden; margin-bottom: 14px; }
.ttl-progress-bar { height: 100%; background: var(--accent-gradient); transition: width 0.15s linear; }

.sweeper-badge { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 8px 14px; border-radius: 10px; border: 1px dashed var(--border-primary); background: var(--bg-primary); font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 16px; transition: all 0.25s; }
.sweeper-badge.sweeping { border-style: solid; border-color: var(--danger); background: rgba(248,81,79,0.12); color: var(--danger); }

.ttl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; margin-top: 4px; }
.ttl-card { background: var(--bg-card); border: 2px solid var(--accent); border-radius: 10px; padding: 14px; text-align: center; position: relative; transition: all 0.3s; }
.ttl-card.expired-flash { border-color: var(--danger); }
.ttl-card.hit-flash { box-shadow: 0 0 12px rgba(63,185,80,0.5); }

.progress-bar-bg { width: 100%; height: 6px; background: var(--bg-tertiary); border-radius: 3px; overflow: hidden; margin-top: 8px; }
.progress-bar-fill { height: 100%; transition: width 0.15s linear; }

.ttl-log { margin-top: 16px; background: var(--bg-primary); padding: 12px; border-radius: 8px; border: 1px solid var(--border-primary); font-family: monospace; font-size: 12px; }
`;

const DEFAULT_SWEEP_INTERVAL_MILLIS = 600;
const REPLAY_MS_PER_EVENT = 320;

function describeEvent(e) {
  const ms = (e.elapsedNanos / 1_000_000).toFixed(0);
  switch (e.type) {
    case 'PUT': return `[+${ms}ms] PUT("${e.key}", "${e.value}") ttl=${e.ttlMillis}ms -> cache size ${e.cacheSize}`;
    case 'GET_HIT': return `[+${ms}ms] GET("${e.key}") -> HIT "${e.value}" (cache size ${e.cacheSize})`;
    case 'GET_MISS_NOT_FOUND': return `[+${ms}ms] GET("${e.key}") -> MISS, key not found`;
    case 'GET_MISS_EXPIRED': return `[+${ms}ms] GET("${e.key}") -> MISS, TTL expired (lazily evicted on read, sweeper hasn't run yet)`;
    case 'BACKGROUND_EVICTION': return `[+${ms}ms] 🧹 Sweeper thread evicted "${e.key}" (expired, no get() involved) -> cache size ${e.cacheSize}`;
    default: return `[+${ms}ms] ${e.type}`;
  }
}

function RealTraceReplay() {
  const [sweepIntervalMillis, setSweepIntervalMillis] = useState(DEFAULT_SWEEP_INTERVAL_MILLIS);
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
      const result = await runTtlCache({ sweepIntervalMillis });
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
      setError(e instanceof ApiError ? e.message : 'Failed to reach the ttl-cache backend');
    }
  };

  const trace = runResult?.trace ?? [];
  const appliedEvents = trace.slice(0, playIndex);
  const lastEvent = appliedEvents[appliedEvents.length - 1];
  const currentElapsedMs = lastEvent ? lastEvent.elapsedNanos / 1_000_000 : 0;

  // Replay derivation: fold every applied event into the current entry map. This is
  // real recorded state, not an animation — a PUT (re)creates an entry with its real
  // ttlMillis and the real elapsedMs it happened at; a lazy or background eviction
  // removes it; hits/misses just flash the card briefly.
  const entries = new Map();
  let flashKey = null;
  let flashKind = null;
  let sweeping = false;

  for (const e of appliedEvents) {
    switch (e.type) {
      case 'PUT':
        entries.set(e.key, { value: e.value, ttlMillis: e.ttlMillis, putAtMs: e.elapsedNanos / 1_000_000 });
        break;
      case 'GET_MISS_EXPIRED':
        entries.delete(e.key);
        break;
      case 'BACKGROUND_EVICTION':
        entries.delete(e.key);
        break;
      default:
        break;
    }
  }
  if (lastEvent) {
    flashKey = lastEvent.key;
    flashKind = lastEvent.type;
    sweeping = lastEvent.type === 'BACKGROUND_EVICTION';
  }

  const cards = Array.from(entries.entries()).map(([key, entry]) => {
    const elapsedSincePut = currentElapsedMs - entry.putAtMs;
    const remainingMs = Math.max(0, entry.ttlMillis - elapsedSincePut);
    const pct = Math.max(0, Math.min(100, (remainingMs / entry.ttlMillis) * 100));
    return { key, ...entry, remainingMs, pct };
  }).sort((a, b) => a.key.localeCompare(b.key));

  const isDone = runResult && playIndex >= trace.length && trace.length > 0;
  const logs = appliedEvents.slice(-7).reverse().map(describeEvent);

  return (
    <div className="ttl-container">
      <style>{CSS}</style>

      <div className="ttl-controls">
        <label className="ttl-field">Sweep interval (ms)
          <input
            type="number" min="50" max="5000" step="50"
            value={sweepIntervalMillis}
            onChange={(ev) => setSweepIntervalMillis(ev.target.value === '' ? '' : Number(ev.target.value))}
          />
        </label>
        <button className="ttl-btn primary" onClick={handleRun} disabled={fetching || replaying}>
          {fetching ? '⏳ Running real threads on backend...' : replaying ? '▶ Replaying trace...' : '⚡ Run Real Simulation'}
        </button>
      </div>

      <div className={`ttl-status ${error ? 'error' : ''}`}>
        {error && `⚠️ ${error}`}
        {!error && fetching && 'Spinning up a real ConcurrentHashMap-backed cache with a genuine ScheduledExecutorService sweeper on the backend...'}
        {!error && !fetching && runResult && replaying && `Replaying real execution trace: event ${playIndex}/${trace.length}`}
        {!error && !fetching && runResult && isDone &&
          `Done — ${runResult.totalPuts} puts, ${runResult.totalGets} gets, ${runResult.finalCacheSize} entries still live, in ${runResult.durationMillis}ms real wall-clock time.`}
        {!error && !fetching && !runResult && 'Configure the sweep interval and run — this executes a real background eviction thread on the backend, not an animation.'}
      </div>

      {trace.length > 0 && (
        <div className="ttl-progress">
          <div className="ttl-progress-bar" style={{ width: `${(playIndex / trace.length) * 100}%` }} />
        </div>
      )}

      <div className={`sweeper-badge ${sweeping ? 'sweeping' : ''}`}>
        {sweeping ? `🧹 Background sweeper thread evicting "${flashKey}"` : `🧹 Background sweeper thread idle (fires every ${runResult?.sweepIntervalMillis ?? sweepIntervalMillis}ms)`}
      </div>

      <div style={{ background: 'var(--bg-primary)', padding: 20, borderRadius: 12, border: '1px solid var(--border-primary)' }}>
        <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>
          LIVE CACHE ENTRIES (REAL BACKEND STATE)
        </div>

        <div className="ttl-grid">
          {cards.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
              {runResult ? 'No live entries at this point in the replay — evicted lazily on read or by the background sweeper.' : 'Run the real simulation to populate the cache.'}
            </div>
          ) : (
            cards.map((c) => {
              const isFlash = c.key === flashKey;
              const flashClass = isFlash && flashKind === 'GET_HIT' ? 'hit-flash' : isFlash && (flashKind === 'GET_MISS_EXPIRED' || flashKind === 'BACKGROUND_EVICTION') ? 'expired-flash' : '';
              return (
                <div key={c.key} className={`ttl-card ${flashClass}`}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>"{c.key}"</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, wordBreak: 'break-all' }}>{c.value}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--info)', marginTop: 6 }}>
                    ⏱️ {(c.remainingMs / 1000).toFixed(1)}s left
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${c.pct}%`, background: c.pct < 30 ? 'var(--danger)' : 'var(--accent)' }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="ttl-log">
        <div style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>Real Execution Trace (backend-recorded, timestamped):</div>
        {logs.length === 0
          ? <div style={{ color: 'var(--text-muted)' }}>Click "Run Real Simulation" to spin up a genuine backend cache + sweeper and replay the actual recorded trace.</div>
          : logs.map((l, idx) => (
            <div key={idx} style={{ color: idx === 0 ? 'var(--info)' : 'var(--text-muted)' }}>{l}</div>
          ))}
      </div>
    </div>
  );
}

export default function TtlCachePage() {
  return (
    <LldPage module="ttl-cache" title="TTL Cache System" icon="⏱️" tabs={['app', 'simulation', 'diagram', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'simulation' && <RealTraceReplay />}
          {activeTab === 'app' && <RealTraceReplay />}
        </>
      )}
    </LldPage>
  );
}
