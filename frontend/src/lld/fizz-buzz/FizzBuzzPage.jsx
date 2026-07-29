import { useState } from 'react';
import LldPage from '../../components/LldPage';

const CSS = `
.fb-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.threads-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
.thread-box { background: var(--bg-card); border: 2px solid var(--border-primary); border-radius: 10px; padding: 12px; text-align: center; transition: all 0.3s; }
.thread-box.active { border-color: var(--accent); box-shadow: 0 0 14px rgba(102,126,234,0.4); transform: scale(1.04); }

.stream-output { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 16px; min-height: 140px; max-height: 200px; overflow-y: auto; font-family: monospace; font-size: 13px; display: flex; flex-wrap: wrap; gap: 8px; align-content: flex-start; }
.output-pill { padding: 4px 10px; border-radius: 6px; font-weight: 700; background: var(--bg-tertiary); border: 1px solid var(--border-secondary); }
.output-pill.fizz { background: rgba(102,126,234,0.2); color: var(--accent); border-color: var(--accent); }
.output-pill.buzz { background: rgba(234,179,8,0.2); color: var(--warning); border-color: var(--warning); }
.output-pill.fizzbuzz { background: rgba(239,68,68,0.2); color: var(--danger); border-color: var(--danger); }
.output-pill.num { color: var(--text-primary); }
`;

function AnimatedFlow() {
  const [current, setCurrent] = useState(1);
  const [activeThread, setActiveThread] = useState(null);
  const [outputs, setOutputs] = useState([]);
  const [log, setLog] = useState('4 Concurrent Threads waiting on monitor lock...');

  const runNextNumber = () => {
    let thread = '';
    let val = '';
    let type = '';

    if (current % 15 === 0) {
      thread = 'Thread-C (FizzBuzz)';
      val = 'FizzBuzz 🎆';
      type = 'fizzbuzz';
    } else if (current % 3 === 0) {
      thread = 'Thread-A (Fizz)';
      val = 'Fizz ⚡';
      type = 'fizz';
    } else if (current % 5 === 0) {
      thread = 'Thread-B (Buzz)';
      val = 'Buzz 🔔';
      type = 'buzz';
    } else {
      thread = 'Thread-D (Number)';
      val = `${current}`;
      type = 'num';
    }

    setActiveThread(thread);
    setOutputs(prev => [...prev, { val, type, num: current }]);
    setLog(`🔒 Monitor notifyAll() -> Woke up [${thread}]. Printed: "${val}" for n=${current}`);
    setCurrent(c => c + 1);
  };

  const reset = () => {
    setCurrent(1);
    setActiveThread(null);
    setOutputs([]);
    setLog('Reset simulation back to n=1.');
  };

  return (
    <div className="fb-container">
      <style>{CSS}</style>

      <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginBottom: 12 }}>
        4-THREAD MONITOR SYNCHRONIZATION (n = {current})
      </div>

      <div className="threads-grid">
        <div className={`thread-box ${activeThread?.includes('Thread-A') ? 'active' : ''}`}>
          <div style={{ fontSize: 24 }}>⚡</div>
          <div style={{ fontSize: 12, fontWeight: 700 }}>Thread-A</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Condition: n % 3 == 0</div>
        </div>

        <div className={`thread-box ${activeThread?.includes('Thread-B') ? 'active' : ''}`}>
          <div style={{ fontSize: 24 }}>🔔</div>
          <div style={{ fontSize: 12, fontWeight: 700 }}>Thread-B</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Condition: n % 5 == 0</div>
        </div>

        <div className={`thread-box ${activeThread?.includes('Thread-C') ? 'active' : ''}`}>
          <div style={{ fontSize: 24 }}>🎆</div>
          <div style={{ fontSize: 12, fontWeight: 700 }}>Thread-C</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Condition: n % 15 == 0</div>
        </div>

        <div className={`thread-box ${activeThread?.includes('Thread-D') ? 'active' : ''}`}>
          <div style={{ fontSize: 24 }}>🔢</div>
          <div style={{ fontSize: 12, fontWeight: 700 }}>Thread-D</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Condition: Else</div>
        </div>
      </div>

      <div className="stream-output">
        {outputs.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Click "Step Next Number" to begin multi-threaded output.</div>
        ) : (
          outputs.map((item, idx) => (
            <div key={idx} className={`output-pill ${item.type}`}>
              {item.num}: {item.val}
            </div>
          ))
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
        <button onClick={runNextNumber} style={{ padding: '10px 24px', borderRadius: 8, background: 'var(--accent-gradient)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
          ▶ Step Next Number (n = {current})
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

export default function FizzBuzzPage() {
  return (
    <LldPage module="fizz-buzz" title="Fizz Buzz Multithreaded" icon="⚡" tabs={['app', 'simulation', 'diagram', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'simulation' && <AnimatedFlow />}
          {activeTab === 'app' && <AnimatedFlow />}
        </>
      )}
    </LldPage>
  );
}
