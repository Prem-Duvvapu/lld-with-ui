import { useState, useRef } from 'react';
import LldPage from '../../components/LldPage';
import { getStatus, transition, emergency } from './api';
import { usePolling } from '../../hooks/usePolling';

const CSS = `
.ts-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.ts-stage { position: relative; width: 100%; height: 420px; background: #262626; border-radius: 12px; overflow: hidden; border: 2px solid var(--border-primary); margin-bottom: 16px; }

/* ROADS */
.road-ns { position: absolute; left: 50%; top: 0; bottom: 0; width: 120px; transform: translateX(-50%); background: #333; border-left: 2px dashed #666; border-right: 2px dashed #666; }
.road-ew { position: absolute; top: 50%; left: 0; right: 0; height: 120px; transform: translateY(-50%); background: #333; border-top: 2px dashed #666; border-bottom: 2px dashed #666; }

.crosswalk-n { position: absolute; top: 130px; left: 50%; transform: translateX(-50%); width: 120px; height: 20px; background: repeating-linear-gradient(90deg, #fff 0, #fff 15px, transparent 15px, transparent 30px); opacity: 0.6; }
.crosswalk-s { position: absolute; bottom: 130px; left: 50%; transform: translateX(-50%); width: 120px; height: 20px; background: repeating-linear-gradient(90deg, #fff 0, #fff 15px, transparent 15px, transparent 30px); opacity: 0.6; }
.crosswalk-w { position: absolute; left: 130px; top: 50%; transform: translateY(-50%); height: 120px; width: 20px; background: repeating-linear-gradient(0deg, #fff 0, #fff 15px, transparent 15px, transparent 30px); opacity: 0.6; }
.crosswalk-e { position: absolute; right: 130px; top: 50%; transform: translateY(-50%); height: 120px; width: 20px; background: repeating-linear-gradient(0deg, #fff 0, #fff 15px, transparent 15px, transparent 30px); opacity: 0.6; }

/* LIGHT HOUSINGS */
.signal-box { position: absolute; background: #111; border: 2px solid #444; border-radius: 8px; padding: 6px; display: flex; gap: 4px; z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
.signal-box.north { top: 70px; left: 50%; transform: translateX(-50%); flex-direction: row; }
.signal-box.south { bottom: 70px; left: 50%; transform: translateX(-50%); flex-direction: row; }
.signal-box.west { left: 70px; top: 50%; transform: translateY(-50%); flex-direction: column; }
.signal-box.east { right: 70px; top: 50%; transform: translateY(-50%); flex-direction: column; }

.light-bulb { width: 16px; height: 16px; border-radius: 50%; background: #222; transition: all 0.3s; }
.light-bulb.red.active { background: #ff4444; box-shadow: 0 0 12px #ff4444; }
.light-bulb.yellow.active { background: #ffcc00; box-shadow: 0 0 12px #ffcc00; }
.light-bulb.green.active { background: #22c55e; box-shadow: 0 0 12px #22c55e; }

/* CARS */
.car { position: absolute; font-size: 28px; transition: all 1.2s cubic-bezier(0.4, 0, 0.2, 1); z-index: 5; }

.ts-controls { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
.ts-btn { padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; border: none; transition: all 0.2s; }
.ts-btn.primary { background: var(--accent-gradient); color: #fff; }
.ts-btn.danger { background: var(--danger); color: #fff; }
.ts-btn:hover { opacity: 0.9; transform: translateY(-1px); }
`;

function AnimatedFlow() {
  const [lightsData, setLightsData] = useState(null);
  const [cars, setCars] = useState({
    NORTH: { x: 'calc(50% - 30px)', y: 20, icon: '🚗' },
    SOUTH: { x: 'calc(50% + 10px)', y: 360, icon: '🚙' },
    WEST: { x: 20, y: 'calc(50% + 10px)', icon: '🚕' },
    EAST: { x: 800, y: 'calc(50% - 30px)', icon: '🏎️' },
  });
  const [logs, setLogs] = useState([]);

  const addLog = (msg) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 4)]);

  const fetchStatus = async () => {
    try {
      const res = await getStatus();
      if (res && res.lights) setLightsData(res);
    } catch {
      // Mock fallback state if backend endpoint pending
      setLightsData({
        lights: [
          { id: '1', position: 'NORTH', currentState: 'GREEN', timer: 15 },
          { id: '2', position: 'SOUTH', currentState: 'GREEN', timer: 15 },
          { id: '3', position: 'EAST', currentState: 'RED', timer: 20 },
          { id: '4', position: 'WEST', currentState: 'RED', timer: 20 },
        ]
      });
    }
  };

  usePolling(fetchStatus, 1500, []);

  const handleCycle = async () => {
    addLog('State Machine Transition Triggered');
    try { await transition(); } catch { /* ignore */ }
    fetchStatus();
  };

  const handleEmergencyBtn = async (pos) => {
    addLog(`🚑 Emergency Vehicle Override Signal Sent for ${pos}`);
    try { await emergency(pos); } catch { /* ignore */ }
    fetchStatus();
  };

  const getLightState = (pos) => {
    if (!lightsData || !lightsData.lights) return 'RED';
    const l = lightsData.lights.find(item => item.position === pos || item.id === pos);
    return l ? l.currentState : 'RED';
  };

  // Car Movement Logic based on Lights
  const northState = getLightState('NORTH');
  const southState = getLightState('SOUTH');
  const westState = getLightState('WEST');
  const eastState = getLightState('EAST');

  return (
    <div className="ts-container">
      <style>{CSS}</style>

      <div className="ts-stage">
        {/* Roads */}
        <div className="road-ns" />
        <div className="road-ew" />
        <div className="crosswalk-n" />
        <div className="crosswalk-s" />
        <div className="crosswalk-w" />
        <div className="crosswalk-e" />

        {/* Signals */}
        <div className="signal-box north">
          <div className={`light-bulb red ${northState === 'RED' ? 'active' : ''}`} />
          <div className={`light-bulb yellow ${northState === 'YELLOW' ? 'active' : ''}`} />
          <div className={`light-bulb green ${northState === 'GREEN' ? 'active' : ''}`} />
        </div>

        <div className="signal-box south">
          <div className={`light-bulb red ${southState === 'RED' ? 'active' : ''}`} />
          <div className={`light-bulb yellow ${southState === 'YELLOW' ? 'active' : ''}`} />
          <div className={`light-bulb green ${southState === 'GREEN' ? 'active' : ''}`} />
        </div>

        <div className="signal-box west">
          <div className={`light-bulb red ${westState === 'RED' ? 'active' : ''}`} />
          <div className={`light-bulb yellow ${westState === 'YELLOW' ? 'active' : ''}`} />
          <div className={`light-bulb green ${westState === 'GREEN' ? 'active' : ''}`} />
        </div>

        <div className="signal-box east">
          <div className={`light-bulb red ${eastState === 'RED' ? 'active' : ''}`} />
          <div className={`light-bulb yellow ${eastState === 'YELLOW' ? 'active' : ''}`} />
          <div className={`light-bulb green ${eastState === 'GREEN' ? 'active' : ''}`} />
        </div>

        {/* Moving Animated Vehicles */}
        <div className="car" style={{
          left: cars.NORTH.x,
          top: northState === 'GREEN' ? 380 : 100,
        }}>🚗</div>

        <div className="car" style={{
          left: cars.SOUTH.x,
          top: southState === 'GREEN' ? 10 : 280,
        }}>🚙</div>

        <div className="car" style={{
          top: cars.WEST.y,
          left: westState === 'GREEN' ? '85%' : 100,
        }}>🚕</div>

        <div className="car" style={{
          top: cars.EAST.y,
          left: eastState === 'GREEN' ? '5%' : 'calc(100% - 140px)',
        }}>🏎️</div>
      </div>

      <div className="ts-controls">
        <button className="ts-btn primary" onClick={handleCycle}>
          🔄 Next Signal Phase Cycle
        </button>
        <button className="ts-btn danger" onClick={() => handleEmergencyBtn('NORTH')}>
          🚑 Emergency Vehicle Priority (North-South)
        </button>
      </div>

      <div style={{ marginTop: 16, background: 'var(--bg-primary)', padding: 12, borderRadius: 8, border: '1px solid var(--border-primary)', fontFamily: 'monospace', fontSize: 12 }}>
        <div style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>State Machine Event Log:</div>
        {logs.length === 0 ? <div style={{ color: 'var(--text-muted)' }}>Ready. Click Cycle or Emergency.</div> : logs.map((l, idx) => (
          <div key={idx} style={{ color: idx === 0 ? 'var(--info)' : 'var(--text-muted)' }}>{l}</div>
        ))}
      </div>
    </div>
  );
}

export default function TrafficSignalPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const loadData = async () => {
    try {
      const d = await getStatus();
      setData(d);
      setError(null);
    } catch (err) {
      // Previously swallowed silently, which left the "app" tab permanently blank
      // (white background, no content, no feedback) whenever this call failed —
      // surface it instead so the user always sees something.
      setError(err?.message || 'Failed to load traffic signal state');
    }
  };

  usePolling(loadData, 1000, []);

  const handleTransition = async () => {
    try {
      const d = await transition();
      setData(d);
      setError(null);
    } catch (err) {
      setError(err?.message || 'Failed to advance signal phase');
    }
  };

  const handleEmergency = async (id) => {
    try {
      const d = await emergency(id);
      setData(d);
      setError(null);
    } catch (err) {
      setError(err?.message || 'Failed to trigger emergency override');
    }
  };

  return (
    <LldPage module="traffic-signal" title="Traffic Signal System" icon="🚦" tabs={['app', 'simulation', 'diagram', 'sequence', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'simulation' && <AnimatedFlow />}

          {activeTab === 'app' && (
            <div style={{ padding: 20, textAlign: 'center' }}>
              {error && (
                <div style={{ maxWidth: 480, margin: '0 auto 16px', padding: '10px 16px', background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                  ⚠ {error}
                  <button onClick={loadData} style={{ marginLeft: 12, padding: '4px 10px', background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                    Retry
                  </button>
                </div>
              )}

              {!data && !error && (
                <div style={{ padding: 40, color: 'var(--text-muted)', fontSize: 14 }}>⏳ Loading intersection state…</div>
              )}

              {data && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, maxWidth: 600, margin: '0 auto' }}>
                  <div />
                  <TrafficLightView light={data.lights?.[0] || { position: 'NORTH', currentState: 'GREEN', timer: 10 }} onEmergency={handleEmergency} />
                  <div />
                  <TrafficLightView light={data.lights?.[3] || { position: 'WEST', currentState: 'RED', timer: 10 }} onEmergency={handleEmergency} />
                  <div style={{ background: '#333', borderRadius: '50%', padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <button onClick={handleTransition} style={{ padding: '10px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Cycle</button>
                  </div>
                  <TrafficLightView light={data.lights?.[2] || { position: 'EAST', currentState: 'RED', timer: 10 }} onEmergency={handleEmergency} />
                  <div />
                  <TrafficLightView light={data.lights?.[1] || { position: 'SOUTH', currentState: 'GREEN', timer: 10 }} onEmergency={handleEmergency} />
                  <div />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </LldPage>
  );
}

function TrafficLightView({ light, onEmergency }) {
  return (
    <div style={{ background: '#1e1e1e', padding: 15, borderRadius: 10, border: '1px solid #444', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ fontSize: 12, color: '#aaa', fontWeight: 600 }}>{light.position}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, background: '#000', padding: 10, borderRadius: 5 }}>
        <Light circleColor="#ff4444" active={light.currentState === 'RED'} />
        <Light circleColor="#ffcc00" active={light.currentState === 'YELLOW'} />
        <Light circleColor="#22c55e" active={light.currentState === 'GREEN'} />
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: '#fff' }}>{light.timer}s</div>
      <button onClick={() => onEmergency(light.id)} style={{ padding: '4px 8px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 10 }}>Emergency</button>
    </div>
  );
}

function Light({ circleColor, active }) {
  return (
    <div style={{ 
      width: 30, height: 30, borderRadius: '50%', 
      background: active ? circleColor : '#333',
      boxShadow: active ? `0 0 15px ${circleColor}` : 'none'
    }} />
  );
}
