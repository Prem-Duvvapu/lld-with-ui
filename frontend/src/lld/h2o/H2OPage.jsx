import { useState } from 'react';
import LldPage from '../../components/LldPage';

const CSS = `
.h2o-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.h2o-stage { position: relative; background: var(--bg-primary); border-radius: 12px; border: 1px solid var(--border-primary); padding: 20px; min-height: 280px; display: flex; flex-direction: column; align-items: center; justify-content: center; margin-bottom: 20px; }

.atoms-pool { display: flex; gap: 16px; margin: 16px 0; min-height: 60px; align-items: center; }
.atom-bubble { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; color: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.2); transition: all 0.4s; }
.atom-bubble.H { background: var(--accent); border: 2px solid #8ab4f8; }
.atom-bubble.O { background: var(--danger); border: 2px solid #f85149; }

.molecules-list { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-top: 12px; }
.molecule-badge { padding: 8px 16px; background: rgba(63,185,80,0.15); border: 2px solid var(--success); border-radius: 20px; font-weight: 700; font-size: 13px; color: var(--success); box-shadow: 0 0 12px rgba(63,185,80,0.3); }
`;

function AnimatedFlow() {
  const [hCount, setHCount] = useState(0);
  const [oCount, setOCount] = useState(0);
  const [molecules, setMolecules] = useState([]);
  const [log, setLog] = useState('Semaphores (H=2, O=1) & CyclicBarrier(3) initialized.');

  const addHydrogen = () => {
    const newH = hCount + 1;
    setHCount(newH);
    setLog(`🧪 Hydrogen thread produced H atom. Pending: ${newH} H, ${oCount} O.`);
    checkBonding(newH, oCount);
  };

  const addOxygen = () => {
    const newO = oCount + 1;
    setOCount(newO);
    setLog(`🧪 Oxygen thread produced O atom. Pending: ${hCount} H, ${newO} O.`);
    checkBonding(hCount, newO);
  };

  const checkBonding = (h, o) => {
    if (h >= 2 && o >= 1) {
      setHCount(h - 2);
      setOCount(o - 1);
      const molId = `H2O-${molecules.length + 1}`;
      setMolecules(prev => [...prev, molId]);
      setLog(`💧 CyclicBarrier(3) TRIPPED! 2 Hydrogen + 1 Oxygen bonded -> Formed ${molId}!`);
    }
  };

  return (
    <div className="h2o-container">
      <style>{CSS}</style>

      <div className="h2o-stage">
        <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginBottom: 8 }}>
          SEMAPHORE & CYCLIC BARRIER (3) MOLECULE BONDER
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Waiting Buffer:</div>
        <div className="atoms-pool">
          {Array.from({ length: hCount }).map((_, i) => (
            <div key={`h-${i}`} className="atom-bubble H">H</div>
          ))}
          {Array.from({ length: oCount }).map((_, i) => (
            <div key={`o-${i}`} className="atom-bubble O">O</div>
          ))}
          {hCount === 0 && oCount === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No free atoms waiting for barrier</div>
          )}
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>Formed Water Molecules:</div>
        <div className="molecules-list">
          {molecules.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No H2O formed yet</div>
          ) : (
            molecules.map(m => (
              <div key={m} className="molecule-badge">
                💧 {m}
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justify: 'center' }}>
        <button onClick={addHydrogen} style={{ padding: '10px 20px', borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
          + Add Hydrogen Atom (H)
        </button>
        <button onClick={addOxygen} style={{ padding: '10px 20px', borderRadius: 8, background: 'var(--danger)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
          + Add Oxygen Atom (O)
        </button>
      </div>

      <div style={{ marginTop: 16, background: 'var(--bg-primary)', padding: 12, borderRadius: 8, border: '1px solid var(--border-primary)', fontSize: 12, color: 'var(--info)', textAlign: 'center', fontWeight: 600 }}>
        {log}
      </div>
    </div>
  );
}

export default function H2OPage() {
  return (
    <LldPage module="h2o" title="Building H2O Molecule" icon="💧" tabs={['app', 'simulation', 'diagram', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'simulation' && <AnimatedFlow />}
          {activeTab === 'app' && <AnimatedFlow />}
        </>
      )}
    </LldPage>
  );
}
