import { useState } from 'react';
import { Link } from 'react-router-dom';
import DesignDetails from './DesignDetails';
import ClassDiagram from './ClassDiagram';

export default function LldPage({ module, title, icon, tabs: customTabs, children }) {
  const defaultTabs = ['design', 'diagram'];
  const tabs = customTabs || defaultTabs;
  const tabLabels = { design: 'Design Details', diagram: 'Class Diagram', app: 'App', simulation: 'Simulation', solution: 'Solution' };
  const [tab, setTab] = useState(tabs[0]);
  const isCustom = !['design', 'diagram'].includes(tab);

  return (
    <div className="app">
      <Link to="/" className="back-home">← Back to Home</Link>
      <header className="home-header" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24 }}>{icon} {title}</h1>
        <p style={{ color: '#888', fontSize: 14 }}>Low-Level Design</p>
        <nav style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '6px 14px', border: `1px solid ${tab === t ? '#667eea' : '#333'}`, borderRadius: 6, background: tab === t ? 'rgba(102,126,234,0.15)' : 'transparent', color: tab === t ? '#667eea' : '#888', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              {tabLabels[t] || t}
            </button>
          ))}
        </nav>
      </header>
      <main style={{ maxWidth: tab === 'app' ? 1200 : 900, margin: '0 auto', width: '100%' }}>
        {tab === 'design' && <DesignDetails module={module} />}
        {tab === 'diagram' && <ClassDiagram module={module} />}
        {isCustom && (typeof children === 'function' ? children(tab) : children)}
      </main>
    </div>
  );
}
