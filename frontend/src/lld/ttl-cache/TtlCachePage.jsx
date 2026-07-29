import { useState, useEffect } from 'react';
import LldPage from '../../components/LldPage';

const CSS = `
.ttl-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.ttl-controls { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 20px; }
.ttl-input { padding: 8px 12px; border: 1px solid var(--border-primary); border-radius: 6px; background: var(--bg-input); color: var(--text-primary); font-size: 13px; width: 140px; }
.ttl-btn { padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; border: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-primary); transition: all 0.2s; }
.ttl-btn.primary { background: var(--accent-gradient); color: #fff; border: none; }
.ttl-btn:hover { opacity: 0.9; transform: translateY(-1px); }

.ttl-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px; }
.ttl-card { background: var(--bg-card); border: 2px solid var(--accent); border-radius: 10px; padding: 14px; text-align: center; position: relative; transition: all 0.3s; }
.ttl-card.expired { border-color: var(--danger); opacity: 0.4; }

.progress-bar-bg { width: 100%; height: 6px; background: var(--bg-tertiary); border-radius: 3px; overflow: hidden; margin-top: 8px; }
.progress-bar-fill { height: 100%; background: var(--accent); transition: width 0.1s linear; }
`;

function AnimatedFlow() {
  const [entries, setEntries] = useState([
    { key: 'session_token', val: 'xyz9982', ttlSec: 10, remainingSec: 10 },
    { key: 'user_profile', val: 'Prem', ttlSec: 6, remainingSec: 6 },
  ]);
  const [keyInput, setKeyInput] = useState('');
  const [valInput, setValInput] = useState('');
  const [ttlInput, setTtlInput] = useState('8');
  const [log, setLog] = useState('TTL Cache initialized. Background sweeper thread running every 1 second.');

  useEffect(() => {
    const timer = setInterval(() => {
      setEntries(prev => prev.map(e => ({
        ...e,
        remainingSec: Math.max(0, e.remainingSec - 0.2),
      })).filter(e => e.remainingSec > 0));
    }, 200);
    return () => clearInterval(timer);
  }, []);

  const handlePut = () => {
    const k = keyInput.trim() || `key_${Math.floor(Math.random() * 90 + 10)}`;
    const v = valInput.trim() || `val_${Math.floor(Math.random() * 900 + 100)}`;
    const t = parseInt(ttlInput, 10) || 5;

    setEntries(prev => [...prev.filter(e => e.key !== k), { key: k, val: v, ttlSec: t, remainingSec: t }]);
    setLog(`✅ PUT("${k}", "${v}") with TTL = ${t}s. Expiry scheduled.`);
    setKeyInput(''); setValInput('');
  };

  return (
    <div className="ttl-container">
      <style>{CSS}</style>

      <div className="ttl-controls">
        <input className="ttl-input" placeholder="Key (e.g. 'auth')" value={keyInput} onChange={e => setKeyInput(e.target.value)} />
        <input className="ttl-input" placeholder="Value (e.g. 'token')" value={valInput} onChange={e => setValInput(e.target.value)} />
        <input className="ttl-input" style={{ width: 80 }} placeholder="TTL (sec)" value={ttlInput} onChange={e => setTtlInput(e.target.value)} />
        <button className="ttl-btn primary" onClick={handlePut}>+ PUT with TTL</button>
      </div>

      <div style={{ background: 'var(--bg-primary)', padding: 20, borderRadius: 12, border: '1px solid var(--border-primary)' }}>
        <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>
          ACTIVE CACHE ENTRIES (BACKGROUND SWEEPER RUNNING)
        </div>

        <div className="ttl-grid">
          {entries.length === 0 ? (
            <div style={{ gridColumn: 'span 3', color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
              All cache entries have expired and been automatically evicted by cleaner thread.
            </div>
          ) : (
            entries.map(e => {
              const pct = (e.remainingSec / e.ttlSec) * 100;
              return (
                <div key={e.key} className="ttl-card">
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>"{e.key}"</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{e.val}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--info)', marginTop: 6 }}>
                    ⏱️ {e.remainingSec.toFixed(1)}s left
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${pct}%`, background: pct < 30 ? 'var(--danger)' : 'var(--accent)' }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div style={{ marginTop: 16, background: 'var(--bg-primary)', padding: 12, borderRadius: 8, border: '1px solid var(--border-primary)', fontSize: 12, color: 'var(--info)', textAlign: 'center', fontWeight: 600 }}>
        {log}
      </div>
    </div>
  );
}

export default function TtlCachePage() {
  return (
    <LldPage module="ttl-cache" title="TTL Cache System" icon="⏱️" tabs={['app', 'simulation', 'diagram', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'simulation' && <AnimatedFlow />}
          {activeTab === 'app' && <AnimatedFlow />}
        </>
      )}
    </LldPage>
  );
}
