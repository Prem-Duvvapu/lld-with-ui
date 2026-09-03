import { useState } from 'react';
import LldPage from '../../components/LldPage';
import { usePolling } from '../../hooks/usePolling';
import {
  attemptRequest, listClients,
  simReset, simSendRequest, simAdvanceClock, simGetSnapshot,
} from './api';

const CSS = `
.rl-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.rl-clients { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 16px; }
.rl-card { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 10px; padding: 14px; }
.rl-card h4 { margin: 0 0 8px; font-size: 14px; color: var(--text-primary); }
.rl-row { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
.rl-row b { color: var(--text-primary); }
.rl-btn { padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; border: none; background: var(--accent-gradient); color: #fff; margin-top: 8px; }
.rl-btn:hover { opacity: 0.9; }
.rl-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.rl-banner { max-width: 480px; margin: 0 auto 16px; padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; }
.rl-banner.allowed { background: rgba(34,197,94,0.12); border: 1px solid #22c55e; color: #22c55e; }
.rl-banner.denied { background: var(--danger-bg); border: 1px solid var(--danger); color: var(--danger); }

.rl-stage { position: relative; background: #1a1a2e; border-radius: 12px; padding: 24px; margin-bottom: 16px; min-height: 260px; }
.rl-bucket { width: 140px; margin: 0 auto; border: 3px solid #667eea; border-radius: 0 0 16px 16px; border-top: none; position: relative; height: 160px; display: flex; flex-direction: column-reverse; overflow: hidden; background: rgba(102,126,234,0.05); }
.rl-token { height: 30px; margin: 2px 6px; border-radius: 6px; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; font-size: 11px; color: #fff; font-weight: 700; transition: all 0.4s ease; }
.rl-hud { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-top: 16px; }
.rl-hud-tile { background: rgba(255,255,255,0.05); border-radius: 8px; padding: 10px; text-align: center; }
.rl-hud-tile .val { font-size: 20px; font-weight: 800; color: #fff; }
.rl-hud-tile .lbl { font-size: 10px; color: #aaa; text-transform: uppercase; letter-spacing: 0.5px; }
.rl-log { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 12px; font-family: monospace; font-size: 12px; max-height: 160px; overflow-y: auto; }
.rl-log-line { padding: 3px 0; border-bottom: 1px solid var(--border-primary); }
.rl-log-line.SUCCESS { color: #22c55e; }
.rl-log-line.WARNING { color: #eab308; }
.rl-log-line.INFO { color: var(--text-muted); }

.step-indicator { display: flex; gap: 6px; justify-content: center; margin-bottom: 16px; }
.step-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--border-primary); }
.step-dot.done { background: #22c55e; }
.step-dot.active { background: #667eea; transform: scale(1.3); }
`;

function AppTab() {
  const [clients, setClients] = useState([]);
  const [banner, setBanner] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      const data = await listClients();
      setClients(data);
      setError(null);
    } catch (err) {
      setError(err?.message || 'Failed to load rate-limiter clients');
    }
  };

  usePolling(load, 2000, []);

  const handleRequest = async (clientId) => {
    try {
      const decision = await attemptRequest(clientId);
      setBanner({ clientId, ...decision });
      load();
    } catch (err) {
      setError(err?.message || 'Request failed');
    }
  };

  return (
    <div className="rl-container">
      <style>{CSS}</style>
      {error && <div className="rl-banner denied">⚠ {error}</div>}
      {banner && (
        <div className={`rl-banner ${banner.allowed ? 'allowed' : 'denied'}`}>
          {banner.allowed
            ? `✅ ${banner.clientId}: request allowed — ${banner.remaining} remaining`
            : `🚫 ${banner.clientId}: request throttled — 0 remaining`}
        </div>
      )}
      <div className="rl-clients">
        {clients.map((c) => (
          <div key={c.clientId} className="rl-card">
            <h4>{c.clientId}</h4>
            <div className="rl-row"><span>Algorithm</span><b>{c.algorithm.replace(/_/g, ' ')}</b></div>
            <div className="rl-row"><span>Remaining</span><b>{c.remaining} / {c.capacityOrLimit}</b></div>
            <div className="rl-row"><span>Allowed / Denied</span><b>{c.totalAllowed} / {c.totalDenied}</b></div>
            <button className="rl-btn" onClick={() => handleRequest(c.clientId)}>Send Request</button>
          </div>
        ))}
      </div>
    </div>
  );
}

const STEPS = [
  { title: 'Reset', detail: 'Cold-start a 3-token bucket refilling at 1 token/sec.' },
  { title: 'Send Request', detail: 'Consume a token — should be allowed (bucket starts full).' },
  { title: 'Send Request', detail: 'Consume another token.' },
  { title: 'Send Request', detail: 'Consume the last token — bucket now empty.' },
  { title: 'Send Request', detail: 'Bucket is empty — this request should be throttled.' },
  { title: 'Advance Clock +2s', detail: 'Let the bucket refill for 2 simulated seconds.' },
  { title: 'Send Request', detail: 'A token has refilled — this request should be allowed again.' },
  { title: 'Summary', detail: 'Review the full allow/deny trace.' },
];

function SimulationTab() {
  const [step, setStep] = useState(0);
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState(null);

  const runStep = async () => {
    try {
      let snap;
      if (step === 0) snap = await simReset();
      else if (step >= 1 && step <= 3) snap = await simSendRequest(step + 1);
      else if (step === 4) snap = await simSendRequest(step + 1);
      else if (step === 5) snap = await simAdvanceClock(2, step + 1);
      else if (step === 6) snap = await simSendRequest(step + 1);
      else snap = await simGetSnapshot();
      setSnapshot(snap);
      setError(null);
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    } catch (err) {
      setError(err?.message || 'Simulation step failed');
    }
  };

  const remaining = snapshot?.status?.remaining ?? 0;
  const capacity = snapshot?.status?.capacityOrLimit ?? 3;
  const tokens = Array.from({ length: capacity }, (_, i) => i < remaining);

  return (
    <div className="rl-container">
      <style>{CSS}</style>
      <div className="step-indicator">
        {STEPS.map((_, i) => (
          <div key={i} className={`step-dot ${i < step ? 'done' : i === step ? 'active' : ''}`} />
        ))}
      </div>
      <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 13, color: 'var(--text-muted)' }}>
        <b>Step {step + 1}/{STEPS.length}: {STEPS[step].title}</b> — {STEPS[step].detail}
      </div>
      {error && <div className="rl-banner denied">⚠ {error}</div>}

      <div className="rl-stage">
        <div className="rl-bucket">
          {tokens.map((filled, i) => filled && <div key={i} className="rl-token">●</div>)}
        </div>
        <div className="rl-hud">
          <div className="rl-hud-tile"><div className="val">{remaining}/{capacity}</div><div className="lbl">Tokens</div></div>
          <div className="rl-hud-tile"><div className="val">{snapshot?.status?.totalAllowed ?? 0}</div><div className="lbl">Allowed</div></div>
          <div className="rl-hud-tile"><div className="val">{snapshot?.status?.totalDenied ?? 0}</div><div className="lbl">Denied</div></div>
          <div className="rl-hud-tile"><div className="val">{((snapshot?.simClockMillis ?? 0) / 1000).toFixed(0)}s</div><div className="lbl">Sim Clock</div></div>
        </div>
      </div>

      <button className="rl-btn" onClick={runStep} disabled={step >= STEPS.length - 1 && snapshot}>
        {step === 0 ? 'Start Simulation' : step >= STEPS.length - 1 ? 'Done' : 'Next Step →'}
      </button>

      <div className="rl-log" style={{ marginTop: 16 }}>
        {(snapshot?.events ?? []).slice().reverse().map((e) => (
          <div key={e.id} className={`rl-log-line ${e.status}`}>[{e.eventType}] {e.title} — {e.description}</div>
        ))}
      </div>
    </div>
  );
}

export default function RateLimiterPage() {
  return (
    <LldPage module="rate-limiter" title="Rate Limiter" icon="🚧" tabs={['app', 'simulation', 'diagram', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'app' && <AppTab />}
          {activeTab === 'simulation' && <SimulationTab />}
        </>
      )}
    </LldPage>
  );
}
