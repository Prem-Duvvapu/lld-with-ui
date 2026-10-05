import { useState } from 'react';
import CircuitBreakerSimulation from './CircuitBreakerSimulation';
import LldPage from '../../components/LldPage';
import { usePolling } from '../../hooks/usePolling';
import {
  listServices, callService, resetService,
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
.cb-loading { text-align: center; padding: 40px; color: var(--text-muted); }
.cb-danger-text { color: var(--danger) !important; }
.cb-open-hint { font-size: 11px; color: var(--danger); margin-top: 8px; }

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
      <div className="cb-stat-row">
        <span>Total calls / rejected</span>
        <b className={breaker.totalRejections > 0 ? 'cb-danger-text' : ''}>{breaker.totalCalls} / {breaker.totalRejections}</b>
      </div>
      {phase === 'OPEN' && (
        <div className="cb-stat-row"><span>Cooldown remaining</span><b>{Math.ceil(breaker.remainingCooldownMillis / 1000)}s</b></div>
      )}
      <div className="cb-btns">
        <button className="cb-btn success" disabled={busy} onClick={() => onCall(breaker.name, true)}>✓ Simulate Success</button>
        <button className="cb-btn danger" disabled={busy} onClick={() => onCall(breaker.name, false)}>✗ Simulate Failure</button>
        <button className="cb-btn" disabled={busy} onClick={() => onReset(breaker.name)}>↺ Reset</button>
      </div>
      {phase === 'OPEN' && (
        <div className="cb-open-hint">⛔ Circuit is open — calls below will be rejected immediately until the cooldown ends.</div>
      )}
    </div>
  );
}

function ServicesTab() {
  const [services, setServices] = useState([]);
  const [error, setError] = useState(null);
  // Keyed by service name so a call in flight for one breaker doesn't
  // disable the buttons on every other card in the grid.
  const [busyNames, setBusyNames] = useState(() => new Set());

  const load = async () => {
    try {
      const data = await listServices();
      setServices(data);
    } catch (err) {
      setError(err.message || 'Failed to load services');
    }
  };

  usePolling(load, 3000, []);

  const setNameBusy = (name, isBusy) => {
    setBusyNames((prev) => {
      const next = new Set(prev);
      if (isBusy) next.add(name);
      else next.delete(name);
      return next;
    });
  };

  const handleCall = async (name, simulateSuccess) => {
    setNameBusy(name, true);
    setError(null);
    try {
      await callService(name, simulateSuccess);
    } catch (err) {
      setError(`${name}: ${err.message || 'call failed'}`);
    } finally {
      setNameBusy(name, false);
      load();
    }
  };

  const handleReset = async (name) => {
    setNameBusy(name, true);
    setError(null);
    try {
      await resetService(name);
    } catch (err) {
      setError(`${name}: ${err.message || 'reset failed'}`);
    } finally {
      setNameBusy(name, false);
      load();
    }
  };

  return (
    <div className="cb-container">
      <style>{CSS}</style>
      {error && <div role="alert" className="cb-error">⚠ {error}</div>}
      <div className="cb-grid">
        {services.map((s) => (
          <ServiceCard key={s.name} breaker={s} onCall={handleCall} onReset={handleReset} busy={busyNames.has(s.name)} />
        ))}
      </div>
      {services.length === 0 && !error && (
        <div className="cb-loading">⏳ Loading services…</div>
      )}
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
          {activeTab === 'simulation' && <CircuitBreakerSimulation />}
        </>
      )}
    </LldPage>
  );
}
