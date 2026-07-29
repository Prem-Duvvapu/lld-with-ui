import { useState } from 'react';
import LldPage from '../../components/LldPage';

const CSS = `
.fb-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.threads-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
.thread-card { background: var(--bg-card); border: 2px solid var(--border-primary); border-radius: 10px; padding: 14px; text-align: center; transition: all 0.3s; }
.thread-card.active { border-color: var(--accent); box-shadow: 0 0 14px rgba(102,126,234,0.4); transform: scale(1.03); }

.foobar-stream { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 16px; min-height: 120px; font-family: monospace; font-size: 14px; display: flex; flex-wrap: wrap; gap: 8px; align-content: flex-start; }
.foobar-tag { padding: 6px 12px; border-radius: 6px; font-weight: 700; }
.foobar-tag.foo { background: rgba(102,126,234,0.2); color: var(--accent); border: 1px solid var(--accent); }
.foobar-tag.bar { background: rgba(63,185,80,0.2); color: var(--success); border: 1px solid var(--success); }
`;

function AnimatedFlow() {
  const [turn, setTurn] = useState('FOO'); // FOO or BAR
  const [output, setOutput] = useState([]);
  const [log, setLog] = useState('Semaphore fooSema(1), barSema(0) initialized. Thread-A ready.');

  const handlePingPong = () => {
    if (turn === 'FOO') {
      setOutput(prev => [...prev, { text: 'Foo', type: 'foo' }]);
      setTurn('BAR');
      setLog('🔵 Thread-A acquired fooSema -> printed "Foo" -> released barSema.');
    } else {
      setOutput(prev => [...prev, { text: 'Bar', type: 'bar' }]);
      setTurn('FOO');
      setLog('🟢 Thread-B acquired barSema -> printed "Bar" -> released fooSema.');
    }
  };

  const reset = () => {
    setTurn('FOO');
    setOutput([]);
    setLog('Reset semaphores.');
  };

  return (
    <div className="fb-container">
      <style>{CSS}</style>

      <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginBottom: 16 }}>
        SEMAPHORE PING-PONG SYNCHRONIZATION
      </div>

      <div className="threads-pair">
        <div className={`thread-card ${turn === 'FOO' ? 'active' : ''}`}>
          <div style={{ fontSize: 24 }}>🔵</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Thread-A (Foo)</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            fooSema permits: {turn === 'FOO' ? 1 : 0}
          </div>
        </div>

        <div className={`thread-card ${turn === 'BAR' ? 'active' : ''}`}>
          <div style={{ fontSize: 24 }}>🟢</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Thread-B (Bar)</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            barSema permits: {turn === 'BAR' ? 1 : 0}
          </div>
        </div>
      </div>

      <div className="foobar-stream">
        {output.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Click "Ping-Pong Step" to trigger alternate execution.</div>
        ) : (
          output.map((item, idx) => (
            <div key={idx} className={`foobar-tag ${item.type}`}>
              {item.text}
            </div>
          ))
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
        <button onClick={handlePingPong} style={{ padding: '10px 24px', borderRadius: 8, background: 'var(--accent-gradient)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
          🏓 Ping-Pong Step ({turn === 'FOO' ? 'Foo' : 'Bar'})
        </button>
        <button onClick={reset} style={{ padding: '10px 20px', borderRadius: 8, background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', cursor: 'pointer', fontWeight: 600 }}>
          🔄 Reset
        </button>
      </div>

      <div style={{ marginTop: 16, background: 'var(--bg-primary)', padding: 12, borderRadius: 8, border: '1px solid var(--border-primary)', fontSize: 12, color: 'var(--info)', textAlign: 'center', fontWeight: 600 }}>
        {log}
      </div>
    </div>
  );
}

export default function FooBarPage() {
  return (
    <LldPage module="foo-bar" title="Print FooBar Alternately" icon="🏓" tabs={['app', 'simulation', 'diagram', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'simulation' && <AnimatedFlow />}
          {activeTab === 'app' && <AnimatedFlow />}
        </>
      )}
    </LldPage>
  );
}
