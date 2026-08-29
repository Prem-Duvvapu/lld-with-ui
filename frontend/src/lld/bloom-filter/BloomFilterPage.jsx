import { useState, useEffect, useRef, useCallback } from 'react';
import LldPage from '../../components/LldPage';
import { runBloomFilter } from './api';
import { ApiError } from '../../utils/api';

const CSS = `
.bf-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.bf-controls { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 16px; align-items: flex-end; }
.bf-field { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: var(--text-muted); font-weight: 600; }
.bf-field input { width: 72px; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--border-primary); background: var(--bg-primary); color: var(--text-primary); font-size: 13px; }
.bf-btn { padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; border: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-primary); transition: all 0.2s; }
.bf-btn.primary { background: var(--accent-gradient); color: #fff; border: none; }
.bf-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.bf-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }

.bf-status { text-align: center; font-size: 12px; color: var(--text-muted); margin-bottom: 14px; min-height: 16px; }
.bf-status.error { color: var(--danger); font-weight: 600; }

.bf-progress { width: 100%; height: 6px; border-radius: 4px; background: var(--bg-tertiary); overflow: hidden; margin-bottom: 18px; }
.bf-progress-bar { height: 100%; background: var(--accent-gradient); transition: width 0.15s linear; }

.bf-stage { background: var(--bg-primary); border-radius: 12px; border: 1px solid var(--border-primary); padding: 20px; margin-bottom: 18px; }
.bf-stage-title { font-size: 13px; font-weight: 700; color: var(--text-muted); text-align: center; margin-bottom: 4px; }
.bf-stage-sub { font-size: 11px; color: var(--text-muted); text-align: center; margin-bottom: 14px; }

.bit-strip { display: flex; gap: 5px; overflow-x: auto; padding: 6px 2px 12px; justify-content: flex-start; }
.bit-cell { flex: 0 0 auto; width: 34px; text-align: center; }
.bit-cell .bit-box { width: 34px; height: 34px; border: 2px solid var(--border-primary); border-radius: 8px; background: var(--bg-card); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; color: var(--text-muted); transition: all 0.25s; }
.bit-cell .bit-idx { font-size: 9px; color: var(--text-muted); margin-top: 3px; }
.bit-cell.set .bit-box { border-color: var(--success); background: rgba(63,185,80,0.15); color: var(--success); }
.bit-cell.touched .bit-box { border-color: var(--accent); box-shadow: 0 0 12px var(--accent); transform: scale(1.1); }

.thread-row { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 14px; }
.adder-card { min-width: 108px; background: var(--bg-card); border: 2px solid var(--border-primary); border-radius: 10px; padding: 8px 10px; text-align: center; transition: all 0.25s; }
.adder-card.adding { border-color: var(--accent); box-shadow: 0 0 10px rgba(102,126,234,0.3); }
.adder-card.querying { border-color: var(--info); box-shadow: 0 0 10px rgba(88,166,255,0.3); }
.adder-card .adder-name { font-size: 11px; font-weight: 700; }
.adder-card .adder-item { font-size: 10px; color: var(--text-muted); margin-top: 2px; min-height: 12px; }

.bf-results { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 18px; }
.bf-result-group { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 10px; padding: 12px; }
.bf-result-group h4 { margin: 0 0 8px 0; font-size: 12px; color: var(--text-muted); }
.bf-result-group.fp { border-color: var(--danger); background: rgba(248,81,73,0.08); }
.bf-result-group.fp h4 { color: var(--danger); }
.bf-result-item { display: flex; justify-content: space-between; align-items: center; padding: 5px 8px; border-radius: 6px; background: var(--bg-card); margin-bottom: 5px; font-size: 12px; font-family: monospace; }
.bf-result-item .badge { font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 8px; }
.badge.pos { background: rgba(63,185,80,0.2); color: var(--success); }
.badge.neg { background: var(--bg-tertiary); color: var(--text-muted); }
.badge.fp { background: rgba(248,81,73,0.25); color: var(--danger); }

.fp-callout { border: 1px solid var(--danger); background: rgba(248,81,73,0.1); border-radius: 10px; padding: 12px 14px; margin-bottom: 18px; font-size: 12px; color: var(--text-primary); }
.fp-callout strong { color: var(--danger); }

.bf-metrics { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; margin-bottom: 18px; }
.bf-metric { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 8px 14px; text-align: center; min-width: 100px; }
.bf-metric .val { font-size: 16px; font-weight: 700; }
.bf-metric .lbl { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.4px; }

.bf-log { background: var(--bg-primary); padding: 12px; border-radius: 8px; border: 1px solid var(--border-primary); font-family: monospace; font-size: 12px; overflow-x: auto; }
.bf-log-title { font-weight: 700; color: var(--text-muted); margin-bottom: 4px; }
`;

const DEFAULTS = { bitSize: 28, hashCount: 3, addThreads: 4 };
const REPLAY_MS_PER_EVENT = 170;

function describeEvent(e) {
  const ms = (e.elapsedNanos / 1_000_000).toFixed(1);
  switch (e.type) {
    case 'ADD_ATTEMPT': return `[+${ms}ms] ${e.threadName} attempting add("${e.item}")`;
    case 'BIT_NEWLY_SET': return `[+${ms}ms] ${e.threadName} set bit #${e.bitIndex} for "${e.item}" (newly set) — ${e.bitsSetSoFar} bits set total`;
    case 'BIT_ALREADY_SET': return `[+${ms}ms] ${e.threadName} found bit #${e.bitIndex} for "${e.item}" already set (collision)`;
    case 'ADD_COMPLETE': return `[+${ms}ms] ${e.threadName} finished add("${e.item}")`;
    case 'QUERY_ATTEMPT': return `[+${ms}ms] mightContain("${e.item}") starting`;
    case 'QUERY_BIT_HIT': return `[+${ms}ms] bit #${e.bitIndex} for "${e.item}" is SET (hit)`;
    case 'QUERY_BIT_MISS': return `[+${ms}ms] bit #${e.bitIndex} for "${e.item}" is UNSET (miss) — short-circuiting`;
    case 'QUERY_RESULT_POSITIVE': return `[+${ms}ms] "${e.item}" -> MIGHT CONTAIN (all bits set)`;
    case 'QUERY_RESULT_NEGATIVE': return `[+${ms}ms] "${e.item}" -> DEFINITELY NOT PRESENT`;
    default: return `[+${ms}ms] ${e.threadName}: ${e.type}`;
  }
}

function adderNames(count) {
  return Array.from({ length: count }, (_, i) => `adder-${i + 1}`);
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
      const result = await runBloomFilter(params);
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
      setError(e instanceof ApiError ? e.message : 'Failed to reach the bloom-filter backend');
    }
  };

  const handleField = (field) => (ev) => {
    const v = ev.target.value === '' ? '' : Number(ev.target.value);
    setParams((p) => ({ ...p, [field]: v }));
  };

  const trace = runResult?.trace ?? [];
  const appliedEvents = trace.slice(0, playIndex);
  const bitSize = runResult?.bitSize ?? params.bitSize ?? DEFAULTS.bitSize;
  const threads = adderNames(runResult?.addThreads ?? params.addThreads ?? DEFAULTS.addThreads);

  const bits = Array(bitSize).fill(false);
  let touchedBit = null;
  const threadState = {};
  threads.forEach((n) => { threadState[n] = { status: 'idle', item: null }; });
  let phase = 'idle'; // idle | adding | querying

  for (const e of appliedEvents) {
    switch (e.type) {
      case 'ADD_ATTEMPT':
        threadState[e.threadName] = { status: 'adding', item: e.item };
        phase = 'adding';
        break;
      case 'BIT_NEWLY_SET':
        bits[e.bitIndex] = true;
        touchedBit = e.bitIndex;
        break;
      case 'BIT_ALREADY_SET':
        touchedBit = e.bitIndex;
        break;
      case 'ADD_COMPLETE':
        if (threadState[e.threadName]) threadState[e.threadName] = { status: 'idle', item: null };
        break;
      case 'QUERY_ATTEMPT':
        threadState[e.threadName] = { status: 'querying', item: e.item };
        phase = 'querying';
        break;
      case 'QUERY_BIT_HIT':
      case 'QUERY_BIT_MISS':
        touchedBit = e.bitIndex;
        break;
      case 'QUERY_RESULT_POSITIVE':
      case 'QUERY_RESULT_NEGATIVE':
        if (threadState[e.threadName]) threadState[e.threadName] = { status: 'idle', item: null };
        break;
      default:
        break;
    }
  }

  const logs = appliedEvents.slice(-8).reverse().map(describeEvent);
  const isDone = runResult && playIndex >= trace.length && trace.length > 0;

  const truePositives = runResult?.queries.filter((q) => q.wasAdded) ?? [];
  const trueNegatives = runResult?.queries.filter((q) => !q.wasAdded && !q.falsePositive) ?? [];
  const falsePositives = runResult?.queries.filter((q) => q.falsePositive) ?? [];

  return (
    <div className="bf-container">
      <style>{CSS}</style>

      <div className="bf-controls">
        <label className="bf-field">Bit Size (m)
          <input type="number" min="1" max="4096" value={params.bitSize} onChange={handleField('bitSize')} />
        </label>
        <label className="bf-field">Hash Count (k)
          <input type="number" min="1" max="12" value={params.hashCount} onChange={handleField('hashCount')} />
        </label>
        <label className="bf-field">Add Threads
          <input type="number" min="1" max="16" value={params.addThreads} onChange={handleField('addThreads')} />
        </label>
        <button className="bf-btn primary" onClick={handleRun} disabled={fetching || replaying}>
          {fetching ? '⏳ Running real threads on backend...' : replaying ? '▶ Replaying trace...' : '⚡ Run Real Simulation'}
        </button>
      </div>

      <div className={`bf-status ${error ? 'error' : ''}`}>
        {error && `⚠️ ${error}`}
        {!error && fetching && 'Spinning up genuine adder threads on the backend (BitSet + ReentrantLock, double hashing)...'}
        {!error && !fetching && runResult && replaying && `Replaying real execution trace: event ${playIndex}/${trace.length} (${phase === 'adding' ? 'concurrent add phase' : phase === 'querying' ? 'query / false-positive hunt phase' : '...'})`}
        {!error && !fetching && runResult && isDone &&
          `Done — ${runResult.itemsAdded.length} items added by ${runResult.addThreads} real threads in ${runResult.durationMillis}ms. ${runResult.bitsSetCount}/${runResult.bitSize} bits set. False positive demonstrated: ${runResult.falsePositiveDemonstrated ? 'YES ⚠️' : 'no (none found in 1000 probes)'}.`}
        {!error && !fetching && !runResult && 'Configure parameters and run — this executes a real Java Bloom filter on the backend, not an animation.'}
      </div>

      {trace.length > 0 && (
        <div className="bf-progress">
          <div className="bf-progress-bar" style={{ width: `${(playIndex / trace.length) * 100}%` }} />
        </div>
      )}

      <div className="bf-stage">
        <div className="bf-stage-title">BIT ARRAY — m = {bitSize} bits, k = {runResult?.hashCount ?? params.hashCount ?? DEFAULTS.hashCount} hash functions (double hashing)</div>
        <div className="bf-stage-sub">h1 = String.hashCode() &middot; h2 = FNV-1a(32-bit) &middot; position_i = (h1 + i·h2) mod m</div>

        <div className="bit-strip">
          {bits.map((isSet, idx) => (
            <div key={idx} className={`bit-cell ${isSet ? 'set' : ''} ${touchedBit === idx ? 'touched' : ''}`}>
              <div className="bit-box">{isSet ? 1 : 0}</div>
              <div className="bit-idx">{idx}</div>
            </div>
          ))}
        </div>

        <div className="thread-row">
          {threads.map((name) => {
            const st = threadState[name];
            return (
              <div key={name} className={`adder-card ${st.status}`}>
                <div className="adder-name">⚙️ {name}</div>
                <div className="adder-item">
                  {st.status === 'adding' ? `add("${st.item}")` : st.status === 'querying' ? `query("${st.item}")` : 'idle'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isDone && runResult && (
        <>
          {runResult.falsePositiveDemonstrated && falsePositives.length > 0 && (
            <div className="fp-callout">
              <strong>⚠️ False positive demonstrated:</strong> "{falsePositives[0].item}" was <strong>NEVER added</strong> to
              the filter, yet <code>mightContain("{falsePositives[0].item}")</code> returned <strong>true</strong>. This
              happens because every one of its {runResult.hashCount} hashed bit positions happened to already be set by
              other, unrelated items that genuinely were added — the filter cannot distinguish "set because this exact
              item was added" from "set because something else collided onto the same bit". This is the Bloom filter's
              fundamental trade-off: it never lies about absence, but it can lie about presence.
            </div>
          )}

          <div className="bf-metrics">
            <div className="bf-metric"><div className="val">{runResult.bitsSetCount}/{runResult.bitSize}</div><div className="lbl">Bits Set</div></div>
            <div className="bf-metric"><div className="val">{((runResult.bitsSetCount / runResult.bitSize) * 100).toFixed(1)}%</div><div className="lbl">Fill Factor</div></div>
            <div className="bf-metric"><div className="val">{runResult.durationMillis}ms</div><div className="lbl">Run Time</div></div>
            <div className="bf-metric"><div className="val">{truePositives.length}</div><div className="lbl">True Positives</div></div>
            <div className="bf-metric"><div className="val">{trueNegatives.length}</div><div className="lbl">True Negatives</div></div>
          </div>

          <div className="bf-results">
            <div className="bf-result-group">
              <h4>✅ True Positives (added, and correctly found)</h4>
              {truePositives.map((q) => (
                <div key={q.item} className="bf-result-item">
                  <span>"{q.item}"</span>
                  <span className="badge pos">MIGHT CONTAIN</span>
                </div>
              ))}
            </div>
            <div className="bf-result-group">
              <h4>⭕ True Negatives (never added, correctly rejected)</h4>
              {trueNegatives.map((q) => (
                <div key={q.item} className="bf-result-item">
                  <span>"{q.item}"</span>
                  <span className="badge neg">NOT PRESENT</span>
                </div>
              ))}
              {trueNegatives.length === 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>None — every true-negative candidate happened to collide this run.</div>}
            </div>
            <div className="bf-result-group fp">
              <h4>⚠️ False Positive (never added, wrongly reported present)</h4>
              {falsePositives.length > 0 ? falsePositives.map((q) => (
                <div key={q.item} className="bf-result-item">
                  <span>"{q.item}"</span>
                  <span className="badge fp">FALSE POSITIVE</span>
                </div>
              )) : <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>None found in 1000 probes at this bitSize/hashCount — try shrinking bit size to raise the collision rate.</div>}
            </div>
          </div>
        </>
      )}

      <div className="bf-log">
        <div className="bf-log-title">Real Execution Trace (backend-recorded, thread-attributed, timestamped):</div>
        {logs.length === 0
          ? <div style={{ color: 'var(--text-muted)' }}>Click "Run Real Simulation" to spin up genuine backend threads and replay the actual recorded trace.</div>
          : logs.map((l, idx) => (
            <div key={idx} style={{ color: idx === 0 ? 'var(--info)' : 'var(--text-muted)' }}>{l}</div>
          ))}
      </div>
    </div>
  );
}

export default function BloomFilterPage() {
  return (
    <LldPage module="bloom-filter" title="Concurrent Bloom Filter" icon="🌸" tabs={['app', 'simulation', 'diagram', 'sequence', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'simulation' && <RealTraceReplay />}
          {activeTab === 'app' && <RealTraceReplay />}
        </>
      )}
    </LldPage>
  );
}
