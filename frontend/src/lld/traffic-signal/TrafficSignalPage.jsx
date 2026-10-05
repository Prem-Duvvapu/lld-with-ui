import { useState } from 'react';
import LldPage from '../../components/LldPage';
import {
  getStatus, transition, emergency,
} from './api';
import { usePolling } from '../../hooks/usePolling';
import TrafficSignalSimulation from './TrafficSignalSimulation';

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
          {activeTab === 'simulation' && <TrafficSignalSimulation />}

          {activeTab === 'app' && (
            <div style={{ padding: 20, textAlign: 'center' }}>
              {error && (
                <div role="alert" style={{ maxWidth: 480, margin: '0 auto 16px', padding: '10px 16px', background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
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
