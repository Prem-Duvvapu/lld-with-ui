import { useState } from 'react';
import LldPage from '../../components/LldPage';
import { usePolling } from '../../hooks/usePolling';
import {
  listPools, submitTask, shutdownPool,
  simReset, simSubmit, simRelease, simShutdown, simGetSnapshot,
} from './api';

const CSS = `
.tp-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.tp-pools { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; margin-bottom: 16px; }
.tp-card { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 10px; padding: 14px; }
.tp-card h4 { margin: 0 0 8px; font-size: 14px; color: var(--text-primary); }
.tp-card .policy { display: inline-block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; padding: 2px 8px; border-radius: 999px; background: rgba(102,126,234,0.15); color: #667eea; margin-bottom: 8px; }
.tp-row { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
.tp-row b { color: var(--text-primary); }
.tp-btn { padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; border: none; background: var(--accent-gradient); color: #fff; margin-top: 8px; margin-right: 6px; }
.tp-btn:hover { opacity: 0.9; }
.tp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.tp-btn.danger { background: var(--danger); }
.tp-banner { max-width: 520px; margin: 0 auto 16px; padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; }
.tp-banner.ok { background: rgba(34,197,94,0.12); border: 1px solid #22c55e; color: #22c55e; }
.tp-banner.err { background: var(--danger-bg); border: 1px solid var(--danger); color: var(--danger); }

.tp-stage { position: relative; background: #1a1a2e; border-radius: 12px; padding: 24px; margin-bottom: 16px; min-height: 260px; }
.tp-workers { display: flex; gap: 10px; justify-content: center; margin-bottom: 20px; flex-wrap: wrap; }
.tp-worker { width: 64px; height: 64px; border-radius: 10px; border: 2px solid #444; display: flex; align-items: center; justify-content: center; font-size: 22px; background: rgba(255,255,255,0.03); transition: all 0.3s; }
.tp-worker.busy { border-color: #667eea; background: rgba(102,126,234,0.2); box-shadow: 0 0 14px rgba(102,126,234,0.5); }
.tp-worker.core { border-style: solid; }
.tp-worker.extra { border-style: dashed; }
.tp-queue { display: flex; gap: 8px; justify-content: center; min-height: 40px; align-items: center; margin-bottom: 16px; }
.tp-queue-slot { width: 40px; height: 28px; border-radius: 6px; border: 2px dashed #555; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #aaa; }
.tp-queue-slot.filled { border-style: solid; border-color: #eab308; background: rgba(234,179,8,0.15); color: #eab308; font-weight: 700; }
.tp-hud { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 10px; }
.tp-hud-tile { background: rgba(255,255,255,0.05); border-radius: 8px; padding: 10px; text-align: center; }
.tp-hud-tile .val { font-size: 18px; font-weight: 800; color: #fff; }
.tp-hud-tile .lbl { font-size: 9px; color: #aaa; text-transform: uppercase; letter-spacing: 0.5px; }
.tp-log { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 12px; font-family: monospace; font-size: 12px; max-height: 160px; overflow-y: auto; }
.tp-log-line { padding: 3px 0; border-bottom: 1px solid var(--border-primary); }
.tp-log-line.SUCCESS { color: #22c55e; }
.tp-log-line.ERROR { color: var(--danger); }
.tp-log-line.INFO { color: var(--text-muted); }

.step-indicator { display: flex; gap: 6px; justify-content: center; margin-bottom: 16px; }
.step-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--border-primary); }
.step-dot.done { background: #22c55e; }
.step-dot.active { background: #667eea; transform: scale(1.3); }
`;

function AppTab() {
  const [pools, setPools] = useState([]);
  const [banner, setBanner] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      const data = await listPools();
      setPools(data);
      setError(null);
    } catch (err) {
      setError(err?.message || 'Failed to load thread pools');
    }
  };

  usePolling(load, 2000, []);

  const handleSubmit = async (poolId) => {
    try {
      const result = await submitTask(poolId, `task-${Date.now() % 1000}`, 1500);
      setBanner({ poolId, ...result });
      load();
    } catch (err) {
      setBanner(null);
      setError(err?.message || 'Submission failed');
    }
  };

  const handleShutdown = async (poolId) => {
    try {
      await shutdownPool(poolId);
      load();
    } catch (err) {
      setError(err?.message || 'Shutdown failed');
    }
  };

  return (
    <div className="tp-container">
      <style>{CSS}</style>
      {error && <div className="tp-banner err">⚠ {error}</div>}
      {banner && (
        <div className={`tp-banner ${banner.outcome === 'ACCEPTED' || banner.outcome === 'RAN_ON_CALLER' ? 'ok' : 'err'}`}>
          {banner.poolId}: task "{banner.taskName}" → {banner.outcome.replace(/_/g, ' ')}
        </div>
      )}
      <div className="tp-pools">
        {pools.map((p) => (
          <div key={p.poolId} className="tp-card">
            <h4>{p.poolId}</h4>
            <span className="policy">{p.rejectionPolicy.replace(/_/g, ' ')}</span>
            <div className="tp-row"><span>Workers</span><b>{p.currentWorkerCount} (core {p.corePoolSize} / max {p.maxPoolSize})</b></div>
            <div className="tp-row"><span>Queue</span><b>{p.queueSize} / {p.queueCapacity}</b></div>
            <div className="tp-row"><span>Submitted / Completed</span><b>{p.submittedCount} / {p.completedCount}</b></div>
            <div className="tp-row"><span>Rejected / Caller-Run</span><b>{p.rejectedCount} / {p.callerRunCount}</b></div>
            <div className="tp-row"><span>Status</span><b>{p.shuttingDown ? 'Shutting Down' : 'Running'}</b></div>
            <button className="tp-btn" disabled={p.shuttingDown} onClick={() => handleSubmit(p.poolId)}>Submit Task</button>
            <button className="tp-btn danger" disabled={p.shuttingDown} onClick={() => handleShutdown(p.poolId)}>Shutdown</button>
          </div>
        ))}
      </div>
    </div>
  );
}

const STEPS = [
  { title: 'Reset', detail: 'Cold-start a pool: corePoolSize=2, maxPoolSize=3, queueCapacity=1, AbortPolicy.' },
  { title: 'Submit T1', detail: 'Fewer than 2 workers exist — spins up core worker A, running immediately.' },
  { title: 'Submit T2', detail: 'Fewer than 2 workers exist — spins up core worker B, running immediately.' },
  { title: 'Submit T3', detail: 'Both core workers busy, queue has room — T3 queues.' },
  { title: 'Submit T4', detail: 'Queue is now full (capacity 1) and workers(2) < max(3) — spins up extra worker C.' },
  { title: 'Submit T5', detail: 'Queue full AND workers == max — saturated. AbortPolicy rejects T5.' },
  { title: 'Release Oldest', detail: 'T1 completes. Its worker immediately picks up the queued T3.' },
  { title: 'Shutdown', detail: 'No new tasks accepted. Review the final state.' },
];

function SimulationTab() {
  const [step, setStep] = useState(0);
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState(null);

  const runStep = async () => {
    try {
      let snap;
      if (step === 0) snap = await simReset();
      else if (step >= 1 && step <= 5) snap = await simSubmit(step + 1);
      else if (step === 6) snap = await simRelease(step + 1);
      else if (step === 7) snap = await simShutdown(step + 1);
      else snap = await simGetSnapshot();
      setSnapshot(snap);
      setError(null);
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    } catch (err) {
      setError(err?.message || 'Simulation step failed');
    }
  };

  const stats = snapshot?.stats;
  const workerCount = stats?.currentWorkerCount ?? 0;
  const maxPoolSize = stats?.maxPoolSize ?? 3;
  const corePoolSize = stats?.corePoolSize ?? 2;
  const queueSize = stats?.queueSize ?? 0;
  const queueCapacity = stats?.queueCapacity ?? 1;

  return (
    <div className="tp-container">
      <style>{CSS}</style>
      <div className="step-indicator">
        {STEPS.map((_, i) => (
          <div key={i} className={`step-dot ${i < step ? 'done' : i === step ? 'active' : ''}`} />
        ))}
      </div>
      <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 13, color: 'var(--text-muted)' }}>
        <b>Step {step + 1}/{STEPS.length}: {STEPS[step].title}</b> — {STEPS[step].detail}
      </div>
      {error && <div className="tp-banner err">⚠ {error}</div>}

      <div className="tp-stage">
        <div className="tp-workers">
          {Array.from({ length: maxPoolSize }, (_, i) => (
            <div key={i} className={`tp-worker ${i < workerCount ? 'busy' : ''} ${i < corePoolSize ? 'core' : 'extra'}`}>
              {i < workerCount ? '⚙️' : '·'}
            </div>
          ))}
        </div>
        <div className="tp-queue">
          {Array.from({ length: queueCapacity }, (_, i) => (
            <div key={i} className={`tp-queue-slot ${i < queueSize ? 'filled' : ''}`}>{i < queueSize ? 'T' : ''}</div>
          ))}
        </div>
        <div className="tp-hud">
          <div className="tp-hud-tile"><div className="val">{workerCount}/{maxPoolSize}</div><div className="lbl">Workers</div></div>
          <div className="tp-hud-tile"><div className="val">{queueSize}/{queueCapacity}</div><div className="lbl">Queue</div></div>
          <div className="tp-hud-tile"><div className="val">{stats?.completedCount ?? 0}</div><div className="lbl">Completed</div></div>
          <div className="tp-hud-tile"><div className="val">{stats?.rejectedCount ?? 0}</div><div className="lbl">Rejected</div></div>
        </div>
      </div>

      <button className="tp-btn" onClick={runStep} disabled={step >= STEPS.length - 1 && snapshot}>
        {step === 0 ? 'Start Simulation' : step >= STEPS.length - 1 ? 'Done' : 'Next Step →'}
      </button>

      <div className="tp-log" style={{ marginTop: 16 }}>
        {(snapshot?.events ?? []).slice().reverse().map((e) => (
          <div key={e.id} className={`tp-log-line ${e.status}`}>[{e.eventType}] {e.title} — {e.description}</div>
        ))}
      </div>
    </div>
  );
}

export default function ThreadPoolPage() {
  return (
    <LldPage module="thread-pool" title="Thread Pool" icon="🧵" tabs={['app', 'simulation', 'diagram', 'sequence', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'app' && <AppTab />}
          {activeTab === 'simulation' && <SimulationTab />}
        </>
      )}
    </LldPage>
  );
}
