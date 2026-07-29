import { useState } from 'react';
import LldPage from '../../components/LldPage';

const CSS = `
.li-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.li-profile-card { background: var(--bg-card); border: 1px solid var(--border-primary); border-radius: 12px; padding: 16px; display: flex; gap: 16px; align-items: center; margin-bottom: 20px; }

.network-graph { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
.network-card { background: var(--bg-card); border: 1px solid var(--border-primary); border-radius: 10px; padding: 12px; text-align: center; }
.network-card.connected { border-color: var(--accent); background: rgba(102,126,234,0.08); }

.degree-badge { padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; background: var(--bg-tertiary); color: var(--info); display: inline-block; margin-top: 4px; }
`;

function AnimatedFlow() {
  const [connections, setConnections] = useState([
    { id: 'U1', name: 'Sarah Jenkins', role: 'Staff Engineer at Google', degree: '1st', connected: true },
    { id: 'U2', name: 'Alex Rivera', role: 'VP Engineering at Stripe', degree: '2nd', connected: false },
    { id: 'U3', name: 'Elena Rostova', role: 'Lead Architect at Microsoft', degree: '3rd', connected: false },
  ]);
  const [log, setLog] = useState('Professional Network Graph (BFS 1st/2nd/3rd degree connections) initialized.');

  const handleConnect = (id) => {
    setConnections(prev => prev.map(u => {
      if (u.id === id) {
        return { ...u, connected: true, degree: '1st' };
      }
      return u;
    }));
    const target = connections.find(u => u.id === id);
    setLog(`🤝 Connection request accepted! ${target?.name} is now a 1st degree connection.`);
  };

  return (
    <div className="li-container">
      <style>{CSS}</style>

      <div className="li-profile-card">
        <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#fff', fontWeight: 700 }}>
          P
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Prem Duvvapu</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Software Engineer · 500+ Connections</div>
        </div>
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textAlign: 'center' }}>
        RECOMMENDED CONNECTIONS & NETWORK DEGREE GRAPH
      </div>

      <div className="network-graph">
        {connections.map(u => (
          <div key={u.id} className={`network-card ${u.connected ? 'connected' : ''}`}>
            <div style={{ fontSize: 28 }}>👤</div>
            <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{u.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.role}</div>
            <div className="degree-badge">{u.degree} Connection</div>

            <button disabled={u.connected} onClick={() => handleConnect(u.id)} style={{ marginTop: 10, width: '100%', padding: '6px', borderRadius: 6, background: u.connected ? 'var(--bg-tertiary)' : 'var(--accent)', color: u.connected ? 'var(--text-muted)' : '#fff', border: 'none', cursor: u.connected ? 'default' : 'pointer', fontWeight: 600, fontSize: 11 }}>
              {u.connected ? '✓ Connected' : '+ Connect'}
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, background: 'var(--bg-primary)', padding: 12, borderRadius: 8, border: '1px solid var(--border-primary)', fontSize: 12, color: 'var(--info)', textAlign: 'center', fontWeight: 600 }}>
        {log}
      </div>
    </div>
  );
}

export default function LinkedInPage() {
  return (
    <LldPage module="linkedin" title="LinkedIn Professional Network" icon="💼" tabs={['app', 'simulation', 'diagram', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'simulation' && <AnimatedFlow />}
          {activeTab === 'app' && <AnimatedFlow />}
        </>
      )}
    </LldPage>
  );
}
