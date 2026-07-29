import { useState, useEffect, useRef } from 'react';
import LldPage from '../../components/LldPage';

const CSS = `
.bq-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.bq-controls { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 20px; }
.bq-btn { padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; border: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-primary); transition: all 0.2s; }
.bq-btn.primary { background: var(--accent-gradient); color: #fff; border: none; }
.bq-btn.success { background: var(--success); color: #fff; border: none; }
.bq-btn.danger { background: var(--danger); color: #fff; border: none; }
.bq-btn:hover { opacity: 0.9; transform: translateY(-1px); }

.bq-stage { position: relative; width: 100%; min-height: 320px; background: var(--bg-primary); border-radius: 12px; border: 1px solid var(--border-primary); padding: 20px; display: grid; grid-template-columns: 200px 1fr 200px; gap: 20px; margin-bottom: 20px; }

.thread-col { display: flex; flex-direction: column; gap: 12px; justify-content: center; }
.thread-card { background: var(--bg-card); border: 2px solid var(--border-primary); border-radius: 10px; padding: 12px; text-align: center; transition: all 0.3s; }
.thread-card.active { border-color: var(--accent); box-shadow: 0 0 12px rgba(102,126,234,0.3); }
.thread-card.blocked { border-color: var(--danger); background: rgba(248,81,73,0.1); }

.queue-core { display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg-secondary); border: 1px dashed var(--border-primary); border-radius: 10px; padding: 16px; position: relative; }
.buffer-slots { display: flex; gap: 10px; margin: 16px 0; }
.slot { width: 50px; height: 50px; border: 2px dashed var(--border-primary); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; background: var(--bg-card); transition: all 0.3s; }
.slot.filled { border-style: solid; border-color: var(--success); background: rgba(63,185,80,0.15); color: var(--success); transform: scale(1.05); }

.lock-badge { position: absolute; top: 12px; right: 12px; padding: 4px 10px; border-radius: 12px; font-size: 10px; font-weight: 700; background: var(--bg-tertiary); border: 1px solid var(--border-primary); }
.lock-badge.locked { background: var(--accent); color: white; }

.wait-set { width: 100%; padding: 8px; background: var(--bg-primary); border-radius: 6px; font-size: 11px; color: var(--text-muted); text-align: center; margin-top: 6px; }
`;

function AnimatedFlow() {
  const [capacity] = useState(5);
  const [queue, setQueue] = useState([]);
  const [producerState, setProducerState] = useState('IDLE'); // IDLE, RUNNING, BLOCKED
  const [consumerState, setConsumerState] = useState('IDLE'); // IDLE, RUNNING, BLOCKED
  const [lockOwner, setLockOwner] = useState(null);
  const [logs, setLogs] = useState([]);
  const [autoLoop, setAutoLoop] = useState(false);
  const autoLoopRef = useRef(null);

  const addLog = (msg) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 4)]);

  const handlePut = async (itemVal) => {
    const item = itemVal || `P-${Math.floor(Math.random() * 900 + 100)}`;
    setProducerState('RUNNING');
    setLockOwner('Producer Thread');
    addLog(`Producer acquiring ReentrantLock...`);

    await new Promise(r => setTimeout(r, 400));

    if (queue.length >= capacity) {
      setProducerState('BLOCKED');
      addLog(`⚠️ Queue FULL (count == ${capacity}). Producer calling notFull.await() -> BLOCKED`);
      setTimeout(() => { setProducerState('IDLE'); setLockOwner(null); }, 1500);
      return;
    }

    setQueue(prev => [...prev, item]);
    addLog(`✅ Producer produced: [${item}] -> Queue size: ${queue.length + 1}/${capacity}. Signalled notEmpty.`);
    setLockOwner(null);
    setProducerState('IDLE');
  };

  const handleTake = async () => {
    setConsumerState('RUNNING');
    setLockOwner('Consumer Thread');
    addLog(`Consumer acquiring ReentrantLock...`);

    await new Promise(r => setTimeout(r, 400));

    if (queue.length === 0) {
      setConsumerState('BLOCKED');
      addLog(`⚠️ Queue EMPTY (count == 0). Consumer calling notEmpty.await() -> BLOCKED`);
      setTimeout(() => { setConsumerState('IDLE'); setLockOwner(null); }, 1500);
      return;
    }

    const removed = queue[0];
    setQueue(prev => prev.slice(1));
    addLog(`📦 Consumer consumed: [${removed}] <- Queue size: ${queue.length - 1}/${capacity}. Signalled notFull.`);
    setLockOwner(null);
    setConsumerState('IDLE');
  };

  useEffect(() => {
    if (autoLoop) {
      autoLoopRef.current = setInterval(() => {
        if (Math.random() > 0.4) handlePut();
        else handleTake();
      }, 1500);
    } else {
      clearInterval(autoLoopRef.current);
    }
    return () => clearInterval(autoLoopRef.current);
  }, [autoLoop, queue]);

  return (
    <div className="bq-container">
      <style>{CSS}</style>

      <div className="bq-controls">
        <button className="bq-btn primary" onClick={() => handlePut()}>
          ⚙️ Produce (put)
        </button>
        <button className="bq-btn success" onClick={() => handleTake()}>
          🛒 Consume (take)
        </button>
        <button className="bq-btn" onClick={() => setAutoLoop(!autoLoop)}>
          {autoLoop ? '⏸ Pause Auto Stream' : '⚡ Auto Producer/Consumer Stream'}
        </button>
      </div>

      <div className="bq-stage">
        {/* Producers */}
        <div className="thread-col">
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center' }}>PRODUCER THREADS</div>
          <div className={`thread-card ${producerState === 'RUNNING' ? 'active' : producerState === 'BLOCKED' ? 'blocked' : ''}`}>
            <div style={{ fontSize: 24 }}>⚙️</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Producer Worker</div>
            <div style={{ fontSize: 11, marginTop: 4, color: producerState === 'BLOCKED' ? 'var(--danger)' : 'var(--text-muted)' }}>
              State: {producerState}
            </div>
          </div>
        </div>

        {/* Bounded Buffer Queue */}
        <div className="queue-core">
          <div className={`lock-badge ${lockOwner ? 'locked' : ''}`}>
            {lockOwner ? `🔒 Locked by ${lockOwner}` : '🔓 ReentrantLock Unlocked'}
          </div>

          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--info)' }}>BOUNDED QUEUE BUFFER</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Capacity = {capacity} slots</div>

          <div className="buffer-slots">
            {Array.from({ length: capacity }).map((_, idx) => {
              const item = queue[idx];
              return (
                <div key={idx} className={`slot ${item ? 'filled' : ''}`}>
                  {item ? item.split('-')[1] || item : idx}
                </div>
              );
            })}
          </div>

          <div className="wait-set">
            Condition <strong>notFull</strong>: {producerState === 'BLOCKED' ? 'Producer Waiting (Full)' : 'Empty'}
          </div>
          <div className="wait-set">
            Condition <strong>notEmpty</strong>: {consumerState === 'BLOCKED' ? 'Consumer Waiting (Empty)' : 'Empty'}
          </div>
        </div>

        {/* Consumers */}
        <div className="thread-col">
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center' }}>CONSUMER THREADS</div>
          <div className={`thread-card ${consumerState === 'RUNNING' ? 'active' : consumerState === 'BLOCKED' ? 'blocked' : ''}`}>
            <div style={{ fontSize: 24 }}>🛒</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Consumer Worker</div>
            <div style={{ fontSize: 11, marginTop: 4, color: consumerState === 'BLOCKED' ? 'var(--danger)' : 'var(--text-muted)' }}>
              State: {consumerState}
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--bg-primary)', padding: 12, borderRadius: 8, border: '1px solid var(--border-primary)', fontFamily: 'monospace', fontSize: 12 }}>
        <div style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>Thread Synchronization Log:</div>
        {logs.length === 0 ? <div style={{ color: 'var(--text-muted)' }}>Click Produce or Consume to begin multi-threaded simulation.</div> : logs.map((l, idx) => (
          <div key={idx} style={{ color: idx === 0 ? 'var(--info)' : 'var(--text-muted)' }}>{l}</div>
        ))}
      </div>
    </div>
  );
}

export default function BlockingQueuePage() {
  return (
    <LldPage module="blocking-queue" title="Blocking Queue System" icon="🔄" tabs={['app', 'simulation', 'diagram', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'simulation' && <AnimatedFlow />}
          {activeTab === 'app' && <AnimatedFlow />}
        </>
      )}
    </LldPage>
  );
}
