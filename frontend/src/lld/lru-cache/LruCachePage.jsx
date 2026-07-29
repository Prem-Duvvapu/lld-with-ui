import { useState, useEffect } from 'react';
import LldPage from '../../components/LldPage';

const CSS = `
.lru-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.lru-controls { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; justify-content: center; }
.lru-input { padding: 8px 12px; border: 1px solid var(--border-primary); border-radius: 6px; background: var(--bg-input); color: var(--text-primary); font-size: 13px; width: 120px; }
.lru-btn { padding: 8px 16px; border: none; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s; background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-primary); }
.lru-btn.primary { background: var(--accent-gradient); color: #fff; border: none; }
.lru-btn:hover { opacity: 0.9; transform: translateY(-1px); }

.lru-stage { position: relative; min-height: 220px; background: var(--bg-primary); border-radius: 10px; border: 1px solid var(--border-primary); padding: 20px; margin-bottom: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; }

.dll-chain { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; justify-content: center; margin-top: 16px; }
.head-tail-badge { padding: 6px 12px; background: var(--bg-tertiary); border: 1px solid var(--border-primary); border-radius: 6px; font-size: 11px; font-weight: 700; color: var(--info); }

.node-box { min-width: 100px; padding: 12px; background: var(--bg-card); border: 2px solid var(--accent); border-radius: 10px; text-align: center; position: relative; transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.node-box.mru { border-color: var(--success); box-shadow: 0 0 12px rgba(63,185,80,0.4); }
.node-box.lru { border-color: var(--danger); box-shadow: 0 0 12px rgba(248,81,73,0.4); }
.node-box.evicting { transform: translateY(40px) scale(0.5); opacity: 0; }

.pointer-arrow { font-size: 16px; color: var(--text-muted); }
.hashmap-view { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-top: 10px; }
.hash-entry { padding: 6px 12px; background: var(--bg-tertiary); border: 1px solid var(--border-secondary); border-radius: 6px; font-family: monospace; font-size: 12px; }

.metrics-bar { display: flex; gap: 16px; justify-content: center; font-size: 13px; color: var(--text-muted); margin-top: 12px; }
.metrics-item { background: var(--bg-secondary); padding: 8px 16px; border-radius: 6px; border: 1px solid var(--border-primary); }
.metrics-val { font-weight: 700; color: var(--text-primary); }
`;

function AnimatedFlow() {
  const [capacity, setCapacity] = useState(4);
  const [cache, setCache] = useState([]); // List ordered from MRU (index 0) to LRU (last)
  const [keyInput, setKeyInput] = useState('');
  const [valInput, setValInput] = useState('');
  const [mruKey, setMruKey] = useState(null);
  const [evictedKey, setEvictedKey] = useState(null);
  const [statusMessage, setStatusMessage] = useState('Initialized LRU Cache with Capacity = 4');
  const [stats, setStats] = useState({ hits: 0, misses: 0, evictions: 0 });

  const handlePut = (k, v) => {
    const key = k || keyInput || `K${Math.floor(Math.random() * 90 + 10)}`;
    const val = v || valInput || `V${Math.floor(Math.random() * 900 + 100)}`;

    setEvictedKey(null);
    setCache(prev => {
      const existsIdx = prev.findIndex(item => item.key === key);
      let updated = [...prev];

      if (existsIdx !== -1) {
        // Update existing & promote to MRU
        updated.splice(existsIdx, 1);
        updated.unshift({ key, val });
        setStatusMessage(`PUT(${key}, ${val}) -> Updated existing key & promoted to MRU (HEAD)`);
      } else {
        // New Insertion
        if (updated.length >= capacity) {
          const removed = updated.pop();
          setEvictedKey(removed.key);
          setStats(s => ({ ...s, evictions: s.evictions + 1 }));
          setStatusMessage(`PUT(${key}, ${val}) -> Capacity FULL (${capacity}). Evicted LRU key: "${removed.key}"`);
        } else {
          setStatusMessage(`PUT(${key}, ${val}) -> Inserted new node at MRU (HEAD)`);
        }
        updated.unshift({ key, val });
      }
      setMruKey(key);
      return updated;
    });

    setKeyInput('');
    setValInput('');
  };

  const handleGet = (k) => {
    const key = k || keyInput;
    if (!key) return;

    setEvictedKey(null);
    setCache(prev => {
      const idx = prev.findIndex(item => item.key === key);
      if (idx !== -1) {
        const item = prev[idx];
        const updated = [item, ...prev.filter((_, i) => i !== idx)];
        setMruKey(key);
        setStats(s => ({ ...s, hits: s.hits + 1 }));
        setStatusMessage(`GET("${key}") -> ✅ CACHE HIT! Value = "${item.val}". Promoted to MRU HEAD.`);
        return updated;
      } else {
        setStats(s => ({ ...s, misses: s.misses + 1 }));
        setStatusMessage(`GET("${key}") -> ❌ CACHE MISS! Key not found in cache.`);
        return prev;
      }
    });
  };

  const runAutoDemo = async () => {
    setCache([]);
    setStats({ hits: 0, misses: 0, evictions: 0 });
    const sequence = [
      { op: 'PUT', k: 'K1', v: 'User1' },
      { op: 'PUT', k: 'K2', v: 'User2' },
      { op: 'PUT', k: 'K3', v: 'User3' },
      { op: 'PUT', k: 'K4', v: 'User4' }, // Full
      { op: 'GET', k: 'K1' }, // K1 becomes MRU
      { op: 'PUT', k: 'K5', v: 'User5' }, // Evicts K2!
    ];

    for (let i = 0; i < sequence.length; i++) {
      const step = sequence[i];
      await new Promise(r => setTimeout(r, 1200));
      if (step.op === 'PUT') handlePut(step.k, step.v);
      else handleGet(step.k);
    }
  };

  return (
    <div className="lru-container">
      <style>{CSS}</style>

      <div className="lru-controls">
        <input className="lru-input" placeholder="Key (e.g. K1)" value={keyInput} onChange={e => setKeyInput(e.target.value)} />
        <input className="lru-input" placeholder="Value (e.g. V1)" value={valInput} onChange={e => setValInput(e.target.value)} />
        <button className="lru-btn primary" onClick={() => handlePut()}>PUT(key, val)</button>
        <button className="lru-btn" onClick={() => handleGet()}>GET(key)</button>
        <button className="lru-btn" onClick={runAutoDemo}>▶ Auto Simulation Demo</button>
      </div>

      <div className="lru-stage">
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginBottom: 8 }}>
          DOUBLY LINKED LIST & HASHMAP MEMORY LAYOUT (Capacity: {capacity})
        </div>

        <div className="dll-chain">
          <div className="head-tail-badge">HEAD (MRU)</div>

          {cache.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20 }}>Cache is Empty</div>
          ) : (
            cache.map((item, idx) => {
              const isMRU = idx === 0;
              const isLRU = idx === cache.length - 1;
              return (
                <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className={`node-box ${isMRU ? 'mru' : isLRU ? 'lru' : ''}`}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{item.key}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>val: {item.val}</div>
                  </div>
                  {idx < cache.length - 1 && <span className="pointer-arrow">⇄</span>}
                </div>
              );
            })
          )}

          <div className="head-tail-badge">TAIL (LRU)</div>
        </div>

        {/* HashMap Array View */}
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>O(1) HashMap Index:</div>
          <div className="hashmap-view">
            {cache.map(item => (
              <div key={item.key} className="hash-entry">
                "{item.key}" ➔ NodeRef({item.val})
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--bg-primary)', padding: 12, borderRadius: 8, border: '1px solid var(--border-primary)', fontSize: 13, textAlign: 'center', fontWeight: 600, color: 'var(--info)' }}>
        {statusMessage}
      </div>

      <div className="metrics-bar">
        <div className="metrics-item">Hits: <span className="metrics-val" style={{ color: 'var(--success)' }}>{stats.hits}</span></div>
        <div className="metrics-item">Misses: <span className="metrics-val" style={{ color: 'var(--danger)' }}>{stats.misses}</span></div>
        <div className="metrics-item">Evictions: <span className="metrics-val" style={{ color: 'var(--warning)' }}>{stats.evictions}</span></div>
        <div className="metrics-item">Hit Rate: <span className="metrics-val">{stats.hits + stats.misses > 0 ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(1) : 0}%</span></div>
      </div>
    </div>
  );
}

export default function LruCachePage() {
  return (
    <LldPage module="lru-cache" title="LRU Cache System" icon="⚡" tabs={['app', 'simulation', 'diagram', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'simulation' && <AnimatedFlow />}
          {activeTab === 'app' && <AnimatedFlow />}
        </>
      )}
    </LldPage>
  );
}
