import { useState } from 'react';
import LldPage from '../../components/LldPage';

const CSS = `
.chm-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.chm-controls { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 20px; }
.chm-input { padding: 8px 12px; border: 1px solid var(--border-primary); border-radius: 6px; background: var(--bg-input); color: var(--text-primary); font-size: 13px; width: 140px; }
.chm-btn { padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; border: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-primary); transition: all 0.2s; }
.chm-btn.primary { background: var(--accent-gradient); color: #fff; border: none; }
.chm-btn:hover { opacity: 0.9; transform: translateY(-1px); }

.chm-stage { background: var(--bg-primary); border-radius: 12px; border: 1px solid var(--border-primary); padding: 20px; margin-bottom: 20px; }
.segment-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 16px; }
.segment-card { background: var(--bg-card); border: 2px solid var(--border-primary); border-radius: 10px; padding: 12px; transition: all 0.3s; position: relative; }
.segment-card.locked { border-color: var(--danger); box-shadow: 0 0 14px rgba(248,81,73,0.3); background: rgba(248,81,73,0.05); }

.seg-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-secondary); padding-bottom: 6px; margin-bottom: 8px; font-size: 12px; font-weight: 700; }
.bucket-list { display: flex; flex-direction: column; gap: 4px; min-height: 40px; }
.bucket-item { padding: 4px 8px; background: var(--bg-tertiary); border: 1px solid var(--border-secondary); border-radius: 4px; font-family: monospace; font-size: 11px; }
`;

function AnimatedFlow() {
  const NUM_SEGMENTS = 8;
  const [segments, setSegments] = useState(
    Array.from({ length: NUM_SEGMENTS }, (_, i) => ({ id: i, lockedBy: null, items: [] }))
  );
  const [keyInput, setKeyInput] = useState('');
  const [valInput, setValInput] = useState('');
  const [status, setStatus] = useState('Segment Striping (ConcurrentHashMap) initialized with 8 independent locks.');

  const getSegmentIndex = (key) => {
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) % NUM_SEGMENTS;
    return Math.abs(hash);
  };

  const handlePut = async (k, v, threadName = 'Main Thread') => {
    const key = k || keyInput || `user_${Math.floor(Math.random() * 90 + 10)}`;
    const val = v || valInput || `val_${Math.floor(Math.random() * 900 + 100)}`;
    const segIdx = getSegmentIndex(key);

    setStatus(`Thread [${threadName}] acquiring SegmentLock[${segIdx}] for Key: "${key}"...`);

    // Lock Segment
    setSegments(prev => prev.map(s => s.id === segIdx ? { ...s, lockedBy: threadName } : s));
    await new Promise(r => setTimeout(r, 600));

    // Update Map
    setSegments(prev => prev.map(s => {
      if (s.id === segIdx) {
        const filtered = s.items.filter(item => item.key !== key);
        return { ...s, items: [...filtered, { key, val }] };
      }
      return s;
    }));

    await new Promise(r => setTimeout(r, 400));

    // Unlock Segment
    setSegments(prev => prev.map(s => s.id === segIdx ? { ...s, lockedBy: null } : s));
    setStatus(`✅ PUT("${key}", "${val}") completed in Segment[${segIdx}]. Segment lock released.`);

    setKeyInput('');
    setValInput('');
  };

  const runConcurrentWritesDemo = async () => {
    setStatus('⚡ Triggering 2 Concurrent Threads writing to DIFFERENT Segments simultaneously!');
    handlePut('alpha', 'data1', 'Thread-1');
    setTimeout(() => {
      handlePut('gamma', 'data2', 'Thread-2');
    }, 100);
  };

  return (
    <div className="chm-container">
      <style>{CSS}</style>

      <div className="chm-controls">
        <input className="chm-input" placeholder="Key (e.g. 'alpha')" value={keyInput} onChange={e => setKeyInput(e.target.value)} />
        <input className="chm-input" placeholder="Value (e.g. '100')" value={valInput} onChange={e => setValInput(e.target.value)} />
        <button className="chm-btn primary" onClick={() => handlePut()}>PUT(key, val)</button>
        <button className="chm-btn" onClick={runConcurrentWritesDemo}>⚡ Simulate Concurrent Writes</button>
      </div>

      <div className="chm-stage">
        <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>
          CONCURRENT HASHMAP — SEGMENT LOCK STRIPING ({NUM_SEGMENTS} Locks)
        </div>
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
          Each segment operates an independent ReentrantLock allowing parallel non-blocking writes!
        </div>

        <div className="segment-grid">
          {segments.map(seg => (
            <div key={seg.id} className={`segment-card ${seg.lockedBy ? 'locked' : ''}`}>
              <div className="seg-header">
                <span>Seg #{seg.id}</span>
                <span style={{ fontSize: 10, color: seg.lockedBy ? 'var(--danger)' : 'var(--success)' }}>
                  {seg.lockedBy ? `🔒 ${seg.lockedBy}` : '🔓 Open'}
                </span>
              </div>
              <div className="bucket-list">
                {seg.items.length === 0 ? (
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', padding: 8 }}>Empty</div>
                ) : (
                  seg.items.map(item => (
                    <div key={item.key} className="bucket-item">
                      "{item.key}": {item.val}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--bg-primary)', padding: 12, borderRadius: 8, border: '1px solid var(--border-primary)', fontSize: 13, textAlign: 'center', fontWeight: 600, color: 'var(--info)' }}>
        {status}
      </div>
    </div>
  );
}

export default function ConcurrentHashMapPage() {
  return (
    <LldPage module="concurrent-hashmap" title="Concurrent HashMap System" icon="🗺️" tabs={['app', 'simulation', 'diagram', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'simulation' && <AnimatedFlow />}
          {activeTab === 'app' && <AnimatedFlow />}
        </>
      )}
    </LldPage>
  );
}
