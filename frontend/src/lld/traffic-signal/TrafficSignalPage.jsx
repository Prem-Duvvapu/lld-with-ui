import { useState, useEffect } from 'react';
import LldPage from '../../components/LldPage';
import { getStatus, transition, emergency } from './api';

export default function TrafficSignalPage() {
  const [data, setData] = useState(null);

  const loadData = async () => {
    const d = await getStatus();
    setData(d);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTransition = async () => {
    const d = await transition();
    setData(d);
  };

  const handleEmergency = async (id) => {
    const d = await emergency(id);
    setData(d);
  };

  return (
    <LldPage module="traffic-signal" title="Traffic Signal" icon="🚦" tabs={['app', 'design', 'diagram']}>
      <div style={{ padding: 20, textAlign: 'center' }}>
        {data && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, maxWidth: 600, margin: '0 auto' }}>
            {/* North */}
            <div />
            <TrafficLightView light={data.lights[0]} onEmergency={handleEmergency} />
            <div />
            {/* West, Center, East */}
            <TrafficLightView light={data.lights[3]} onEmergency={handleEmergency} />
            <div style={{ background: '#333', borderRadius: '50%', padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <button onClick={handleTransition} style={{ padding: '10px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Cycle</button>
            </div>
            <TrafficLightView light={data.lights[2]} onEmergency={handleEmergency} />
            {/* South */}
            <div />
            <TrafficLightView light={data.lights[1]} onEmergency={handleEmergency} />
            <div />
          </div>
        )}
      </div>
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
