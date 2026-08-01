import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getElevators, getRequests, requestElevator, tick } from './api';
import ClassDiagram from '../../components/ClassDiagram';
import DesignDetails from '../../components/DesignDetails';

const styles = `
.app { max-width: 800px; margin: 0 auto; }
.header { background: #1a1a2e; color: white; padding: 20px 30px; border-radius: 12px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
.header h1 { font-size: 22px; font-weight: 600; }
.header p { font-size: 13px; opacity: 0.7; }
.building {
  background: white; border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden;
  border: 2px solid #ddd;
}
.building-header {
  background: #1a1a2e; color: white; padding: 12px 20px;
  font-weight: 700; font-size: 16px; display: flex; justify-content: space-between;
}
.floor-row {
  display: flex; align-items: center; height: 64px;
  border-bottom: 1px solid #eee; padding: 0 12px;
  transition: background 0.2s;
}
.floor-row:last-child { border-bottom: none; }
.floor-row:hover { background: #f8f9ff; }
.floor-num {
  width: 50px; font-weight: 700; font-size: 16px; color: #333;
}
.floor-buttons {
  width: 60px; display: flex; gap: 4px;
}
.floor-btn {
  width: 28px; height: 28px; border: none; border-radius: 50%;
  font-size: 12px; cursor: pointer; display: flex;
  align-items: center; justify-content: center;
  transition: all 0.15s; font-weight: 700;
}
.floor-btn:hover { transform: scale(1.15); }
.floor-btn-up { background: #4caf50; color: white; }
.floor-btn-down { background: #ff9800; color: white; }
.floor-btn:disabled { opacity: 0.3; cursor: not-allowed; transform: none; }
.shafts-area {
  flex: 1; display: flex; gap: 8px; justify-content: center;
  position: relative; height: 64px;
}
.shaft-col {
  width: 60px; position: relative; border-left: 1px solid #e0e0e0;
  border-right: 1px solid #e0e0e0; background: #fafafa;
}
.el-car-indicator {
  position: absolute; left: 4px; right: 4px; height: 28px;
  background: linear-gradient(135deg, #2196f3, #1976d2);
  border-radius: 4px; display: flex; align-items: center;
  justify-content: center; color: white; font-size: 10px;
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(33,150,243,0.3);
  z-index: 2; top: 50%; transform: translateY(-50%);
}
.el-car-indicator .door-l, .el-car-indicator .door-r {
  position: absolute; top: 0; width: 50%; height: 100%;
  background: #1565c0; transition: transform 0.3s;
}
.el-car-indicator .door-l { left: 0; border-radius: 4px 0 0 4px; }
.el-car-indicator .door-r { right: 0; border-radius: 0 4px 4px 0; }
.el-car-indicator.door-open .door-l { transform: translateX(-100%); }
.el-car-indicator.door-open .door-r { transform: translateX(100%); }
.floor-active { background: #fff8e1; }
.floor-arrived { background: #e8f5e9; }
.info-panel {
  display: flex; gap: 20px; margin-top: 16px;
}
.info-card {
  flex: 1; background: white; border-radius: 12px; padding: 16px 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.info-card h3 { font-size: 14px; color: #1a1a2e; margin-bottom: 10px; }
.request-list { max-height: 150px; overflow-y: auto; }
.request-item {
  display: flex; align-items: center; gap: 8px; padding: 4px 0;
  font-size: 12px; border-bottom: 1px solid #f0f0f0;
}
.request-item:last-child { border-bottom: none; }
.elevator-list { display: flex; flex-direction: column; gap: 8px; }
.elevator-item { background: #f8f9fa; border-radius: 8px; padding: 8px 12px; }
.ei-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.ei-name { font-weight: 700; font-size: 13px; color: #1a1a2e; }
.ei-status { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; }
.ei-status.idle { background: #e0e0e0; color: #666; }
.ei-status.moving { background: #e3f2fd; color: #1565c0; }
.ei-status.stopped { background: #fff3e0; color: #e65100; }
.ei-details { display: flex; gap: 12px; font-size: 11px; color: #666; }
.req-status { margin-left: auto; font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 4px; background: #e3f2fd; color: #1565c0; }
.no-requests { color: #999; font-size: 12px; font-style: italic; }
.load-bar-container { position: absolute; bottom: 0; left: 0; width: 100%; height: 3px; background: rgba(0,0,0,0.15); border-radius: 0 0 4px 4px; z-index: 1; overflow: hidden; }
.load-bar { height: 100%; border-radius: 0 0 4px 4px; background: #4caf50; transition: width 0.3s; }
.back-home { display: inline-block; margin-bottom: 16px; padding: 8px 16px; border: 1px solid #1a1a2e; border-radius: 6px; color: #1a1a2e; text-decoration: none; font-size: 14px; font-weight: 600; transition: all 0.2s; }
.back-home:hover { background: #1a1a2e; color: white; }
.step-indicator { display: flex; gap: 4px; justify-content: center; margin-bottom: 12px; }
.step-dot { width: 10px; height: 10px; border-radius: 50%; background: #3a3a5a; transition: all 0.3s; }
.step-dot.active { background: var(--accent, #667eea); box-shadow: 0 0 8px rgba(102,126,234,0.5); }
.step-dot.done { background: #3fb950; }
.el-scene { width: 100%; min-height: 400px; background: var(--bg-primary, #f5f5f5); border-radius: 12px; border: 1px solid var(--border-primary, #e0e0e0); padding: 16px; margin-bottom: 12px; overflow: hidden; }
.el-building { display: flex; gap: 8px; justify-content: center; align-items: flex-end; height: 320px; padding: 8px; background: linear-gradient(180deg, var(--bg-secondary, #e8eaf6), var(--bg-primary, #f5f5f5)); border-radius: 8px; border: 1px solid var(--border-primary, #e0e0e0); position: relative; }
.el-floor { display: flex; align-items: center; gap: 4px; position: absolute; left: 8px; right: 8px; height: 28px; border-bottom: 1px solid var(--border-primary, #e0e0e0); font-size: 10px; color: var(--text-muted, #888); }
.el-shaft { position: relative; width: 40px; height: 100%; background: rgba(128,128,128,0.05); border: 1px solid var(--border-primary, #e0e0e0); border-radius: 4px; }
.el-car { position: absolute; left: 2px; right: 2px; height: 26px; background: #667eea; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #fff; font-weight: 700; transition: bottom 1s cubic-bezier(0.4, 0, 0.2, 1); z-index: 2; }
.el-car.arriving { background: #4facfe; }
.el-car.moving { background: #f093fb; }
.el-info { text-align: center; margin-top: 8px; padding: 8px; background: var(--bg-card, white); border-radius: 8px; font-size: 13px; color: var(--text-secondary, #666); }
.el-popup { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--bg-card, white); border: 2px solid var(--accent, #667eea); border-radius: 12px; padding: 20px; text-align: center; z-index: 10; box-shadow: 0 8px 32px rgba(0,0,0,0.3); animation: popIn 0.4s ease-out; min-width: 200px; }
@keyframes popIn { from { opacity: 0; transform: translate(-50%, -50%) scale(0.5); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }

.el-flow-scene {
  position: relative; min-height: 380px;
  background: var(--bg-primary); border-radius: 12px;
  border: 1px solid var(--border-primary); padding: 20px;
  margin-bottom: 16px; overflow: hidden;
}
.el-flow-building {
  display: flex; gap: 12px; justify-content: center;
  align-items: flex-end; height: 340px;
  padding: 12px; background: linear-gradient(180deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%);
  border-radius: 10px; position: relative; border: 2px solid #333;
}
.el-flow-floor {
  display: flex; align-items: center; gap: 4px;
  position: absolute; left: 12px; right: 12px; height: 28px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  font-size: 10px; color: rgba(255,255,255,0.5);
}
.el-flow-floor-label {
  font-weight: 700; font-size: 11px; min-width: 24px;
  color: rgba(255,255,255,0.7);
}
.el-flow-shaft {
  position: relative; width: 48px; height: 100%;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 4px; overflow: visible;
}
.el-flow-car {
  position: absolute; left: 3px; right: 3px; height: 26px;
  border-radius: 4px; display: flex; align-items: center;
  justify-content: center; font-size: 9px; font-weight: 700;
  color: white; z-index: 3;
  transition: bottom 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}
.el-flow-car.idle { background: linear-gradient(135deg, #667eea, #764ba2); }
.el-flow-car.moving { background: linear-gradient(135deg, #f093fb, #f5576c); animation: carGlow 0.6s ease-in-out infinite alternate; }
@keyframes carGlow { from { box-shadow: 0 2px 8px rgba(240,147,251,0.3); } to { box-shadow: 0 2px 16px rgba(240,147,251,0.6); } }
.el-flow-car.arrived { background: linear-gradient(135deg, #4facfe, #00f2fe); }

.el-flow-msg {
  text-align: center; margin-top: 12px; padding: 10px 16px;
  background: var(--bg-card); border-radius: 10px;
  font-size: 13px; font-weight: 600;
  border: 1px solid var(--border-primary);
}
.el-flow-msg .msg-icon { font-size: 20px; margin-right: 6px; }
.el-flow-msg .msg-text { color: var(--text-primary); }

.el-flow-popup {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  background: white; border-radius: 14px; padding: 24px 32px;
  text-align: center; z-index: 10;
  box-shadow: 0 12px 40px rgba(0,0,0,0.25);
  animation: popIn 0.4s ease-out; min-width: 240px;
}
.el-flow-popup .popup-icon { font-size: 42px; margin-bottom: 8px; }
.el-flow-popup .popup-title { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
.el-flow-popup .popup-sub { font-size: 13px; color: #666; }

.el-flow-status-wrap {
  display: flex; justify-content: center; gap: 16px; margin-top: 8px;
}
.el-flow-status-item {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; color: var(--text-muted);
  padding: 4px 10px; background: var(--bg-card);
  border-radius: 20px; border: 1px solid var(--border-primary);
}
.el-flow-status-dot {
  width: 8px; height: 8px; border-radius: 50%;
}
.el-flow-btn-wrap {
  display: flex; justify-content: center; gap: 8px; margin-top: 12px;
}
.el-flow-btn {
  padding: 10px 28px; border: none; border-radius: 8px;
  font-size: 14px; font-weight: 600; cursor: pointer;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white; transition: all 0.2s;
}
.el-flow-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(102,126,234,0.4); }
.el-flow-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
`;

const TOTAL_FLOORS = 10;

function directionArrow(direction) {
  if (direction === 'UP') return '\u25B2';
  if (direction === 'DOWN') return '\u25BC';
  return '\u2014';
}

function ElevatorCarIndicator({ elevator }) {
  const [doorOpen, setDoorOpen] = useState(false);
  const prevRef = useRef(elevator.currentFloor);

  useEffect(() => {
    if (prevRef.current !== null && prevRef.current !== elevator.currentFloor) setDoorOpen(false);
    prevRef.current = elevator.currentFloor;
  }, [elevator.currentFloor]);

  useEffect(() => {
    if (elevator.status === 'STOPPED' || elevator.status === 'IDLE') {
      const t = setTimeout(() => setDoorOpen(true), 300);
      return () => clearTimeout(t);
    } else setDoorOpen(false);
  }, [elevator.currentFloor, elevator.status]);

  const pct = elevator.capacity > 0 ? (elevator.currentLoad / elevator.capacity) * 100 : 0;

  return (
    <div className={`el-car-indicator ${doorOpen ? 'door-open' : ''}`}>
      <div className="door-l" />
      <div className="door-r" />
      <span style={{ position: 'relative', zIndex: 3 }}>{elevator.name}</span>
      <div className="load-bar-container">
        <div className="load-bar" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

function AnimatedFlow() {
  const [step, setStep] = useState(0);
  const [elevators, setElevators] = useState([]);
  const [request, setRequest] = useState(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);
  const steps = ['Start', 'Call', 'Arriving', 'Moving', 'Done'];
  const maxFloor = 10;

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    getElevators().then(setElevators).catch(() => {});
  }, []);

  const reset = () => { setStep(0); setRequest(null); setMsg(''); setError(''); setLoading(false); };

  const floorY = (fl) => (fl - 1) * 28;

  const callElevatorAction = async () => {
    setLoading(true); setError('');
    try {
      setMsg('Calling elevator from Floor 1 \u2192 Floor 5...');
      const req = await requestElevator(1, 5);
      if (!mountedRef.current) return;
      if (req.error) { setError(req.error); setLoading(false); return; }
      setRequest(req);
      setMsg('Elevator arriving...');
      const poll = setInterval(async () => {
        if (!mountedRef.current) { clearInterval(poll); return; }
        try {
          const evs = await getElevators();
          if (!mountedRef.current) { clearInterval(poll); return; }
          setElevators(evs);
          const e = evs.find(x => x.id === req.assignedElevatorId);
          if (e && e.currentFloor === 1) {
            clearInterval(poll);
            setStep(2);
            setMsg('Elevator arrived at Floor 1');
            setLoading(false);
          }
        } catch { if (mountedRef.current) setError('Polling failed'); }
      }, 1000);
    } catch { if (mountedRef.current) { setError('Failed to call elevator'); setLoading(false); } }
  };

  const enterElevatorAction = () => {
    setLoading(true);
    setMsg('Moving to Floor 5...');
    const ticker = setInterval(async () => {
      if (!mountedRef.current) { clearInterval(ticker); return; }
      try {
        const evs = await tick();
        if (!mountedRef.current) { clearInterval(ticker); return; }
        setElevators(evs);
        const e = evs.find(x => x.id === request?.assignedElevatorId);
        if (e && e.currentFloor >= 5) {
          clearInterval(ticker);
          setStep(3);
          setMsg('Arrived at Floor 5!');
          setLoading(false);
        }
      } catch { if (mountedRef.current) setError('Tick failed'); }
    }, 1000);
  };

  const arrivedAction = () => {
    setStep(4);
    setMsg('Trip Complete!');
  };

  const assignedEl = elevators.find(e => e.id === request?.assignedElevatorId);

  const displayMsg = (() => {
    if (step === 0) return 'Press \u25B6 to start';
    if (step === 1 && loading) return 'Calling elevator from Floor 1 \u2192 Floor 5...';
    if (step === 1 && !loading) return 'Elevator arriving...';
    if (step === 2) return 'Elevator arrived! Enter and press floor 5';
    if (step === 3 && loading) return 'Moving up... Floor ' + (assignedEl?.currentFloor || '-');
    if (step === 3 && !loading) return 'Arrived at Floor 5!';
    if (step === 4) return 'Trip complete!';
    return msg || '';
  })();

  const stepIcon = step === 0 ? '\u{1F680}' : step === 1 ? (loading ? '\u{1F680}' : '\u23F3') : step === 2 ? '\u{1F6AA}' : step === 3 ? (loading ? '\u2B06\uFE0F' : '\u2705') : step === 4 ? '\u{1F389}' : '';

  const carClass = (el) => {
    if (el.id !== request?.assignedElevatorId) return 'idle';
    if (step === 3) return 'moving';
    if (step >= 2) return 'arrived';
    return 'idle';
  };

  const statusDot = { IDLE: '#4caf50', MOVING: '#f5576c', STOPPED: '#4facfe' };

  return (
    <div>
      <div className="step-indicator">
        {steps.map((s, i) => (
          <div key={s} className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} title={s} />
        ))}
        <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>{steps[step] || 'Idle'}</span>
      </div>

      <div className="el-flow-scene">
        <div className="el-flow-building" style={{ height: maxFloor * 28 + 24, padding: '12px 12px 12px 48px' }}>
          {Array.from({ length: maxFloor }).map((_, i) => {
            const fl = maxFloor - i;
            return (
              <div key={fl} className="el-flow-floor" style={{ bottom: (fl - 1) * 28 }}>
                <span className="el-flow-floor-label">F{fl}</span>
              </div>
            );
          })}
          {elevators.map((el) => (
            <div key={el.id} className="el-flow-shaft">
              <div className={'el-flow-car ' + carClass(el)} style={{ bottom: floorY(el.currentFloor) }}>
                {el.id === request?.assignedElevatorId ? '\u{1F680}' : '\u{1F6D7}'} {el.name}
              </div>
            </div>
          ))}
        </div>

        <div className="el-flow-msg">
          <span className="msg-icon">{stepIcon}</span>
          <span className="msg-text">{displayMsg}</span>
        </div>

        <div className="el-flow-status-wrap">
          {elevators.map(el => (
            <div key={el.id} className="el-flow-status-item">
              <span className="el-flow-status-dot" style={{ background: statusDot[el.status] || '#888' }} />
              {el.name}: F{el.currentFloor}
            </div>
          ))}
        </div>

        <div className="el-flow-btn-wrap">
          {step === 0 && (
            <button className="el-flow-btn" onClick={() => setStep(1)}>
              {'\u25B6'} Start Simulation
            </button>
          )}

          {step === 1 && (
            <button className="el-flow-btn" onClick={callElevatorAction} disabled={loading}>
              {loading ? '\u23F3 Calling...' : '\u{1F4DE} Call Elevator to Floor 1'}
            </button>
          )}

          {step === 2 && !loading && (
            <button className="el-flow-btn" onClick={enterElevatorAction}>
              {'\u{1F6AA}'} Enter Elevator
            </button>
          )}

          {step === 3 && (
            <button className="el-flow-btn" onClick={arrivedAction}>
              {'\u2705'} Arrived at Floor 5
            </button>
          )}
        </div>

        {step === 4 && (
          <div className="el-flow-popup">
            <div className="popup-icon">{'\u{1F389}'}</div>
            <div className="popup-title">Trip Complete!</div>
            {assignedEl && <div className="popup-sub">Elevator {assignedEl.name} {'\u2022'} Floor {assignedEl.currentFloor}</div>}
            <button className="el-flow-btn" onClick={reset} style={{ marginTop: 12, fontSize: 13, padding: '8px 20px' }}>
              {'\u{1F504}'} New Trip
            </button>
          </div>
        )}
      </div>

      {error && <div style={{ color: '#f85149', fontSize: 14, textAlign: 'center', margin: '8px 0' }}>{error}<button onClick={reset} style={{ marginLeft: 12, padding: '4px 12px', background: '#2a2a4a', color: '#ccc', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Reset</button></div>}
    </div>
  );
}

export default function ElevatorPage() {
  const [elevators, setElevators] = useState([]);
  const [requests, setRequests] = useState([]);

  usePolling(async () => {
    try { const data = await getElevators(); if (Array.isArray(data)) setElevators(data); }
    catch (e) { /* polling retry */ }
  }, 1000, []);

  usePolling(async () => {
    try { const data = await getRequests(); if (Array.isArray(data)) setRequests(data); }
    catch (e) { /* polling retry */ }
  }, 2000, []);

  const handleCall = async (from, to) => {
    try { await requestElevator(from, to); }
    catch (e) { console.error('Failed to request elevator', e); }
  };

  const TOTAL_FLOORS = 10;
  const floors = Array.from({ length: TOTAL_FLOORS }, (_, i) => TOTAL_FLOORS - i);
  const arrivedFloors = elevators.filter(e => e.status === 'STOPPED' || e.status === 'IDLE').map(e => e.currentFloor);
  const movingCount = elevators.filter(e => e.status === 'MOVING').length;
  const idleCount = elevators.filter(e => e.status === 'IDLE').length;
  const stoppedCount = elevators.filter(e => e.status === 'STOPPED').length;

  const directionArrow = (dir) => {
    if (dir === 'UP') return '▲';
    if (dir === 'DOWN') return '▼';
    return '•';
  };

  return (
    <LldPage
      module="elevator"
      title="Elevator Control System"
      icon="🛗"
      tabs={['app', 'simulation', 'diagram', 'design']}
    >
      {(activeTab) => (
        <div className="app" style={{ padding: 0 }}>
          <style>{styles}</style>
          {activeTab === 'simulation' && <AnimatedFlow />}
          {activeTab === 'app' && (
            <>
              <div className="building">
                <div className="building-header">
                  <span>Building Status</span>
                  <span style={{ fontSize: 13, fontWeight: 400, opacity: 0.9 }}>
                    {elevators.length} Elevators &middot; {movingCount} Moving &middot; {idleCount} Idle &middot; {stoppedCount} Stopped
                  </span>
                </div>
                {floors.map(floor => (
                  <div
                    key={floor}
                    className={`floor-row ${arrivedFloors.includes(floor) ? 'floor-arrived' : ''}`}
                  >
                    <div className="floor-num">F{floor}</div>
                    <div className="floor-buttons">
                      {floor < TOTAL_FLOORS && (
                        <button className="floor-btn floor-btn-up" onClick={() => handleCall(floor, floor + 1)}>▲</button>
                      )}
                      {floor > 1 && (
                        <button className="floor-btn floor-btn-down" onClick={() => handleCall(floor, floor - 1)}>▼</button>
                      )}
                    </div>
                    <div className="shafts-area">
                      {elevators.map(el => (
                        <div className="shaft-col" key={el.id}>
                          {el.currentFloor === floor && <ElevatorCarIndicator elevator={el} />}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="info-panel">
                <div className="info-card">
                  <h3>Elevator Status</h3>
                  <div className="elevator-list">
                    {elevators.length === 0 && <div className="no-requests">No elevators available.</div>}
                    {elevators.map(el => (
                      <div className="elevator-item" key={el.id}>
                        <div className="ei-header">
                          <span className="ei-name">{el.name}</span>
                          <span className={`ei-status ${el.status.toLowerCase()}`}>{el.status}</span>
                        </div>
                        <div className="ei-details">
                          <span>Floor {el.currentFloor}</span>
                          <span>{directionArrow(el.direction)} {el.direction}</span>
                          <span>Load: {el.currentLoad}/{el.capacity}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="info-card">
                  <h3>Recent Requests</h3>
                  <div className="request-list">
                    {requests.length === 0 && <div className="no-requests">No requests yet.</div>}
                    {requests.slice().reverse().slice(0, 10).map((req, idx) => (
                      <div className="request-item" key={req.id || idx}>
                        <span>F{req.fromFloor} &rarr; F{req.toFloor}</span>
                        <span className="req-status">{req.status || 'PENDING'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </LldPage>
  );
}
