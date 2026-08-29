import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import LldPage from '../../components/LldPage';
import { runMergeSort } from './api';
import { ApiError } from '../../utils/api';

const CSS = `
.ms-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.ms-controls { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 16px; align-items: flex-end; }
.ms-field { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: var(--text-muted); font-weight: 600; }
.ms-field input { width: 76px; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--border-primary); background: var(--bg-primary); color: var(--text-primary); font-size: 13px; }
.ms-btn { padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; border: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-primary); transition: all 0.2s; }
.ms-btn.primary { background: var(--accent-gradient); color: #fff; border: none; }
.ms-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.ms-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }

.ms-status { text-align: center; font-size: 12px; color: var(--text-muted); margin-bottom: 14px; min-height: 16px; }
.ms-status.error { color: var(--danger); font-weight: 600; }

.ms-progress { width: 100%; height: 6px; border-radius: 4px; background: var(--bg-tertiary); overflow: hidden; margin-bottom: 18px; }
.ms-progress-bar { height: 100%; background: var(--accent-gradient); transition: width 0.12s linear; }

.ms-stage { background: var(--bg-primary); border-radius: 12px; border: 1px solid var(--border-primary); padding: 20px; margin-bottom: 18px; }

.ms-range-label { text-align: center; font-size: 12px; font-weight: 700; color: var(--info); min-height: 16px; margin-bottom: 6px; font-family: monospace; }

.array-scroll { overflow-x: auto; padding-bottom: 6px; }
.array-row { display: flex; align-items: flex-end; gap: 6px; min-height: 150px; padding: 10px 4px 4px; justify-content: center; }
.array-cell-wrap { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.array-cell { min-width: 30px; padding: 4px 5px 6px; border-radius: 5px 5px 3px 3px; background: var(--bg-tertiary); border: 2px solid var(--border-primary); color: var(--text-primary); font-size: 11px; font-weight: 700; display: flex; align-items: flex-end; justify-content: center; transition: all 0.25s; }
.array-cell.in-range { border-color: var(--accent); }
.array-cell.write-left { background: rgba(88,166,255,0.35); border-color: var(--info); transform: translateY(-4px) scale(1.08); }
.array-cell.write-right { background: rgba(191,110,255,0.35); border-color: #bf6eff; transform: translateY(-4px) scale(1.08); }
.array-cell.sorted { background: rgba(63,185,80,0.2); border-color: var(--success); }
.array-index { font-size: 9px; color: var(--text-muted); font-weight: 600; }
.range-underline { width: 100%; height: 3px; border-radius: 2px; background: transparent; }
.range-underline.on { background: var(--accent); }

.ms-threads { margin-top: 4px; }
.ms-threads-title { font-size: 11px; font-weight: 700; color: var(--text-muted); text-align: center; margin-bottom: 8px; }
.thread-badges { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.thread-badge { padding: 5px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; font-family: monospace; background: var(--bg-tertiary); border: 1px solid var(--border-primary); color: var(--text-muted); opacity: 0.4; transition: all 0.3s; }
.thread-badge.lit { opacity: 1; background: var(--accent); color: #fff; border-color: var(--accent); box-shadow: 0 0 10px rgba(102,126,234,0.4); }

.ms-tree { margin-top: 18px; }
.ms-tree-title { font-size: 11px; font-weight: 700; color: var(--text-muted); text-align: center; margin-bottom: 8px; }
.tree-level { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; margin-bottom: 6px; }
.tree-node { padding: 3px 7px; border-radius: 5px; font-size: 10px; font-family: monospace; font-weight: 700; border: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-muted); transition: all 0.25s; }
.tree-node.partitioned { background: rgba(88,166,255,0.15); border-color: var(--info); color: var(--info); }
.tree-node.forked { background: rgba(191,110,255,0.18); border-color: #bf6eff; color: #bf6eff; }
.tree-node.merging { background: rgba(210,153,34,0.18); border-color: var(--warning); color: var(--warning); }
.tree-node.merged { background: rgba(63,185,80,0.18); border-color: var(--success); color: var(--success); }
.tree-node.base { background: rgba(63,185,80,0.1); border-color: var(--success); color: var(--success); opacity: 0.8; }

.ms-log { background: var(--bg-primary); padding: 12px; border-radius: 8px; border: 1px solid var(--border-primary); font-family: monospace; font-size: 12px; }
.ms-log-title { font-weight: 700; color: var(--text-muted); margin-bottom: 4px; }
`;

const DEFAULTS = { size: 12, parallelism: 4, sequentialThreshold: 2 };
const REPLAY_MS_PER_EVENT = 130;

// UI-side ceilings, independent of the backend's (much larger) MAX_SIZE=5000 etc.
// The replay stage folds every trace event up to playIndex on every tick, so an
// unbounded array size would generate tens of thousands of events and make that
// fold (and the recursion tree) unusable in the browser well before the backend
// itself would ever complain — clamp what actually gets submitted so the demo
// always stays smooth, regardless of what a user types into the fields.
const UI_LIMITS = {
  size: { min: 2, max: 64 },
  parallelism: { min: 1, max: 16 },
  sequentialThreshold: { min: 1, max: 64 },
};

function clamp(value, field) {
  const { min, max } = UI_LIMITS[field];
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULTS[field];
  return Math.min(max, Math.max(min, Math.round(n)));
}

/**
 * Pure structural recreation of the recursion shape merge sort always produces for
 * a given array length — every range from root [0, size-1] down to single-element
 * leaves, split exactly the way ParallelMergeSorter.SortTask.compute() splits
 * (mid = lo + (hi-lo)/2). This does NOT duplicate a business rule from the
 * backend — it is fixed, well-known arithmetic — but it lets the frontend draw the
 * whole tree up front and simply color in nodes as the real recorded trace confirms
 * each one actually happened, rather than guessing tree shape from event order
 * (which real ForkJoin parallelism can interleave across threads).
 */
function buildTreeLevels(size) {
  const levels = [];
  function helper(lo, hi, depth) {
    if (!levels[depth]) levels[depth] = [];
    const leaf = lo >= hi;
    const node = { lo, hi, key: `${lo}:${hi}`, leaf };
    levels[depth].push(node);
    if (!leaf) {
      const mid = lo + Math.floor((hi - lo) / 2);
      node.mid = mid;
      helper(lo, mid, depth + 1);
      helper(mid + 1, hi, depth + 1);
    }
  }
  if (size > 0) helper(0, size - 1, 0);
  return levels;
}

function describeEvent(e) {
  const ms = (e.elapsedNanos / 1_000_000).toFixed(1);
  switch (e.type) {
    case 'PARTITION':
      return `[+${ms}ms] ${e.threadName} partitions [${e.lo},${e.hi}] around mid=${e.mid} -> left [${e.lo},${e.mid}], right [${e.mid + 1},${e.hi}]`;
    case 'BASE_CASE':
      return `[+${ms}ms] ${e.threadName} hits base case [${e.lo},${e.hi}] (nothing to sort)`;
    case 'FORK_RIGHT':
      return `[+${ms}ms] ${e.threadName} forks right half [${e.mid + 1},${e.hi}] to the pool; continues left [${e.lo},${e.mid}] on this thread`;
    case 'MERGE_START':
      return `[+${ms}ms] ${e.threadName} starts merging [${e.lo},${e.hi}] (left [${e.lo},${e.mid}] + right [${e.mid + 1},${e.hi}])`;
    case 'MERGE_WRITE':
      return `[+${ms}ms] ${e.threadName} merging [${e.lo},${e.hi}] <- writing ${e.value} at position ${e.position} (from ${e.sourceSide})`;
    case 'MERGE_COMPLETE':
      return `[+${ms}ms] ${e.threadName} completes merge of [${e.lo},${e.hi}]`;
    default:
      return `[+${ms}ms] ${e.threadName}: ${e.type}`;
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
    const effectiveParams = {
      size: clamp(params.size, 'size'),
      parallelism: clamp(params.parallelism, 'parallelism'),
      sequentialThreshold: clamp(params.sequentialThreshold, 'sequentialThreshold'),
    };
    try {
      const result = await runMergeSort(effectiveParams);
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
      setError(e instanceof ApiError ? e.message : 'Failed to reach the merge-sort backend');
    }
  };

  const handleField = (field) => (ev) => {
    const v = ev.target.value === '' ? '' : Number(ev.target.value);
    setParams((p) => ({ ...p, [field]: v }));
  };

  const trace = runResult?.trace ?? [];
  const appliedEvents = trace.slice(0, playIndex);
  const originalArray = runResult?.originalArray ?? [];
  // Clamped even before a run exists, so free-typing a huge value into the size
  // field can never make the (recursively built) tree preview below unusable.
  const size = runResult?.size ?? clamp(params.size, 'size');

  const treeLevels = useMemo(() => buildTreeLevels(size), [size]);

  // Fold every event up to playIndex into current visual state: live array
  // contents, per-node recursion status, and the ordered set of real worker
  // threads that have actually appeared so far.
  const currentArray = [...originalArray];
  const nodeStatus = {};
  const seenThreadsOrdered = [];
  const seenThreadsSet = new Set();

  for (const e of appliedEvents) {
    if (!seenThreadsSet.has(e.threadName)) {
      seenThreadsSet.add(e.threadName);
      seenThreadsOrdered.push(e.threadName);
    }
    const key = `${e.lo}:${e.hi}`;
    switch (e.type) {
      case 'PARTITION':
        nodeStatus[key] = 'partitioned';
        break;
      case 'BASE_CASE':
        nodeStatus[key] = 'base';
        break;
      case 'FORK_RIGHT':
        nodeStatus[key] = 'forked';
        break;
      case 'MERGE_START':
        nodeStatus[key] = 'merging';
        break;
      case 'MERGE_WRITE':
        currentArray[e.position] = e.value;
        break;
      case 'MERGE_COMPLETE':
        nodeStatus[key] = 'merged';
        break;
      default:
        break;
    }
  }

  const lastEvent = appliedEvents[appliedEvents.length - 1];
  const isDone = runResult && playIndex >= trace.length && trace.length > 0;

  // All distinct real threads that will appear across the whole run (already
  // known since the backend already executed it) — used to render the full
  // badge roster and light chips up as replay reveals each one.
  const allThreadNames = useMemo(
    () => Array.from(new Set(trace.map((e) => e.threadName))),
    [trace]
  );

  const maxValue = Math.max(1, ...originalArray, ...currentArray);
  const activeLo = lastEvent?.lo;
  const activeHi = lastEvent?.hi;
  const writePosition = lastEvent?.type === 'MERGE_WRITE' ? lastEvent.position : null;
  const writeSide = lastEvent?.type === 'MERGE_WRITE' ? lastEvent.sourceSide : null;

  const logs = appliedEvents.slice(-8).reverse().map(describeEvent);

  return (
    <div className="ms-container">
      <style>{CSS}</style>

      <div className="ms-controls">
        <label className="ms-field">Array Size
          <input type="number" min="2" max="64" value={params.size} onChange={handleField('size')} />
        </label>
        <label className="ms-field">Parallelism
          <input type="number" min="1" max="16" value={params.parallelism} onChange={handleField('parallelism')} />
        </label>
        <label className="ms-field">Sequential Threshold
          <input type="number" min="1" max="64" value={params.sequentialThreshold} onChange={handleField('sequentialThreshold')} />
        </label>
        <button className="ms-btn primary" onClick={handleRun} disabled={fetching || replaying}>
          {fetching ? '⏳ Running real ForkJoinPool on backend...' : replaying ? '▶ Replaying trace...' : '⚡ Run Real Simulation'}
        </button>
      </div>

      <div className={`ms-status ${error ? 'error' : ''}`}>
        {error && `⚠️ ${error}`}
        {!error && fetching && 'Submitting a genuine SortTask to a ForkJoinPool on the backend (real RecursiveAction.fork()/join())...'}
        {!error && !fetching && runResult && replaying && `Replaying real execution trace: event ${playIndex}/${trace.length}`}
        {!error && !fetching && runResult && isDone &&
          `Done — ${runResult.size} elements sorted in ${runResult.durationMillis}ms real wall-clock time using ${runResult.distinctThreadsUsed} distinct real worker thread${runResult.distinctThreadsUsed === 1 ? '' : 's'}.`}
        {!error && !fetching && !runResult && 'Configure parameters and run — this executes a real ForkJoinPool/RecursiveAction sort on the backend, not an animation.'}
      </div>

      {trace.length > 0 && (
        <div className="ms-progress">
          <div className="ms-progress-bar" style={{ width: `${(playIndex / trace.length) * 100}%` }} />
        </div>
      )}

      <div className="ms-stage">
        <div className="ms-range-label">
          {lastEvent
            ? `Active task: [${activeLo}, ${activeHi}]${lastEvent.mid != null ? ` (mid=${lastEvent.mid})` : ''} — ${lastEvent.type} on ${lastEvent.threadName}`
            : 'Run to watch the real recursive partition/merge tree execute across real threads'}
        </div>

        <div className="array-scroll">
          <div className="array-row">
            {(currentArray.length > 0 ? currentArray : Array.from({ length: size })).map((val, idx) => {
              const inRange = lastEvent != null && idx >= activeLo && idx <= activeHi;
              const isWrite = writePosition === idx;
              const heightPx = 24 + (Number(val || 0) / maxValue) * 110;
              return (
                <div className="array-cell-wrap" key={idx}>
                  <div
                    className={`array-cell ${inRange ? 'in-range' : ''} ${isWrite && writeSide === 'LEFT' ? 'write-left' : ''} ${isWrite && writeSide === 'RIGHT' ? 'write-right' : ''} ${isDone ? 'sorted' : ''}`}
                    style={{ height: `${heightPx}px` }}
                  >
                    {val ?? ''}
                  </div>
                  <div className={`range-underline ${inRange ? 'on' : ''}`} />
                  <div className="array-index">{idx}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="ms-threads">
          <div className="ms-threads-title">
            REAL WORKER THREADS — {seenThreadsOrdered.length}/{allThreadNames.length || '?'} distinct threads used so far
          </div>
          <div className="thread-badges">
            {(allThreadNames.length > 0 ? allThreadNames : ['submitting thread']).map((name) => (
              <span key={name} className={`thread-badge ${seenThreadsSet.has(name) ? 'lit' : ''}`}>{name}</span>
            ))}
          </div>
        </div>

        <div className="ms-tree">
          <div className="ms-tree-title">RECURSIVE PARTITION / MERGE TREE</div>
          {treeLevels.map((level, depth) => (
            <div className="tree-level" key={depth}>
              {level.map((node) => {
                const status = nodeStatus[node.key] || 'pending';
                return (
                  <span key={node.key} className={`tree-node ${status}`}>
                    [{node.lo}{node.lo !== node.hi ? `,${node.hi}` : ''}]
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="ms-log">
        <div className="ms-log-title">Real Execution Trace (backend-recorded, thread-attributed, timestamped):</div>
        {logs.length === 0
          ? <div style={{ color: 'var(--text-muted)' }}>Click "Run Real Simulation" to submit a genuine SortTask to a backend ForkJoinPool and replay the actual recorded trace.</div>
          : logs.map((l, idx) => (
            <div key={idx} style={{ color: idx === 0 ? 'var(--info)' : 'var(--text-muted)' }}>{l}</div>
          ))}
      </div>
    </div>
  );
}

export default function MergeSortPage() {
  return (
    <LldPage module="merge-sort" title="Multi-threaded Merge Sort" icon="🔀" tabs={['app', 'simulation', 'diagram', 'sequence', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'simulation' && <RealTraceReplay />}
          {activeTab === 'app' && <RealTraceReplay />}
        </>
      )}
    </LldPage>
  );
}
