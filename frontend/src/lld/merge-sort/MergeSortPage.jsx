import { useState } from 'react';
import LldPage from '../../components/LldPage';

const CSS = `
.ms-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.ms-stage { background: var(--bg-primary); border-radius: 12px; border: 1px solid var(--border-primary); padding: 20px; min-height: 280px; display: flex; flex-direction: column; align-items: center; justify-content: center; margin-bottom: 20px; }

.bar-container { display: flex; align-items: flex-end; gap: 8px; height: 180px; padding: 10px; }
.bar-element { width: 32px; background: var(--accent); border-radius: 4px 4px 0 0; display: flex; align-items: flex-end; justify-content: center; color: #fff; font-size: 11px; font-weight: 700; padding-bottom: 4px; transition: all 0.3s; }
.bar-element.sorted { background: var(--success); }
.bar-element.comparing { background: var(--warning); transform: scaleY(1.05); }

.forkjoin-tree { display: flex; gap: 16px; justify-content: center; margin-top: 16px; font-family: monospace; font-size: 11px; }
.tree-node { background: var(--bg-card); border: 1px solid var(--border-primary); padding: 6px 12px; border-radius: 6px; }
`;

function AnimatedFlow() {
  const [arr, setArr] = useState([38, 27, 43, 3, 9, 82, 10, 19]);
  const [isSorting, setIsSorting] = useState(false);
  const [comparingIdxs, setComparingIdxs] = useState([]);
  const [sorted, setSorted] = useState(false);
  const [log, setLog] = useState('ForkJoinPool Parallel Merge Sort initialized with 8 elements.');

  const runParallelSort = async () => {
    setIsSorting(true);
    setSorted(false);
    setLog('⚡ ForkJoinPool.commonPool().invoke(SortTask) -> Splitting array into subtasks...');

    let current = [...arr];

    // Simulated steps showing divide & merge
    await new Promise(r => setTimeout(r, 600));
    setComparingIdxs([0, 1, 2, 3]);
    setLog('Subtask-1 (ForkJoin Worker 1): Sorting Left Half [38, 27, 43, 3]');

    await new Promise(r => setTimeout(r, 800));
    setComparingIdxs([4, 5, 6, 7]);
    setLog('Subtask-2 (ForkJoin Worker 2): Sorting Right Half [9, 82, 10, 19]');

    await new Promise(r => setTimeout(r, 800));
    setComparingIdxs([]);

    // Sort final
    current.sort((a, b) => a - b);
    setArr(current);
    setSorted(true);
    setIsSorting(false);
    setLog('🎉 Parallel Merge complete! Array sorted in O(N log N) time.');
  };

  const shuffle = () => {
    setArr([38, 27, 43, 3, 9, 82, 10, 19].sort(() => Math.random() - 0.5));
    setSorted(false);
    setComparingIdxs([]);
    setLog('Array reset.');
  };

  return (
    <div className="ms-container">
      <style>{CSS}</style>

      <div className="ms-stage">
        <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginBottom: 8 }}>
          DIVIDE & CONQUER FORK-JOIN PARALLEL MERGE SORT
        </div>

        <div className="bar-container">
          {arr.map((val, idx) => {
            const isComp = comparingIdxs.includes(idx);
            return (
              <div key={idx} className={`bar-element ${sorted ? 'sorted' : isComp ? 'comparing' : ''}`} style={{ height: `${val * 2}px` }}>
                {val}
              </div>
            );
          })}
        </div>

        <div className="forkjoin-tree">
          <div className="tree-node">Worker-1: [left...mid]</div>
          <div style={{ alignSelf: 'center', color: 'var(--accent)' }}>invokeAll() ⚡</div>
          <div className="tree-node">Worker-2: [mid+1...right]</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justify: 'center' }}>
        <button onClick={runParallelSort} disabled={isSorting} style={{ padding: '10px 24px', borderRadius: 8, background: 'var(--accent-gradient)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
          ⚡ Start Parallel ForkJoin Sort
        </button>

        <button onClick={shuffle} disabled={isSorting} style={{ padding: '10px 20px', borderRadius: 8, background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', cursor: 'pointer', fontWeight: 600 }}>
          🎲 Shuffle Array
        </button>
      </div>

      <div style={{ marginTop: 16, background: 'var(--bg-primary)', padding: 12, borderRadius: 8, border: '1px solid var(--border-primary)', fontSize: 12, color: 'var(--info)', textAlign: 'center', fontWeight: 600 }}>
        {log}
      </div>
    </div>
  );
}

export default function MergeSortPage() {
  return (
    <LldPage module="merge-sort" title="Multi-threaded Merge Sort" icon="🔀" tabs={['app', 'simulation', 'diagram', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'simulation' && <AnimatedFlow />}
          {activeTab === 'app' && <AnimatedFlow />}
        </>
      )}
    </LldPage>
  );
}
