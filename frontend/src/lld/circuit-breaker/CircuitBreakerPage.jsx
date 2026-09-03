import { useState } from 'react';
import LldPage from '../../components/LldPage';
import { usePolling } from '../../hooks/usePolling';
import {
  listServices, callService, resetService,
  simReset, simCall, simAdvanceClock, simGetSnapshot,
} from './api';

const CSS = `
.cb-container { display: flex; flex-direction: column; gap: 16px; }
.cb-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
.cb-card { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 16px; }
.cb-card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.cb-name { font-weight: 700; font-size: 14px; color: var(--text-primary); }
.cb-pill { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.03em; }
.cb-pill.closed { background: var(--success-bg); color: var(--success); }
.cb-pill.open { background: var(--danger-bg); color: var(--danger); }
.cb-pill.half_open { background: var(--warning-bg); color: var(--warning); }
.cb-stat-row { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted); padding: 3px 0; }
.cb-stat-row b { color: var(--text-primary); }
.cb-policy { font-size: 11px; color: var(--text-muted); font-style: italic; margin: 8px 0; }
.cb-btns { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
.cb-btn { padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-primary); }
.cb-btn.success { border-color: var(--success); color: var(--success); }
.cb-btn.danger { border-color: var(--danger); color: var(--danger); }
.cb-btn:hover { opacity: 0.85; }
.cb-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.cb-error { padding: 8px 12px; background: var(--danger-bg); color: var(--danger); border-radius: 8px; font-size: 12px; font-weight: 600; margin-top: 8px; }

.cb-sim-stage { background: var(--bg-secondary); border: 2px solid var(--border-primary); border-radius: 12px; padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 16px; }
.cb-flow { display: flex; align-items: center; gap: 16px; }
.cb-node { display: flex; flex-direction: column; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); font-weight: 600; }
.cb-icon-box { width: 64px; height: 64px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 28px; background: var(--bg-tertiary); border: 2px solid var(--border-primary); transition: all 0.3s; }
.cb-icon-box.gauge.closed { border-color: var(--success); box-shadow: 0 0 16px var(--success-bg); }
.cb-icon-box.gauge.open { border-color: var(--danger); box-shadow: 0 0 16px var(--danger-bg); }
.cb-icon-box.gauge.half_open { border-color: var(--warning); box-shadow: 0 0 16px var(--warning-bg); animation: cb-pulse 1s infinite; }
@keyframes cb-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
.cb-arrow { font-size: 22px; color: var(--text-muted); }
.cb-arrow.blocked { color: var(--danger); }
.cb-cooldown-bar { width: 100%; max-width: 320px; height: 8px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden; }
.cb-cooldown-fill { height: 100%; background: var(--warning); transition: width 0.3s; }

.cb-step-indicator { display: flex; gap: 6px; justify-content: center; }
.cb-step-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--border-primary); }
.cb-step-dot.done { background: var(--success); }
.cb-step-dot.active { background: var(--accent); transform: scale(1.3); }

.cb-log { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 12px; font-family: var(--code-font); font-size: 11px; max-height: 220px; overflow-y: auto; width: 100%; }
.cb-log-row { padding: 3px 0; border-bottom: 1px dashed var(--border-secondary); color: var(--text-muted); }
.cb-log-row:last-child { border-bottom: none; }
.cb-log-row.SUCCESS { color: var(--success); }
.cb-log-row.WARNING { color: var(--warning); }
.cb-log-row.ERROR { color: var(--danger); }
`;

const PHASE_ICON = { CLOSED: '✅', OPEN: '⛔', HALF_OPEN: '🟡' };

function ServiceCard({ breaker, onCall, onReset, busy }) {
  const phase = breaker.phase;
  return (
    <div className="cb-card">
      <div className="cb-card-head">
        <span className="cb-name">{breaker.name}</span>
        <span className={`cb-pill ${phase.toLowerCase()}`}>{PHASE_ICON[phase]} {phase}</span>
      </div>
      <div className="cb-policy">Trips on: {breaker.tripPolicy?.describe ? breaker.tripPolicy.describe() : `${breaker.tripPolicy?.threshold ?? '?'} consecutive failures`}</div>
      <div className="cb-stat-row"><span>Consecutive failures</span><b>{breaker.consecutiveFailures}</b></div>
      <div className="cb-stat-row"><span>Failure rate (window)</span><b>{(breaker.failureRate * 100).toFixed(0)}%</b></div>
      <div className="cb-stat-row"><span>Total calls / rejected</span><b>{breaker.totalCalls} / {breaker.totalRejections}</b></div>
      {phase === 'OPEN' && (
        <div className="cb-stat-row"><span>Cooldown remaining</span><b>{Math.ceil(breaker.remainingCooldownMillis / 1000)}s</b></div>
      )}
      <div className="cb-btns">
        <button className="cb-btn success" disabled={busy} onClick={() => onCall(breaker.name, true)}>✓ Simulate Success</button>
        <button className="cb-btn danger" disabled={busy} onClick={() => onCall(breaker.name, false)}>✗ Simulate Failure</button>
        <button className="cb-btn" disabled={busy} onClick={() => onReset(breaker.name)}>↺ Reset</button>
      </div>
    </div>
  );
}

function ServicesTab() {
  const [services, setServices] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const data = await listServices();
      setServices(data);
    } catch (err) {
      setError(err.message || 'Failed to load services');
    }
  };

  usePolling(load, 3000, []);

  const handleCall = async (name, simulateSuccess) => {
    setBusy(true);
    setError(null);
    try {
      await callService(name, simulateSuccess);
    } catch (err) {
      setError(`${name}: ${err.message || 'call failed'}`);
    } finally {
      setBusy(false);
      load();
    }
  };

  const handleReset = async (name) => {
    setBusy(true);
    try {
      await resetService(name);
    } catch (err) {
      setError(err.message || 'reset failed');
    } finally {
      setBusy(false);
      load();
    }
  };

  return (
    <div className="cb-container">
      {error && <div className="cb-error">⚠ {error}</div>}
      <div className="cb-grid">
        {services.map((s) => (
          <ServiceCard key={s.name} breaker={s} onCall={handleCall} onReset={handleReset} busy={busy} />
        ))}
      </div>
      {services.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>⏳ Loading services…</div>
      )}
    </div>
  );
}

const SIM_STEPS = [
  { title: 'Cold Boot', detail: 'Register "payment-gateway" — CLOSED, trips after 3 consecutive failures, 5s cooldown.' },
  { title: 'Failing Call #1', detail: 'Send a simulated failure. Breaker stays CLOSED — 1 consecutive failure.' },
  { title: 'Failing Call #2', detail: 'Send a second simulated failure. Still CLOSED — 2 consecutive failures.' },
  { title: 'Failing Call #3 — Trips OPEN', detail: 'The TripPolicy fires: 3 consecutive failures reached. Breaker moves to OPEN.' },
  { title: 'Rejected Call', detail: 'A call attempted while OPEN is rejected immediately — no downstream ever attempted.' },
  { title: 'Cooldown Elapses → Half-Open Trial Fails', detail: 'Jump the clock past the 5s cooldown, then send a failing trial call. HALF_OPEN reopens the circuit.' },
  { title: 'Cooldown Elapses Again → Half-Open Trial Succeeds', detail: 'Jump the clock again, then send a succeeding trial call. HALF_OPEN closes the circuit.' },
  { title: 'Recovered', detail: 'Review the full CLOSED → OPEN → HALF_OPEN → OPEN → HALF_OPEN → CLOSED journey in the event log.' },
];

function SimulationTab() {
  const [step, setStep] = useState(0);
  const [breaker, setBreaker] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const applySnapshot = (snapshot) => {
    setBreaker(snapshot.breaker);
    setEvents(snapshot.events);
  };

  const runStep = async () => {
    setBusy(true);
    setError(null);
    try {
      let snapshot;
      if (step === 0) {
        snapshot = await simReset();
      } else if (step === 1) {
        snapshot = await simCall(false, 2);
      } else if (step === 2) {
        snapshot = await simCall(false, 3);
      } else if (step === 3) {
        snapshot = await simCall(false, 4);
      } else if (step === 4) {
        snapshot = await simCall(true, 5);
      } else if (step === 5) {
        await simAdvanceClock(5000, 6);
        snapshot = await simCall(false, 6);
      } else if (step === 6) {
        await simAdvanceClock(5000, 7);
        snapshot = await simCall(true, 7);
      } else {
        snapshot = await simGetSnapshot();
      }
      applySnapshot(snapshot);
      setStep((s) => Math.min(s + 1, SIM_STEPS.length));
    } catch (err) {
      // Step 4's rejected call throws by design — still refresh state so the UI shows OPEN.
      setError(err.message || 'Step failed');
      try {
        applySnapshot(await simGetSnapshot());
      } catch { /* ignore */ }
      setStep((s) => Math.min(s + 1, SIM_STEPS.length));
    } finally {
      setBusy(false);
    }
  };

  const phase = breaker?.phase || 'CLOSED';
  const cooldownPct = breaker && breaker.cooldownMillis
    ? Math.max(0, 100 - (breaker.remainingCooldownMillis / breaker.cooldownMillis) * 100)
    : 0;

  return (
    <div className="cb-container">
      <style>{CSS}</style>
      <div className="cb-sim-stage">
        <div className="cb-flow">
          <div className="cb-node">
            <div className="cb-icon-box">📞</div>
            Caller
          </div>
          <span className={`cb-arrow ${phase === 'OPEN' ? 'blocked' : ''}`}>{phase === 'OPEN' ? '⛔' : '→'}</span>
          <div className="cb-node">
            <div className={`cb-icon-box gauge ${phase.toLowerCase()}`}>{PHASE_ICON[phase]}</div>
            {phase}
          </div>
          <span className={`cb-arrow ${phase === 'OPEN' ? 'blocked' : ''}`}>{phase === 'OPEN' ? '⛔' : '→'}</span>
          <div className="cb-node">
            <div className="cb-icon-box">🗄️</div>
            payment-gateway
          </div>
        </div>

        {phase === 'OPEN' && breaker && (
          <div className="cb-cooldown-bar">
            <div className="cb-cooldown-fill" style={{ width: `${cooldownPct}%` }} />
          </div>
        )}

        {breaker && (
          <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--text-muted)' }}>
            <span>Consecutive failures: <b style={{ color: 'var(--text-primary)' }}>{breaker.consecutiveFailures}</b></span>
            <span>Total calls: <b style={{ color: 'var(--text-primary)' }}>{breaker.totalCalls}</b></span>
            <span>Rejected: <b style={{ color: 'var(--text-primary)' }}>{breaker.totalRejections}</b></span>
          </div>
        )}

        <div className="cb-step-indicator">
          {SIM_STEPS.map((_, i) => (
            <div key={i} className={`cb-step-dot ${i < step ? 'done' : i === step ? 'active' : ''}`} />
          ))}
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
            {step < SIM_STEPS.length ? `Step ${step + 1}/${SIM_STEPS.length}: ${SIM_STEPS[step].title}` : 'Demo Complete'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, maxWidth: 480 }}>
            {step < SIM_STEPS.length ? SIM_STEPS[step].detail : 'Click Reset to run the demo again.'}
          </div>
        </div>

        {error && <div className="cb-error">⚠ {error}</div>}

        <button
          className="cb-btn success"
          disabled={busy}
          onClick={step >= SIM_STEPS.length ? () => { setStep(0); setBreaker(null); setEvents([]); setError(null); } : runStep}
        >
          {step >= SIM_STEPS.length ? '↺ Run Again' : busy ? 'Working…' : `▶ ${SIM_STEPS[step]?.title || 'Run Step'}`}
        </button>

        <div className="cb-log">
          {events.length === 0 ? (
            <div style={{ color: 'var(--text-muted)' }}>Click the button above to start.</div>
          ) : (
            [...events].reverse().map((e) => (
              <div key={e.id} className={`cb-log-row ${e.status}`}>
                [{e.eventType}] {e.title} — {e.description}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function CircuitBreakerPage() {
  return (
    <LldPage
      module="circuit-breaker"
      title="Circuit Breaker"
      icon="🔌"
      tabs={[{ id: 'services', label: 'Services' }, 'simulation', 'diagram', 'sequence', 'design']}
    >
      {(activeTab) => (
        <>
          {activeTab === 'services' && <ServicesTab />}
          {activeTab === 'simulation' && <SimulationTab />}
        </>
      )}
    </LldPage>
  );
}
