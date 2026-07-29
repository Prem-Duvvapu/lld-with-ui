import { useState } from 'react';
import LldPage from '../../components/LldPage';

const CSS = `
.zeo-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.threads-trio { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
.thread-card { background: var(--bg-card); border: 2px solid var(--border-primary); border-radius: 10px; padding: 12px; text-align: center; transition: all 0.3s; }
.thread-card.active { border-color: var(--accent); box-shadow: 0 0 14px rgba(102,126,234,0.4); transform: scale(1.04); }

.seq-stream { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 16px; min-height: 120px; font-family: monospace; font-size: 14px; display: flex; flex-wrap: wrap; gap: 8px; align-content: flex-start; }
.seq-tag { padding: 6px 12px; border-radius: 6px; font-weight: 700; }
.seq-tag.zero { background: rgba(102,126,234,0.2); color: var(--accent); border: 1px solid var(--accent); }
.seq-tag.odd { background: rgba(234,179,8,0.2); color: var(--warning); border: 1px solid var(--warning); }
.seq-tag.even { background: rgba(63,185,80,0.2); color: var(--success); border: 1px solid var(--success); }
`;

function AnimatedFlow() {
  const [numCounter, setNumCounter] = useState(1);
  const [turn, setTurn] = useState('ZERO'); // ZERO, ODD, EVEN
  const [output, setOutput] = useState([]);
  const [log, setLog] = useState('Semaphores initialized: zeroSema(1), oddSema(0), evenSema(0).');

  const stepSequence = () => {
    if (turn === 'ZERO') {
      setOutput(prev => [...prev, { val: '0', type: 'zero' }]);
      if (numCounter % 2 !== 0) {
        setTurn('ODD');
        setLog(`0️⃣ Thread-Zero printed "0" -> released oddSema for n=${numCounter}`);
      } else {
        setTurn('EVEN');
        setLog(`0️⃣ Thread-Zero printed "0" -> released evenSema for n=${numCounter}`);
      }
    } else if (turn === 'ODD') {
      setOutput(prev => [...prev, { val: `${numCounter}`, type: 'odd' }]);
      setTurn('ZERO');
      setLog(`1️⃣ Thread-Odd printed "${numCounter}" -> released zeroSema.`);
      setNumCounter(n => n + 1);
    } else if (turn === 'EVEN') {
      setOutput(prev => [...prev, { val: `${numCounter}`, type: 'even' }]);
      setTurn('ZERO');
      setLog(`2️⃣ Thread-Even printed "${numCounter}" -> released zeroSema.`);
      setNumCounter(n => n + 1);
    }
  };

  const reset = () => {
    setNumCounter(1);
    setTurn('ZERO');
    setOutput([]);
    setLog('Reset sequence.');
  };

  return (
    <div className="zeo-container">
      <style>{CSS}</style>

      <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginBottom: 16 }}>
        3-THREAD SEMAPHORE INTERLEAVED SEQUENCE (0 → 1 → 0 → 2...)
      </div>

      <div className="threads-trio">
        <div className={`thread-card ${turn === 'ZERO' ? 'active' : ''}`}>
          <div style={{ fontSize: 24 }}>0️⃣</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Thread-Zero</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>zeroSema(1)</div>
        </div>

        <div className={`thread-card ${turn === 'ODD' ? 'active' : ''}`}>
          <div style={{ fontSize: 24 }}>1️⃣</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Thread-Odd</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>oddSema(0)</div>
        </div>

        <div className={`thread-card ${turn === 'EVEN' ? 'active' : ''}`}>
          <div style={{ fontSize: 24 }}>2️⃣</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Thread-Even</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>evenSema(0)</div>
        </div>
      </div>

      <div className="seq-stream">
        {output.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Click "Step Sequence" to generate interleaved output stream.</div>
        ) : (
          output.map((item, idx) => (
            <div key={idx} className={`seq-tag ${item.type}`}>
              {item.val}
            </div>
          ))
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
        <button onClick={stepSequence} style={{ padding: '10px 24px', borderRadius: 8, background: 'var(--accent-gradient)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
          ▶ Step Sequence (Next: {turn})
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

export default function ZeroEvenOddPage() {
  return (
    <LldPage module="zero-even-odd" title="Print Zero Even Odd" icon="0️⃣" tabs={['app', 'simulation', 'diagram', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'simulation' && <AnimatedFlow />}
          {activeTab === 'app' && <AnimatedFlow />}
        </>
      )}
    </LldPage>
  );
}
