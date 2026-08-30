import { useState } from 'react';
import LldPage from '../../components/LldPage';
import ClassDiagram from '../../components/ClassDiagram';
import DesignDetails from '../../components/DesignDetails';
import {
  getSnapshot,
  cacheGet,
  cachePut,
  cacheRemove,
  cacheClear,
  setCapacity,
  setPolicy,
  batchSimulate,
  simGetSnapshot,
  simCacheGet,
  simCachePut,
  simCacheRemove,
  simCacheClear,
  simSetCapacity,
  simSetPolicy,
  simBatchSimulate
} from './api';
import { usePolling } from '../../hooks/usePolling';

const CSS = `
.lru-card { background: var(--bg-card); border: 1px solid var(--border-primary); border-radius: var(--radius-lg); padding: 22px; margin-bottom: 20px; transition: box-shadow 0.3s ease; }
.lru-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.04); }

.lru-grid-2 { display: grid; grid-template-columns: 360px 1fr; gap: 24px; }
@media (max-width: 1024px) { .lru-grid-2 { grid-template-columns: 1fr; } }

.lru-input { padding: 10px 14px; border: 1px solid var(--border-primary); border-radius: var(--radius-md); background: var(--bg-primary); color: var(--text-primary); font-size: var(--font-xs); font-weight: 600; width: 100%; box-sizing: border-box; transition: border-color 0.2s, box-shadow 0.2s; }
.lru-input:focus { border-color: #3b82f6; outline: none; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); }

.lru-btn { padding: 10px 18px; border: none; border-radius: var(--radius-md); font-weight: 700; font-size: var(--font-xs); cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-primary); display: inline-flex; align-items: center; justify-content: center; gap: 8px; user-select: none; }
.lru-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.lru-btn.primary { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #fff; border: none; }
.lru-btn.success { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff; border: none; }
.lru-btn.danger { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #fff; border: none; }
.lru-btn.warning { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #fff; border: none; }

.chip-group { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
.chip-btn { padding: 6px 12px; border-radius: 20px; border: 1px solid var(--border-primary); background: var(--bg-primary); font-size: 11px; font-weight: 700; color: var(--text-muted); cursor: pointer; transition: all 0.2s ease; }
.chip-btn:hover { background: rgba(59, 130, 246, 0.1); color: #3b82f6; border-color: #3b82f6; transform: scale(1.03); }

/* Progress Bar */
.capacity-progress-bg { width: 100%; height: 10px; background: var(--bg-secondary); border-radius: 5px; overflow: hidden; margin-top: 8px; border: 1px solid var(--border-primary); }
.capacity-progress-fill { height: 100%; transition: width 0.4s ease, background-color 0.4s ease; }

/* Doubly Linked List Stage */
.lru-stage { position: relative; min-height: 280px; background: var(--bg-primary); border-radius: var(--radius-lg); border: 1px solid var(--border-primary); padding: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow-x: auto; box-shadow: inset 0 2px 6px rgba(0,0,0,0.03); }
.dll-chain { display: flex; align-items: center; gap: 14px; flex-wrap: nowrap; padding: 12px 6px; overflow-x: auto; max-width: 100%; width: 100%; justify-content: flex-start; scrollbar-width: thin; }

.badge-tag { padding: 8px 14px; border-radius: var(--radius-md); font-size: 11px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; white-space: nowrap; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.badge-tag.head { background: rgba(16, 185, 129, 0.12); border: 2px solid #10b981; color: #10b981; }
.badge-tag.tail { background: rgba(239, 68, 68, 0.12); border: 2px solid #ef4444; color: #ef4444; }

.node-box { min-width: 140px; padding: 16px; background: var(--bg-card); border: 2px solid var(--border-primary); border-radius: var(--radius-lg); text-align: left; position: relative; transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; user-select: none; box-shadow: 0 4px 14px rgba(0,0,0,0.05); }
.node-box:hover { transform: translateY(-4px) scale(1.02); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
.node-box.mru { border-color: #10b981; background: rgba(16, 185, 129, 0.04); box-shadow: 0 0 20px rgba(16, 185, 129, 0.25); }
.node-box.lru { border-color: #ef4444; background: rgba(239, 68, 68, 0.04); box-shadow: 0 0 20px rgba(239, 68, 68, 0.25); }

.pointer-badge { display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; font-weight: 900; color: var(--text-muted); padding: 4px 6px; background: var(--bg-secondary); border-radius: 6px; border: 1px solid var(--border-primary); white-space: nowrap; }

/* HashMap Index Cards */
.hashmap-grid { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-top: 18px; width: 100%; }
.hash-pill { padding: 10px 16px; background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: var(--radius-md); font-family: monospace; font-size: 12px; font-weight: 700; color: var(--text-primary); transition: all 0.2s ease; display: flex; align-items: center; gap: 8px; cursor: pointer; }
.hash-pill:hover { border-color: #3b82f6; background: rgba(59, 130, 246, 0.08); transform: translateY(-2px); }

/* 2D Interactive Memory Rack Scene */
.sim-container { position: relative; width: 100%; min-height: 480px; background: #0b1329; border-radius: var(--radius-lg); overflow: hidden; border: 1px solid #1e293b; display: flex; flex-direction: column; justify-content: space-between; padding: 24px; box-sizing: border-box; }
.sim-hud { display: flex; justify-content: space-between; align-items: center; background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(10px); padding: 14px 20px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); color: #fff; z-index: 10; flex-wrap: wrap; gap: 12px; }

.sim-client-node { width: 220px; margin: 0 auto; background: rgba(59, 130, 246, 0.15); border: 2px solid #3b82f6; border-radius: 10px; padding: 10px 16px; text-align: center; color: #93c5fd; font-size: 12px; font-weight: 900; box-shadow: 0 0 16px rgba(59, 130, 246, 0.3); z-index: 5; }

.sim-rack { display: flex; justify-content: center; align-items: center; gap: 16px; margin: 24px 0; position: relative; z-index: 5; flex-wrap: wrap; }
.sim-slot { width: 120px; height: 130px; border: 2px dashed #334155; border-radius: 14px; background: rgba(30, 41, 59, 0.7); display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; transition: all 0.4s ease; cursor: pointer; }
.sim-slot:hover { transform: translateY(-4px); border-color: #38bdf8; }
.sim-slot.active { border-style: solid; border-color: #38bdf8; box-shadow: 0 0 20px rgba(56, 189, 248, 0.3); }
.sim-slot.mru-slot { border-style: solid; border-color: #4ade80; box-shadow: 0 0 24px rgba(74, 222, 128, 0.45); background: rgba(74, 222, 128, 0.08); }
.sim-slot.lru-slot { border-style: solid; border-color: #f87171; box-shadow: 0 0 24px rgba(248, 113, 113, 0.45); background: rgba(248, 113, 113, 0.08); }

.sim-packet { padding: 10px; border-radius: 10px; background: #1e293b; border: 1px solid #475569; width: 88%; text-align: center; color: #f8fafc; font-size: 11px; font-weight: 700; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
.sim-packet-key { color: #38bdf8; font-size: 13px; font-weight: 900; font-family: monospace; }
.sim-packet-val { color: #94a3b8; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; margin-top: 2px; }

.sim-db-node { width: 220px; margin: 0 auto; background: rgba(245, 158, 11, 0.15); border: 2px solid #f59e0b; border-radius: 10px; padding: 10px 16px; text-align: center; color: #fcd34d; font-size: 12px; font-weight: 900; box-shadow: 0 0 16px rgba(245, 158, 11, 0.3); z-index: 5; }

.sim-chute { position: absolute; bottom: 20px; right: 24px; background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; border-radius: 10px; padding: 10px 18px; color: #fca5a5; font-size: 11px; font-weight: 800; display: flex; align-items: center; gap: 10px; z-index: 10; }
`;

// Node ordering always runs from "keep longest" to "evict next" (LruCache#getSnapshot delegates
// to the active EvictionPolicy#getOrderedNodes), but what that means in plain English depends on
// which of the three strategies is active — labeling every policy's head/tail "MRU"/"LRU" was
// misleading once the policy switched to LFU or FIFO.
function policyLabels(policy) {
  switch (policy) {
    case 'LFU':
      return { head: 'MFU', headSub: '(Most Frequently Used)', tail: 'LFU', tailSub: '(Least Frequently Used)' };
    case 'FIFO':
      return { head: 'NEWEST', headSub: '(Most Recently Inserted)', tail: 'OLDEST', tailSub: '(Next to Evict)' };
    default:
      return { head: 'MRU', headSub: '(Most Recently Used)', tail: 'LRU', tailSub: '(Least Recently Used)' };
  }
}

const OP_META = {
  PUT: { icon: '📥', color: '#3b82f6' },
  GET: { icon: '🔍', color: '#8b5cf6' },
  REMOVE: { icon: '🗑️', color: '#ef4444' },
  EVICT: { icon: '⚠️', color: '#f59e0b' },
  CLEAR: { icon: '🧹', color: '#ef4444' },
  CAPACITY: { icon: '📏', color: '#0284c7' },
  POLICY: { icon: '🔀', color: '#0284c7' },
};

function CacheOperationsTab({ snapshot, onUpdate, toast }) {
  const [key, setKey] = useState('');
  const [val, setVal] = useState('');
  const [getKey, setGetKey] = useState('');
  const [lastResult, setLastResult] = useState(null);

  const nodes = snapshot?.nodes || [];
  const capacity = snapshot?.capacity || 5;
  const policy = snapshot?.policy || 'LRU';
  const stats = snapshot?.stats || {};

  const fillPreset = (k, v) => {
    setKey(k);
    setVal(v);
  };

  const handlePut = async () => {
    if (!key.trim()) return;
    const finalVal = val.trim() || `Val_${Math.floor(Math.random() * 900 + 100)}`;
    const res = await cachePut(key.trim(), finalVal);
    if (res) {
      onUpdate(res);
      setLastResult({ type: 'PUT', key: key.trim(), val: finalVal, status: 'SUCCESS' });
      toast(`PUT("${key.trim()}", "${finalVal}") completed!`);
      setKey('');
      setVal('');
    }
  };

  const handleGet = async (targetKey) => {
    const k = targetKey || getKey;
    if (!k.trim()) return;
    const res = await cacheGet(k.trim());
    if (res) {
      onUpdate(res.snapshot);
      if (res.found) {
        setLastResult({ type: 'GET', key: k.trim(), val: res.value, status: 'HIT' });
        toast(`✅ GET("${k}") ➔ HIT! Value = "${res.value}"`, 'success');
      } else {
        setLastResult({ type: 'GET', key: k.trim(), val: 'N/A', status: 'MISS' });
        toast(`❌ GET("${k}") ➔ MISS! Key not found in cache`, 'error');
      }
      setGetKey('');
    }
  };

  const handleRemove = async (k, e) => {
    e.stopPropagation();
    const res = await cacheRemove(k);
    if (res) {
      onUpdate(res.snapshot);
      setLastResult({ type: 'REMOVE', key: k, status: 'SUCCESS' });
      toast(`Removed key "${k}" from cache`);
    }
  };

  const handleBatch = async () => {
    const res = await batchSimulate();
    if (res) {
      onUpdate(res);
      toast(`Loaded sample dataset into cache!`);
    }
  };

  const handleClear = async () => {
    const res = await cacheClear();
    if (res) {
      onUpdate(res);
      toast(`Cleared all cache entries`);
    }
  };

  const usagePercent = Math.min(100, Math.round((nodes.length / capacity) * 100));
  const isFull = nodes.length >= capacity;
  const lruNode = nodes.length > 0 ? nodes[nodes.length - 1] : null;
  const labels = policyLabels(policy);

  return (
    <div>
      {/* Top HUD Banner */}
      <div className="lru-card" style={{ padding: '16px 22px', borderLeft: '5px solid #3b82f6' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              CACHE CAPACITY STATUS ({nodes.length} / {capacity} Nodes Occupied)
            </div>
            <div className="capacity-progress-bg" style={{ width: 260 }}>
              <div
                className="capacity-progress-fill"
                style={{
                  width: `${usagePercent}%`,
                  backgroundColor: usagePercent >= 100 ? '#ef4444' : usagePercent >= 70 ? '#f59e0b' : '#10b981'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>EVICTION STRATEGY: </span>
              <span style={{ fontSize: 13, fontWeight: 900, color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)', padding: '4px 10px', borderRadius: 6 }}>
                {policy}
              </span>
            </div>
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>HIT RATE: </span>
              <span style={{ fontSize: 13, fontWeight: 900, color: '#10b981' }}>
                {stats.hitRate || 0}%
              </span>
            </div>
          </div>
        </div>

        {isFull && lruNode && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: 6, fontSize: 12, fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>⚠️ CACHE AT CAPACITY ({capacity}/{capacity}).</span>
            <span>Next PUT will evict the {labels.tail} node: <strong>"{lruNode.key}"</strong></span>
          </div>
        )}
      </div>

      <div className="lru-grid-2">
        {/* Left Column: Interactive Control Deck */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* PUT Card */}
          <div className="lru-card">
            <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 900, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📥 Insert / Update (PUT)</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)' }}>Key Name</label>
                <input className="lru-input" placeholder="e.g. user_101" value={key} onChange={e => setKey(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)' }}>Value Data</label>
                <input className="lru-input" placeholder="e.g. { name: 'Alice' }" value={val} onChange={e => setVal(e.target.value)} />
              </div>

              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 4 }}>⚡ Quick Presets:</div>
                <div className="chip-group">
                  <button className="chip-btn" onClick={() => fillPreset('user_101', 'Alice (Admin)')}>👤 User 101</button>
                  <button className="chip-btn" onClick={() => fillPreset('session_jwt', 'Token_XYZ_99')}>🔑 JWT Token</button>
                  <button className="chip-btn" onClick={() => fillPreset('db_product_5', 'Laptop Core i9')}>🛒 Product 5</button>
                  <button className="chip-btn" onClick={() => fillPreset('api_cache_3', 'JSON_Response')}>🌐 API Edge</button>
                </div>
              </div>

              <button className="lru-btn primary" onClick={handlePut} style={{ marginTop: 4 }}>
                ➕ PUT(key, value)
              </button>
            </div>
          </div>

          {/* GET Card */}
          <div className="lru-card">
            <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 900, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🔍 Search / Lookup (GET)</span>
            </h3>
            <div style={{ display: 'flex', gap: 10 }}>
              <input className="lru-input" placeholder="Enter key (e.g. user_101)" value={getKey} onChange={e => setGetKey(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleGet()} />
              <button className="lru-btn success" onClick={() => handleGet()}>
                🔍 GET
              </button>
            </div>

            {lastResult && (
              <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', fontSize: 12 }}>
                <div style={{ fontWeight: 800, color: lastResult.status === 'HIT' ? '#10b981' : lastResult.status === 'MISS' ? '#ef4444' : '#3b82f6' }}>
                  {lastResult.type}({lastResult.key}) ➔ {lastResult.status}
                </div>
                {lastResult.val && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Value: "{lastResult.val}"</div>}
              </div>
            )}
          </div>

          <div className="lru-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="lru-btn" onClick={handleBatch} style={{ flex: 1 }}>
                ⚡ Load Sample Set
              </button>
              <button className="lru-btn danger" onClick={handleClear} style={{ flex: 1 }}>
                🗑️ Clear All
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Doubly-Linked List Memory Stage & O(1) HashMap Index */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="lru-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🧠 Doubly-Linked List Memory Chain</span>
              </h3>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)' }}>
                Click any node to GET(key){policy === 'LRU' ? ' — promotes it to HEAD' : ''}
              </span>
            </div>

            <div className="lru-stage">
              <div className="dll-chain">
                <div className="badge-tag head">
                  <span>✨ HEAD</span>
                  <span style={{ fontSize: 9 }}>({labels.head})</span>
                </div>

                {nodes.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '40px 20px', textAlign: 'center' }}>
                    {snapshot === null ? '⏳ Loading cache state…' : 'Cache is empty. Use controls on the left to add entries!'}
                  </div>
                ) : (
                  nodes.map((item, idx) => {
                    const isMRU = idx === 0;
                    const isLRU = idx === nodes.length - 1;
                    return (
                      <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          className={`node-box ${isMRU ? 'mru' : isLRU ? 'lru' : ''}`}
                          onClick={() => handleGet(item.key)}
                          title={`Click to perform GET("${item.key}")${policy === 'LRU' ? ' and promote it to the MRU HEAD' : ''}`}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                              {item.key}
                            </span>
                            <button
                              onClick={(e) => handleRemove(item.key, e)}
                              style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontWeight: 900, fontSize: 13, padding: '0 2px' }}
                              title="Delete key"
                            >
                              ✖
                            </button>
                          </div>

                          <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 120, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {item.value}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 10, color: 'var(--text-muted)', borderTop: '1px solid var(--border-primary)', paddingTop: 6 }}>
                            <span>👁️ Access: <strong>{item.accessCount}</strong></span>
                            <span style={{ color: isMRU ? '#10b981' : isLRU ? '#ef4444' : 'inherit', fontWeight: 800 }}>
                              {isMRU ? `HEAD (${labels.head})` : isLRU ? `TAIL (${labels.tail})` : `#${idx + 1}`}
                            </span>
                          </div>
                        </div>

                        {idx < nodes.length - 1 && (
                          <div className="pointer-badge">
                            <span>prev ◄</span>
                            <span>► next</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                <div className="badge-tag tail">
                  <span>⚠️ TAIL</span>
                  <span style={{ fontSize: 9 }}>({labels.tail})</span>
                </div>
              </div>

              <div style={{ marginTop: 22, textAlign: 'center', width: '100%', borderTop: '1px dashed var(--border-primary)', paddingTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 10 }}>
                  ⚡ O(1) ConcurrentHashMap Direct Memory Key Index (Click key to trigger instant GET):
                </div>
                <div className="hashmap-grid">
                  {nodes.map(item => (
                    <div key={item.key} className="hash-pill" onClick={() => handleGet(item.key)}>
                      <span style={{ color: '#3b82f6' }}>"{item.key}"</span>
                      <span>➔</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>NodePtr({item.key})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TelemetryTab({ snapshot, onUpdate, toast }) {
  const stats = snapshot?.stats || { hits: 0, misses: 0, evictions: 0, hitRate: 0 };
  const capacity = snapshot?.capacity || 5;
  const policy = snapshot?.policy || 'LRU';

  const handleCapacityChange = async (newCap) => {
    const res = await setCapacity(newCap);
    if (res) {
      onUpdate(res);
      toast(`Capacity updated to ${newCap}`);
    }
  };

  const handlePolicyChange = async (newPol) => {
    const res = await setPolicy(newPol);
    if (res) {
      onUpdate(res);
      toast(`Eviction policy changed to ${newPol}`);
    }
  };

  const handleBatch = async () => {
    const res = await batchSimulate();
    if (res) {
      onUpdate(res);
      toast(`Pre-populated sample cache workload!`);
    }
  };

  const handleClear = async () => {
    const res = await cacheClear();
    if (res) {
      onUpdate(res);
      toast(`Cache cleared!`);
    }
  };

  return (
    <div>
      <div className="lru-card">
        <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 800, marginBottom: 16 }}>
          📊 Real-Time Cache Telemetry & Metrics
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginTop: 16 }}>
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)' }}>CACHE HITS</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#10b981', marginTop: 4 }}>{stats.hits}</div>
          </div>
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)' }}>CACHE MISSES</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#ef4444', marginTop: 4 }}>{stats.misses}</div>
          </div>
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)' }}>EVICTIONS</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#f59e0b', marginTop: 4 }}>{stats.evictions}</div>
          </div>
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)' }}>HIT RATE</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#3b82f6', marginTop: 4 }}>{stats.hitRate}%</div>
          </div>
        </div>

        {(stats.hits > 0 || stats.misses > 0) && (
          <div style={{ marginTop: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
              <span>HIT / MISS RATIO</span>
              <span>{stats.hits} hits · {stats.misses} misses</span>
            </div>
            <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', border: '1px solid var(--border-primary)' }}>
              <div
                title={`${stats.hits} hits`}
                style={{ width: `${(stats.hits / Math.max(1, stats.hits + stats.misses)) * 100}%`, background: '#10b981', transition: 'width 0.4s ease' }}
              />
              <div
                title={`${stats.misses} misses`}
                style={{ width: `${(stats.misses / Math.max(1, stats.hits + stats.misses)) * 100}%`, background: '#ef4444', transition: 'width 0.4s ease' }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="lru-grid-2">
        <div className="lru-card">
          <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 800, marginBottom: 16 }}>
            ⚙️ Capacity & Strategy Settings
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'var(--text-muted)' }}>
                Cache Capacity Limit: {capacity}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={capacity}
                onChange={e => handleCapacityChange(e.target.value)}
                style={{ width: '100%', marginTop: 8 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'var(--text-muted)' }}>
                Eviction Strategy Pattern
              </label>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                {['LRU', 'LFU', 'FIFO'].map(p => (
                  <button
                    key={p}
                    className={`lru-btn ${policy === p ? 'primary' : ''}`}
                    style={{ flex: 1 }}
                    onClick={() => handlePolicyChange(p)}
                  >
                    {p} Strategy
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lru-card">
          <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 800, marginBottom: 16 }}>
            🛠️ Workload Pre-set Actions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button className="lru-btn primary" onClick={handleBatch}>
              ⚡ Reset & Load Sample Workload
            </button>
            <button className="lru-btn danger" onClick={handleClear}>
              🗑️ Clear All Cache Entries
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LogsTab({ snapshot, logs }) {
  return (
    <div className="lru-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 800, margin: 0 }}>
          📜 Cache Operation & Eviction Timeline Log
        </h3>
        {logs && logs.length > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
            {logs.length} entr{logs.length === 1 ? 'y' : 'ies'} · newest first
          </span>
        )}
      </div>
      {!logs || logs.length === 0 ? (
        <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
          {snapshot === null ? '⏳ Loading log stream…' : 'No logs recorded yet. Run a PUT/GET/REMOVE from the Operations tab.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 450, overflowY: 'auto' }}>
          {logs.map(log => {
            const isHit = log.status === 'HIT';
            const isMiss = log.status === 'MISS';
            const isEvict = log.status === 'EVICTION' || log.status === 'RESIZE_EVICT';
            const meta = OP_META[log.op] || { icon: '•', color: '#3b82f6' };
            const borderColor = isHit ? '#10b981' : isMiss ? '#ef4444' : isEvict ? '#f59e0b' : meta.color;
            return (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 8,
                  padding: '10px 14px',
                  border: '1px solid var(--border-primary)',
                  borderLeft: `4px solid ${borderColor}`,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-primary)',
                  fontSize: 'var(--font-xs)'
                }}
              >
                <div>
                  <span style={{ fontWeight: 800, color: borderColor, marginRight: 8 }}>{meta.icon} [{log.op}]</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{log.key}</strong>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>({log.val})</span>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.detail}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>{log.timestamp}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── ISOLATED INTERACTIVE 2D SIMULATION SCENE (INDEPENDENT INSTANCE) ── */
function Interactive2DSimulation({ toast }) {
  const [simSnapshot, setSimSnapshot] = useState(null);
  const [keyInput, setKeyInput] = useState('');
  const [valInput, setValInput] = useState('');
  const [getKeyInput, setGetKeyInput] = useState('');
  const [simStatus, setSimStatus] = useState('Simulation Engine Ready');
  const [isRunningAuto, setIsRunningAuto] = useState(false);

  const fetchSimState = async () => {
    const data = await simGetSnapshot();
    if (data) setSimSnapshot(data);
  };

  usePolling(fetchSimState, 3000, []);

  const nodes = simSnapshot?.nodes || [];
  const capacity = simSnapshot?.capacity || 5;
  const policy = simSnapshot?.policy || 'LRU';
  const stats = simSnapshot?.stats || { hits: 0, misses: 0, evictions: 0, hitRate: 0 };
  const simLabels = policyLabels(policy);

  const handleSimPut = async (k, v) => {
    const key = k || keyInput;
    if (!key.trim()) return;
    const val = v || valInput || `Data_${Math.floor(Math.random() * 900 + 100)}`;

    const res = await simCachePut(key.trim(), val.trim());
    if (res) {
      setSimSnapshot(res);
      setSimStatus(`PUT("${key.trim()}", "${val.trim()}") ➔ Executed on simulation cache!`);
      toast(`[Sim] PUT("${key.trim()}") executed!`);
      setKeyInput('');
      setValInput('');
    }
  };

  const handleSimGet = async (k) => {
    const key = k || getKeyInput;
    if (!key.trim()) return;

    const res = await simCacheGet(key.trim());
    if (res) {
      setSimSnapshot(res.snapshot);
      if (res.found) {
        setSimStatus(`✅ GET("${key.trim()}") ➔ CACHE HIT! Value = "${res.value}". Promoted to MRU HEAD.`);
        toast(`[Sim] ✅ HIT! Key: "${key.trim()}"`, 'success');
      } else {
        setSimStatus(`❌ GET("${key.trim()}") ➔ CACHE MISS! Key not found in simulation cache. Querying DB...`);
        toast(`[Sim] ❌ MISS! Key: "${key.trim()}"`, 'error');
      }
      setGetKeyInput('');
    }
  };

  const handleSimRemove = async (key) => {
    const res = await simCacheRemove(key);
    if (res) {
      setSimSnapshot(res.snapshot);
      setSimStatus(`REMOVED("${key}") from simulation cache.`);
      toast(`[Sim] Removed key "${key}"`);
    }
  };

  const handleSimCapacity = async (newCap) => {
    const res = await simSetCapacity(newCap);
    if (res) {
      setSimSnapshot(res);
      setSimStatus(`Simulation capacity updated to ${newCap}`);
    }
  };

  const handleSimPolicy = async (newPol) => {
    const res = await simSetPolicy(newPol);
    if (res) {
      setSimSnapshot(res);
      setSimStatus(`Simulation strategy changed to ${newPol}`);
    }
  };

  const handleSimReset = async () => {
    const res = await simBatchSimulate();
    if (res) {
      setSimSnapshot(res);
      setSimStatus('Reset simulation cache to default sample dataset.');
      toast('[Sim] Reset simulation dataset');
    }
  };

  const runAutoScenario = async () => {
    if (isRunningAuto) return;
    setIsRunningAuto(true);
    toast('🚀 Running Automated Web Application Workload Scenario...');
    await simCacheClear();

    const sequence = [
      { op: 'PUT', k: 'user_session_101', v: 'JWT_Token_Admin' },
      { op: 'PUT', k: 'db_product_99', v: 'Core_i9_Laptop' },
      { op: 'PUT', k: 'cdn_banner_jpg', v: 'Header_Hero_Img' },
      { op: 'PUT', k: 'api_rate_limit', v: 'ReqCount_42' },
      { op: 'PUT', k: 'shopping_cart_5', v: 'Items_3_Total_499' }, // Full
      { op: 'GET', k: 'user_session_101' }, // Promotes user_session_101 to MRU
      { op: 'PUT', k: 'new_order_808', v: 'Order_Status_Placed' }, // Evicts LRU
      { op: 'GET', k: 'db_product_99' },
    ];

    for (let i = 0; i < sequence.length; i++) {
      const step = sequence[i];
      await new Promise(r => setTimeout(r, 1200));
      if (step.op === 'PUT') {
        await handleSimPut(step.k, step.v);
      } else {
        await handleSimGet(step.k);
      }
    }

    setIsRunningAuto(false);
    toast('✅ Automated Workload Scenario Completed!');
  };

  return (
    <div>
      {/* Simulation HUD & Controls Deck */}
      <div className="lru-card" style={{ borderLeft: '5px solid #10b981' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🎮 Interactive 2D Memory Rack Simulation</span>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#10b981', color: '#fff', fontWeight: 800 }}>
                INDEPENDENT CACHE INSTANCE
              </span>
            </h3>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Execute live PUT/GET/REMOVE operations on the isolated simulation cache engine without affecting other tabs.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="lru-btn primary" onClick={runAutoScenario} disabled={isRunningAuto}>
              {isRunningAuto ? '⏳ Running Traffic...' : '▶ Run Auto Traffic Scenario'}
            </button>
            <button className="lru-btn warning" onClick={handleSimReset}>
              🔄 Reset Sim Dataset
            </button>
          </div>
        </div>

        {/* Interactive Controls Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, background: 'var(--bg-primary)', padding: 16, borderRadius: 10, border: '1px solid var(--border-primary)' }}>
          {/* Put Form */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="lru-input" placeholder="Put Key" value={keyInput} onChange={e => setKeyInput(e.target.value)} />
            <input className="lru-input" placeholder="Put Value" value={valInput} onChange={e => setValInput(e.target.value)} />
            <button className="lru-btn primary" onClick={() => handleSimPut()}>PUT</button>
          </div>

          {/* Get Form */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="lru-input" placeholder="Search Key" value={getKeyInput} onChange={e => setGetKeyInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSimGet()} />
            <button className="lru-btn success" onClick={() => handleSimGet()}>GET</button>
          </div>

          {/* Policy & Capacity Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              Cap: {capacity}
            </div>
            <input type="range" min="1" max="10" value={capacity} onChange={e => handleSimCapacity(e.target.value)} style={{ flex: 1 }} />
            <select
              value={policy}
              onChange={e => handleSimPolicy(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: 700, fontSize: 11 }}
            >
              <option value="LRU">LRU Policy</option>
              <option value="LFU">LFU Policy</option>
              <option value="FIFO">FIFO Policy</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2D Canvas / SVG Memory Scene */}
      <div className="sim-container">
        {/* HUD Meter */}
        <div className="sim-hud">
          <div>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>MEMORY RACK SLOTS: </span>
            <strong style={{ color: '#38bdf8' }}>{nodes.length} / {capacity} Occupied</strong>
          </div>
          <div>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>ACTIVE STRATEGY: </span>
            <strong style={{ color: '#f59e0b' }}>{policy}</strong>
          </div>
          <div>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>HIT RATE: </span>
            <strong style={{ color: '#4ade80' }}>{stats.hitRate || 0}% ({stats.hits || 0} Hits / {stats.misses || 0} Misses)</strong>
          </div>
        </div>

        {/* Client API Gateway Node */}
        <div className="sim-client-node">
          🌐 CLIENT API GATEWAY
          <div style={{ fontSize: 10, color: '#60a5fa', marginTop: 2 }}>{simStatus}</div>
        </div>

        {/* Server Memory Slots Grid */}
        <div className="sim-rack">
          {Array.from({ length: capacity }).map((_, idx) => {
            const item = nodes[idx];
            const isMRU = idx === 0 && item;
            const isLRU = idx === nodes.length - 1 && item;
            return (
              <div
                key={idx}
                className={`sim-slot ${item ? 'active' : ''} ${isMRU ? 'mru-slot' : ''} ${isLRU ? 'lru-slot' : ''}`}
                onClick={() => item && handleSimGet(item.key)}
                title={item ? `Click to trigger GET("${item.key}")` : 'Empty Memory Slot'}
              >
                <div style={{ position: 'absolute', top: 8, fontSize: 9, fontWeight: 900, color: isMRU ? '#4ade80' : isLRU ? '#f87171' : '#64748b' }}>
                  {isMRU ? `HEAD (${simLabels.head})` : isLRU ? `TAIL (${simLabels.tail})` : `SLOT #${idx + 1}`}
                </div>

                {item ? (
                  <div className="sim-packet">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="sim-packet-key">{item.key}</div>
                      <span
                        onClick={(e) => { e.stopPropagation(); handleSimRemove(item.key); }}
                        style={{ color: '#ef4444', cursor: 'pointer', fontWeight: 900, fontSize: 11 }}
                      >
                        ✖
                      </span>
                    </div>
                    <div className="sim-packet-val">{item.value}</div>
                    <div style={{ fontSize: 9, color: '#64748b', marginTop: 4 }}>👁️ Hits: {item.accessCount}</div>
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: '#475569', fontWeight: 700 }}>EMPTY SLOT</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Database Server Fallback Node */}
        <div className="sim-db-node">
          🗄️ PERSISTENT DATABASE ENGINE
          <div style={{ fontSize: 10, color: '#fbbf24', marginTop: 2 }}>O(N) Fallback Lookup on Cache Miss</div>
        </div>

        {/* Eviction Drop Chute */}
        <div className="sim-chute">
          <span>🗑️ EVICTION CHUTE</span>
          <span style={{ color: '#fff', background: 'rgba(239, 68, 68, 0.4)', padding: '2px 8px', borderRadius: 4 }}>
            {stats.evictions || 0} Evicted Items
          </span>
        </div>
      </div>
    </div>
  );
}

export default function LruCachePage() {
  const [snapshot, setSnapshot] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('info');

  const fetchState = async () => {
    const data = await getSnapshot();
    if (data) setSnapshot(data);
  };

  usePolling(fetchState, 5000, []);

  const toast = (msg, type = 'info') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(null), 3000);
  };

  return (
    <LldPage
      module="lru-cache"
      title="LRU Cache System"
      icon="⚡"
      tabs={['operations', 'telemetry', 'logs', 'simulation', 'diagram', 'design']}
    >
      {(activeTab) => (
        <>
          <style>{CSS}</style>

          {/* Toast Notification Banner */}
          {toastMsg && (
            <div
              style={{
                background: toastType === 'error' ? '#ef4444' : toastType === 'success' ? '#10b981' : '#3b82f6',
                color: '#fff',
                padding: '10px 16px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 700,
                fontSize: 'var(--font-xs)',
                marginBottom: 16,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
            >
              {toastMsg}
            </div>
          )}

          {activeTab === 'operations' && <CacheOperationsTab snapshot={snapshot} onUpdate={setSnapshot} toast={toast} />}
          {activeTab === 'telemetry' && <TelemetryTab snapshot={snapshot} onUpdate={setSnapshot} toast={toast} />}
          {activeTab === 'logs' && <LogsTab snapshot={snapshot} logs={snapshot?.logs} />}
          {activeTab === 'simulation' && <Interactive2DSimulation toast={toast} />}
          {activeTab === 'diagram' && <ClassDiagram module="lrucache" />}
          {activeTab === 'design' && <DesignDetails module="lrucache" />}
        </>
      )}
    </LldPage>
  );
}
