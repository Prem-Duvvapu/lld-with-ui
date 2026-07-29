import { useState, useEffect } from 'react';
import LldPage from '../../components/LldPage';
import { getStatus, transition, emergencyOverride, setTimer } from './api';

const POSITIONS = ['North', 'South', 'East', 'West'];
const LIGHT_COLORS = { RED: '#ff4444', YELLOW: '#ffcc00', GREEN: '#44cc44' };

const STYLES = `
.traffic-app { background: var(--bg-secondary); border-radius: 12px; border: 1px solid var(--border-primary); overflow: hidden; }
.traffic-controls { padding: 20px; }
.traffic-controls h2 { font-size: 16px; color: var(--text-primary); margin-bottom: 16px; }
.intersection-container { position: relative; width: 480px; height: 440px; margin: 0 auto; }
.road-h { position: absolute; top: 170px; left: 0; right: 0; height: 100px; background: #3a3a3a; }
.road-v { position: absolute; left: 170px; top: 0; bottom: 0; width: 100px; background: #3a3a3a; }
.road-line-h { position: absolute; top: 218px; left: 0; right: 0; height: 4px; background: repeating-linear-gradient(90deg, #fff 0px, #fff 30px, transparent 30px, transparent 60px); opacity: 0.3; }
.road-line-v { position: absolute; left: 218px; top: 0; bottom: 0; width: 4px; background: repeating-linear-gradient(180deg, #fff 0px, #fff 30px, transparent 30px, transparent 60px); opacity: 0.3; }
.intersection-center { position: absolute; top: 170px; left: 170px; width: 100px; height: 100px; background: #2a2a2a; border: 3px solid #555; border-radius: 4px; z-index: 2; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
.light-unit { position: absolute; display: flex; flex-direction: column; align-items: center; z-index: 3; }
.light-unit.pos-N { top: 10px; left: 200px; }
.light-unit.pos-S { bottom: 10px; left: 200px; }
.light-unit.pos-E { right: 10px; top: 170px; }
.light-unit.pos-W { left: 10px; top: 170px; }
.light-unit .direction { font-size: 13px; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px; background: var(--bg-tertiary); padding: 2px 12px; border-radius: 4px; border: 1px solid var(--border-primary); }
.light-box { background: #1a1a1a; border-radius: 12px; padding: 8px; border: 2px solid #333; display: flex; flex-direction: column; align-items: center; gap: 5px; box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
.light-unit.pos-N .light-box { flex-direction: column; }
.light-unit.pos-S .light-box { flex-direction: column; }
.light-unit.pos-E .light-box { flex-direction: column; }
.light-unit.pos-W .light-box { flex-direction: column; }
.light-bulb { width: 36px; height: 36px; border-radius: 50%; border: 2px solid #333; transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: transparent; }
.light-bulb.RED { border-color: #882222; background: #331111; }
.light-bulb.RED.active { border-color: #ff4444; background: #ff4444; box-shadow: 0 0 25px rgba(255,68,68,0.6), 0 0 60px rgba(255,68,68,0.3); }
.light-bulb.YELLOW { border-color: #887722; background: #332211; }
.light-bulb.YELLOW.active { border-color: #ffcc00; background: #ffcc00; box-shadow: 0 0 25px rgba(255,204,0,0.6), 0 0 60px rgba(255,204,0,0.3); }
.light-bulb.GREEN { border-color: #228822; background: #113311; }
.light-bulb.GREEN.active { border-color: #44cc44; background: #44cc44; box-shadow: 0 0 25px rgba(68,204,68,0.6), 0 0 60px rgba(68,204,68,0.3); }
.light-timer { font-size: 20px; font-weight: 700; color: var(--text-primary); margin-top: 4px; font-family: monospace; min-width: 30px; text-align: center; }
.controls-panel { padding: 20px; border-top: 1px solid var(--border-primary); display: flex; flex-wrap: wrap; gap: 14px; align-items: center; justify-content: center; }
.controls-panel button { padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.controls-panel button:hover { transform: translateY(-1px); }
.btn-transition { background: var(--accent-gradient); color: #fff; }
.btn-emergency { background: #ff4444; color: #fff; }
.btn-emergency:hover { box-shadow: 0 4px 15px rgba(255,68,68,0.4); }
.timer-input { display: flex; align-items: center; gap: 8px; }
.timer-input label { font-size: 13px; color: var(--text-muted); font-weight: 600; }
.timer-input input { width: 70px; padding: 8px 10px; border: 1px solid var(--border-primary); border-radius: 6px; background: var(--bg-input); color: var(--text-primary); font-size: 14px; text-align: center; }
.timer-input input:focus { outline: none; border-color: var(--accent); }
.btn-set-timer { padding: 8px 14px; background: var(--info); color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; }
.emergency-controls { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; padding: 10px 20px; border-top: 1px solid var(--border-primary); }
.emergency-controls button { padding: 6px 14px; border: 1px solid var(--danger); background: var(--danger-bg); color: var(--danger); border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s; }
.emergency-controls button:hover { background: var(--danger); color: #fff; }
.alert-bar { padding: 10px; text-align: center; font-weight: 600; font-size: 14px; }
.alert-bar.active { background: rgba(255,68,68,0.1); color: #ff4444; border-bottom: 1px solid rgba(255,68,68,0.3); }
`;

function LightBulb({ state, active }) {
  return <div className={`light-bulb ${state} ${active ? 'active' : ''}`} />;
}

function LightUnit({ light }) {
  const pos = light.position;
  const active = light.currentState !== 'RED';
  return (
    <div className={`light-unit pos-${pos[0]}`}>
      <div className="direction">{pos}</div>
      <div className="light-box">
        <LightBulb state="RED" active={light.currentState === 'RED'} />
        <LightBulb state="YELLOW" active={light.currentState === 'YELLOW'} />
        <LightBulb state="GREEN" active={light.currentState === 'GREEN'} />
      </div>
      <div className="light-timer">{light.currentState !== 'RED' ? light.timer : '--'}</div>
    </div>
  );
}

function AppTab() {
  const [lights, setLights] = useState([]);
  const [error, setError] = useState('');
  const [selectedLight, setSelectedLight] = useState(0);
  const [timerValue, setTimerValue] = useState(10);

  const fetchStatus = async () => {
    try {
      const data = await getStatus();
      setLights(data);
      setError('');
    } catch {
      setError('Cannot reach server');
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTransition = async () => {
    try {
      await transition();
      await fetchStatus();
    } catch {
      setError('Transition failed');
    }
  };

  const handleEmergency = async (lightId) => {
    try {
      await emergencyOverride(lightId);
      await fetchStatus();
    } catch {
      setError('Emergency override failed');
    }
  };

  const handleSetTimer = async () => {
    try {
      await setTimer(selectedLight, timerValue);
      await fetchStatus();
    } catch {
      setError('Failed to set timer');
    }
  };

  const emergencyActive = lights.some(l => l.currentState !== 'RED') === false;
  const emergencyLight = lights.find(l => l.currentState === 'GREEN');

  return (
    <div className="traffic-app">
      <style>{STYLES}</style>
      <div className="intersection-container">
        <div className="road-h" />
        <div className="road-v" />
        <div className="road-line-h" />
        <div className="road-line-v" />
        <div className="intersection-center">Stop</div>
        {lights.map(light => <LightUnit key={light.id} light={light} />)}
      </div>

      <div className="controls-panel">
        <button className="btn-transition" onClick={handleTransition}>⟳ Transition</button>
        <div className="timer-input">
          <label>Light:</label>
          <select value={selectedLight} onChange={e => setSelectedLight(Number(e.target.value))} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13 }}>
            {lights.map(l => <option key={l.id} value={l.id}>{l.position}</option>)}
          </select>
          <input type="number" min={1} max={99} value={timerValue} onChange={e => setTimerValue(Number(e.target.value))} />
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>sec</span>
          <button className="btn-set-timer" onClick={handleSetTimer}>Set</button>
        </div>
      </div>

      <div className={`alert-bar ${emergencyActive ? 'active' : ''}`}>
        {emergencyActive ? '🚨 Emergency Mode Active' : emergencyLight ? `🟢 ${emergencyLight.position} has GREEN` : '⚫ All RED'}
      </div>

      <div className="emergency-controls">
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginRight: 8 }}>Emergency Override:</span>
        {lights.map(l => (
          <button key={l.id} onClick={() => handleEmergency(l.id)}>{l.position}</button>
        ))}
      </div>

      {error && <div style={{ padding: 10, textAlign: 'center', color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
    </div>
  );
}

export default function TrafficSignalPage() {
  return (
    <LldPage module="traffic-signal" title="Traffic Signal" icon="🚦" tabs={['app', 'design', 'diagram']}>
      <AppTab />
    </LldPage>
  );
}
