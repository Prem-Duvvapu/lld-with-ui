import { useState, useEffect, useRef } from 'react';
import LldPage from '../../components/LldPage';
import { usePolling } from '../../hooks/usePolling';
import {
  getElevators, getRequests, requestElevator,
  getDispatchPolicy, setDispatchPolicy,
  simReset, simRequest, simStep, simMaintenance,
} from './api';

const styles = `
.el-page { max-width: 900px; margin: 0 auto; }
.el-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
.el-toolbar-stat { font-size: 12px; color: var(--text-secondary); }
.el-policy { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.el-policy select { padding: 5px 8px; border-radius: 6px; border: 1px solid var(--border-primary); background: var(--bg-primary); color: var(--text-primary); font-size: 12px; font-weight: 600; }

.el-building { background: var(--bg-card, #fff); border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden; border: 1px solid var(--border-primary); }
.el-building-header { background: #1a1a2e; color: #fff; padding: 12px 20px; font-weight: 700; font-size: 15px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 6px; }
.el-floor-row { display: flex; align-items: center; min-height: 52px; border-bottom: 1px solid var(--border-primary); padding: 0 12px; transition: background 0.2s; }
.el-floor-row:last-child { border-bottom: none; }
.el-floor-row.arrived { background: rgba(76,175,80,0.08); }
.el-floor-num { width: 46px; font-weight: 700; font-size: 14px; color: var(--text-primary); }
.el-floor-buttons { width: 56px; display: flex; gap: 4px; }
.el-floor-btn { width: 26px; height: 26px; border: none; border-radius: 50%; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 700; transition: transform 0.15s; }
.el-floor-btn:hover { transform: scale(1.15); }
.el-floor-btn:disabled { opacity: 0.3; cursor: not-allowed; transform: none; }
.el-floor-btn-up { background: #4caf50; color: #fff; }
.el-floor-btn-down { background: #ff9800; color: #fff; }
.el-shafts { flex: 1; display: flex; gap: 6px; justify-content: center; position: relative; height: 52px; }
.el-shaft { width: 56px; position: relative; border-left: 1px solid var(--border-primary); border-right: 1px solid var(--border-primary); background: rgba(128,128,128,0.04); }
.el-car { position: absolute; left: 3px; right: 3px; height: 26px; top: 50%; transform: translateY(-50%); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 9px; font-weight: 700; z-index: 2; box-shadow: 0 2px 6px rgba(0,0,0,0.3); overflow: hidden; }
.el-car.idle { background: linear-gradient(135deg, #667eea, #5568d3); }
.el-car.moving { background: linear-gradient(135deg, #f093fb, #f5576c); }
.el-car.door-open { background: linear-gradient(135deg, #4caf50, #2e9c44); }
.el-car.maintenance { background: linear-gradient(135deg, #888, #555); }
.el-car .door-l, .el-car .door-r { position: absolute; top: 0; width: 50%; height: 100%; background: rgba(0,0,0,0.35); transition: transform 0.3s; }
.el-car .door-l { left: 0; }
.el-car .door-r { right: 0; }
.el-car.door-open .door-l { transform: translateX(-100%); }
.el-car.door-open .door-r { transform: translateX(100%); }
.el-load-bar { position: absolute; bottom: 0; left: 0; height: 3px; background: rgba(0,0,0,0.2); width: 100%; }
.el-load-fill { height: 100%; background: #fff; opacity: 0.8; }

.el-panel-grid { display: flex; gap: 16px; margin-top: 14px; flex-wrap: wrap; }
.el-panel { flex: 1; min-width: 220px; background: var(--bg-card, #fff); border-radius: 12px; padding: 14px 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border: 1px solid var(--border-primary); }
.el-panel h3 { font-size: 13px; color: var(--text-primary); margin-bottom: 10px; }
.el-car-row { display: flex; flex-direction: column; gap: 6px; }
.el-car-item { background: var(--bg-primary); border-radius: 8px; padding: 8px 10px; border: 1px solid var(--border-primary); }
.el-car-item-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.el-car-name { font-weight: 700; font-size: 12px; }
.el-badge { font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; }
.el-badge.idle { background: #e0e0e0; color: #555; }
.el-badge.moving { background: #ffe0e8; color: #c2185b; }
.el-badge.door-open { background: #d7f5db; color: #1b7a30; }
.el-badge.out-of-order { background: #eee; color: #999; }
.el-car-details { display: flex; gap: 10px; font-size: 10.5px; color: var(--text-secondary); }
.el-req-list { max-height: 160px; overflow-y: auto; }
.el-req-item { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 11.5px; border-bottom: 1px dashed var(--border-primary); color: var(--text-secondary); }
.el-req-item:last-child { border-bottom: none; }
.el-req-status { margin-left: auto; font-size: 9px; font-weight: 700; padding: 1px 6px; border-radius: 4px; background: #e3f2fd; color: #1565c0; }
.el-empty { color: var(--text-muted, #999); font-size: 12px; font-style: italic; }

.el-step-indicator { display: flex; gap: 4px; justify-content: center; margin-bottom: 12px; flex-wrap: wrap; }
.el-step-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--border-primary); transition: all 0.3s; }
.el-step-dot.active { background: var(--accent, #667eea); box-shadow: 0 0 8px rgba(102,126,234,0.5); }
.el-step-dot.done { background: #3fb950; }
.el-hud { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px; margin: 12px 0; }
.el-hud-tile { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 8px 10px; text-align: center; }
.el-hud-tile .v { font-size: 15px; font-weight: 800; color: var(--text-primary); }
.el-hud-tile .l { font-size: 9.5px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
.el-log { max-height: 170px; overflow-y: auto; background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 8px 10px; font-size: 11.5px; margin-top: 10px; }
.el-log-row { padding: 4px 0; border-bottom: 1px dashed var(--border-primary); color: var(--text-secondary); }
.el-log-row:last-child { border-bottom: none; color: var(--text-primary); font-weight: 600; }
.el-actions { display: flex; gap: 8px; justify-content: center; margin-top: 14px; flex-wrap: wrap; }
.el-btn { padding: 9px 20px; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; color: #fff; background: var(--accent, #667eea); transition: all 0.2s; }
.el-btn:hover { opacity: 0.92; transform: translateY(-1px); }
.el-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.el-btn-outline { padding: 8px 16px; border: 2px solid var(--border-primary); border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; background: transparent; color: var(--text-primary); }
.el-btn-outline:hover { border-color: var(--accent); color: var(--accent); }
.el-btn-danger { background: #d64545; }
.el-error { text-align: center; padding: 8px 12px; margin: 8px 0; font-size: 12.5px; color: #fff; background: #d64545; border-radius: 6px; }
.el-intro { text-align: center; padding: 24px 12px; color: var(--text-secondary); font-size: 13px; }
.el-intro code { background: var(--bg-primary); padding: 1px 5px; border-radius: 4px; }
.el-form-row { display: flex; gap: 8px; justify-content: center; align-items: center; margin: 10px 0; flex-wrap: wrap; }
.el-form-row select { padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border-primary); background: var(--bg-primary); color: var(--text-primary); font-size: 12.5px; }
`;

const TOTAL_FLOORS = 10;
const FLOOR_HEIGHT = 52;

const STATUS_LABEL = { IDLE: 'idle', MOVING: 'moving', DOOR_OPEN: 'door-open', STOPPED: 'idle', OUT_OF_ORDER: 'out-of-order' };
const CAR_CLASS = { IDLE: 'idle', MOVING: 'moving', DOOR_OPEN: 'door-open', STOPPED: 'idle', OUT_OF_ORDER: 'maintenance' };

function directionArrow(direction) {
  if (direction === 'UP') return '▲';
  if (direction === 'DOWN') return '▼';
  return '—';
}

/** Shared shaft/car visualization for both the live building and the isolated simulation — cars
 * are absolutely positioned by floor so they can smoothly slide between floor rows, with a real
 * door-open animation driven entirely by the backend's ElevatorStatus (no client-side guessing). */
function ShaftOverlay({ elevators, floors = TOTAL_FLOORS }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', position: 'relative', height: floors * FLOOR_HEIGHT }}>
      {elevators.map((el) => {
        const bottom = (el.currentFloor - 1) * FLOOR_HEIGHT;
        const cls = CAR_CLASS[el.status] || 'idle';
        const pct = el.capacity > 0 ? Math.min(100, (el.currentLoad ?? el.occupancy ?? 0) / el.capacity * 100) : 0;
        return (
          <div key={el.id} style={{ width: 56, position: 'relative', height: '100%' }}>
            <div
              className={`el-car ${cls}`}
              style={{ bottom, transition: 'bottom 0.8s cubic-bezier(0.4,0,0.2,1)' }}
              title={`${el.name} — F${el.currentFloor} — ${el.status}`}
            >
              <span style={{ position: 'relative', zIndex: 3 }}>{el.name?.split(' ')[0] || el.name}</span>
              <div className="door-l" />
              <div className="door-r" />
              <div className="el-load-bar"><div className="el-load-fill" style={{ width: `${pct}%` }} /></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ElevatorCard({ el }) {
  const badge = STATUS_LABEL[el.status] || 'idle';
  return (
    <div className="el-car-item">
      <div className="el-car-item-h">
        <span className="el-car-name">{el.name}</span>
        <span className={`el-badge ${badge}`}>{el.status}</span>
      </div>
      <div className="el-car-details">
        <span>F{el.currentFloor}</span>
        <span>{directionArrow(el.direction)} {el.direction}</span>
        <span>Load {el.currentLoad ?? el.occupancy}/{el.capacity}</span>
      </div>
    </div>
  );
}

function AppTab() {
  const [elevators, setElevators] = useState([]);
  const [requests, setRequests] = useState([]);
  const [policy, setPolicy] = useState('LOOK_SCAN');
  const [error, setError] = useState('');

  usePolling(async () => {
    try { const data = await getElevators(); if (Array.isArray(data)) setElevators(data); } catch { /* retry next tick */ }
  }, 1000, []);

  usePolling(async () => {
    try { const data = await getRequests(); if (Array.isArray(data)) setRequests(data); } catch { /* retry next tick */ }
  }, 2000, []);

  useEffect(() => {
    getDispatchPolicy().then((d) => { if (d?.policy) setPolicy(d.policy); }).catch(() => {});
  }, []);

  const handleCall = async (from, to) => {
    setError('');
    try { await requestElevator(from, to); }
    catch (e) { setError(e.message || 'Failed to request elevator'); }
  };

  const handlePolicyChange = async (next) => {
    setPolicy(next);
    try { await setDispatchPolicy(next); }
    catch (e) { setError(e.message || 'Failed to switch dispatch policy'); }
  };

  const floors = Array.from({ length: TOTAL_FLOORS }, (_, i) => TOTAL_FLOORS - i);

  return (
    <div>
      <div className="el-toolbar">
        <span className="el-toolbar-stat">Live elevator bank &middot; polls every 1s</span>
        <div className="el-policy">
          <span>Dispatch policy:</span>
          <select value={policy} onChange={(e) => handlePolicyChange(e.target.value)}>
            <option value="LOOK_SCAN">LOOK / SCAN</option>
            <option value="NEAREST_CAR">Nearest Car</option>
          </select>
        </div>
      </div>

      {error && <div className="el-error">{error}</div>}

      <div className="el-building" style={{ position: 'relative' }}>
        <div className="el-building-header">
          <span>Building Status</span>
          <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.9 }}>
            {elevators.length} cars &middot; {elevators.filter((e) => e.status === 'MOVING').length} moving &middot;{' '}
            {elevators.filter((e) => e.status === 'DOOR_OPEN').length} doors open
          </span>
        </div>
        <div style={{ display: 'flex' }}>
          <div style={{ width: 220 }}>
            {floors.map((floor) => (
              <div key={floor} className="el-floor-row" style={{ height: FLOOR_HEIGHT, minHeight: FLOOR_HEIGHT }}>
                <div className="el-floor-num">F{floor}</div>
                <div className="el-floor-buttons">
                  {floor < TOTAL_FLOORS && (
                    <button className="el-floor-btn el-floor-btn-up" onClick={() => handleCall(floor, floor + 1)} title={`Call up from F${floor}`}>&#9650;</button>
                  )}
                  {floor > 1 && (
                    <button className="el-floor-btn el-floor-btn-down" onClick={() => handleCall(floor, floor - 1)} title={`Call down from F${floor}`}>&#9660;</button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div style={{ flex: 1, padding: '0 12px' }}>
            <ShaftOverlay elevators={elevators} />
          </div>
        </div>
      </div>

      <div className="el-panel-grid">
        <div className="el-panel">
          <h3>Elevator Status</h3>
          <div className="el-car-row">
            {elevators.length === 0 && <div className="el-empty">No elevators available.</div>}
            {elevators.map((el) => <ElevatorCard key={el.id} el={el} />)}
          </div>
        </div>
        <div className="el-panel">
          <h3>Recent Requests</h3>
          <div className="el-req-list">
            {requests.length === 0 && <div className="el-empty">No requests yet.</div>}
            {requests.slice().reverse().slice(0, 12).map((req, idx) => (
              <div className="el-req-item" key={req.id || idx}>
                <span>F{req.sourceFloor} &rarr; F{req.destinationFloor}</span>
                <span className="el-req-status">{req.status || 'PENDING'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const SIM_STEPS = [
  'Reset sandbox',
  'View seeded fleet',
  'Call an elevator',
  'Step toward pickup',
  'Doors open at pickup',
  'Step toward destination',
  'Take a car offline (reassignment)',
  'Review telemetry & event log',
];

function SimulationTab() {
  const [snapshot, setSnapshot] = useState(null); // { elevators: {id: snapshot}, events, pendingRequests }
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [source, setSource] = useState(1);
  const [destination, setDestination] = useState(6);
  const [assignedId, setAssignedId] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const elevatorsList = snapshot ? Object.values(snapshot.elevators || {}) : [];
  const events = snapshot?.events || [];
  const assigned = assignedId != null ? elevatorsList.find((e) => e.id === assignedId) : null;

  const applyResult = (result, advanceHint) => {
    if (!mountedRef.current) return;
    if (result?.error) { setError(result.error); return; }
    setSnapshot(result);
    if (advanceHint) setStep((s) => Math.min(SIM_STEPS.length - 1, Math.max(s, advanceHint)));
  };

  const withBusy = async (fn) => {
    setBusy(true); setError('');
    try { await fn(); } finally { if (mountedRef.current) setBusy(false); }
  };

  const doReset = () => withBusy(async () => {
    const result = await simReset();
    setAssignedId(null);
    applyResult(result, 1);
  });

  const advanceStepFromCarState = (car) => {
    if (!car) return;
    if (car.currentFloor === destination && car.state === 'DOOR_OPEN') setStep((s) => Math.max(s, 5));
    else if (car.currentFloor === source && car.state === 'DOOR_OPEN') setStep((s) => Math.max(s, 4));
    else setStep((s) => Math.max(s, 3));
  };

  const doCall = () => withBusy(async () => {
    if (source === destination) { setError('Source and destination floors must differ'); return; }
    const result = await simRequest(source, destination);
    let newAssignedId = null;
    if (!result?.error) {
      const lastEvent = result.events?.[result.events.length - 1];
      newAssignedId = lastEvent?.data?.assignedElevatorId ?? null;
      if (newAssignedId != null) setAssignedId(newAssignedId);
    }
    applyResult(result, 2);
    if (newAssignedId != null) advanceStepFromCarState(result.elevators?.[newAssignedId]);
  });

  const doStep = () => withBusy(async () => {
    const result = await simStep();
    applyResult(result);
    if (!result?.error && assignedId != null) {
      advanceStepFromCarState(result.elevators?.[assignedId]);
    }
  });

  const doMaintenance = (elevatorId, maintenance) => withBusy(async () => {
    const result = await simMaintenance(elevatorId, maintenance);
    applyResult(result, 6);
  });

  const reset = () => { setSnapshot(null); setStep(0); setError(''); setAssignedId(null); };

  const finalStep = () => setStep(7);

  return (
    <div>
      <div className="el-step-indicator">
        {SIM_STEPS.map((s, i) => (
          <div key={s} className={`el-step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} title={s} />
        ))}
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 8 }}>{SIM_STEPS[step]}</span>
      </div>

      {error && <div className="el-error">{error}</div>}

      {!snapshot ? (
        <div className="el-intro">
          <p>
            Runs entirely against the isolated <code>/api/elevator/sim/*</code> sandbox — 4 seeded cars
            (E1@F1, E2@F5, E3@F8, E4@F10 in MAINTENANCE) — so nothing here can ever touch the real
            elevator bank.
          </p>
          <div className="el-actions">
            <button className="el-btn" onClick={doReset} disabled={busy}>&#9654; Reset Sandbox</button>
          </div>
        </div>
      ) : (
        <>
          <div className="el-hud">
            <div className="el-hud-tile"><div className="v">{elevatorsList.filter((e) => e.state !== 'MAINTENANCE').length}/{elevatorsList.length}</div><div className="l">Cars In Service</div></div>
            <div className="el-hud-tile"><div className="v">{elevatorsList.filter((e) => e.state === 'MOVING_UP' || e.state === 'MOVING_DOWN').length}</div><div className="l">Moving</div></div>
            <div className="el-hud-tile"><div className="v">{snapshot.pendingRequests?.length ?? 0}</div><div className="l">Queued Calls</div></div>
            <div className="el-hud-tile"><div className="v">{assigned ? `F${assigned.currentFloor}` : '—'}</div><div className="l">Tracked Car</div></div>
            <div className="el-hud-tile"><div className="v">{events.length}</div><div className="l">Events Logged</div></div>
          </div>

          <div className="el-building">
            <div className="el-building-header">
              <span>Simulation Sandbox</span>
              <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.9 }}>
                Tracking: {assigned ? assigned.name : 'no active call yet'}
              </span>
            </div>
            <div style={{ padding: '12px 16px' }}>
              <ShaftOverlay elevators={elevatorsList.map((e) => ({
                id: e.id, name: e.name, currentFloor: e.currentFloor,
                status: e.state === 'MOVING_UP' || e.state === 'MOVING_DOWN' ? 'MOVING'
                  : e.state === 'DOOR_OPEN' ? 'DOOR_OPEN'
                  : e.state === 'MAINTENANCE' ? 'OUT_OF_ORDER' : 'STOPPED',
                direction: e.direction, capacity: e.capacity, currentLoad: e.occupancy,
              }))} />
            </div>
          </div>

          {step <= 2 && (
            <div className="el-form-row">
              <label>From F</label>
              <select value={source} onChange={(e) => setSource(Number(e.target.value))}>
                {Array.from({ length: TOTAL_FLOORS }, (_, i) => i + 1).map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <label>to F</label>
              <select value={destination} onChange={(e) => setDestination(Number(e.target.value))}>
                {Array.from({ length: TOTAL_FLOORS }, (_, i) => i + 1).map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <button className="el-btn" onClick={doCall} disabled={busy}>&#128222; Call Elevator</button>
            </div>
          )}

          <div className="el-panel-grid">
            <div className="el-panel">
              <h3>Fleet</h3>
              <div className="el-car-row">
                {elevatorsList.map((e) => (
                  <div className="el-car-item" key={e.id}>
                    <div className="el-car-item-h">
                      <span className="el-car-name">{e.name}</span>
                      <span className={`el-badge ${STATUS_LABEL[e.state === 'MAINTENANCE' ? 'OUT_OF_ORDER' : (e.state === 'MOVING_UP' || e.state === 'MOVING_DOWN') ? 'MOVING' : e.state] || 'idle'}`}>{e.state}</span>
                    </div>
                    <div className="el-car-details">
                      <span>F{e.currentFloor}</span>
                      <span>{directionArrow(e.direction)} {e.direction}</span>
                      <span>Load {e.occupancy}/{e.capacity}</span>
                    </div>
                    {step >= 5 && e.state !== 'MAINTENANCE' && (
                      <button className="el-btn-outline" style={{ marginTop: 6, fontSize: 10, padding: '4px 10px' }}
                        onClick={() => doMaintenance(e.id, true)} disabled={busy}>
                        Take offline
                      </button>
                    )}
                    {e.state === 'MAINTENANCE' && (
                      <button className="el-btn-outline" style={{ marginTop: 6, fontSize: 10, padding: '4px 10px' }}
                        onClick={() => doMaintenance(e.id, false)} disabled={busy}>
                        Return to service
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="el-panel">
              <h3>Event Log</h3>
              <div className="el-log">
                {events.slice().reverse().slice(0, 30).map((ev) => (
                  <div key={ev.id} className="el-log-row">
                    <strong>{ev.actorName}</strong>: {ev.description}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="el-actions">
            {step >= 2 && step < 6 && assignedId != null && (
              <button className="el-btn" onClick={doStep} disabled={busy}>{busy ? 'Stepping…' : '⏭ Step Simulation'}</button>
            )}
            {step >= 6 && step < 7 && (
              <button className="el-btn-outline" onClick={finalStep} disabled={busy}>Review Telemetry &rarr;</button>
            )}
            <button className="el-btn-outline" onClick={doReset} disabled={busy}>&#8635; Reset</button>
            <button className="el-btn-outline" onClick={reset} disabled={busy}>Exit Sandbox</button>
          </div>
        </>
      )}
    </div>
  );
}

export default function ElevatorPage() {
  return (
    <LldPage module="elevator" title="Elevator Control System" icon="🛗" tabs={['app', 'simulation', 'diagram', 'sequence', 'design']}>
      {(activeTab) => (
        <div className="el-page">
          <style>{styles}</style>
          {activeTab === 'app' && <AppTab />}
          {activeTab === 'simulation' && <SimulationTab />}
        </div>
      )}
    </LldPage>
  );
}
