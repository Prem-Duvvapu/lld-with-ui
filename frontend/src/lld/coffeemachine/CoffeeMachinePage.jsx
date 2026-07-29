import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getMenu, getStatus, selectBeverage, brew, refillIngredient, resetMachine, getOrders } from './api';
import ClassDiagram from '../../components/ClassDiagram';
import DesignDetails from '../../components/DesignDetails';

const styles = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: linear-gradient(135deg, #1a0a2e, #2d1b4e, #1a0a2e); min-height: 100vh; display: flex; justify-content: center; align-items: center; font-family: 'Segoe UI', sans-serif; }
.coffee-page { max-width: 600px; width: 100%; margin: 20px; background: linear-gradient(145deg, #2a1a3e, #1a0a2e); border: 2px solid #8b5cf6; border-radius: 20px; padding: 24px; box-shadow: 0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(139,92,246,0.1); }
.coffee-title { text-align: center; font-size: 28px; font-weight: 800; color: #c084fc; text-shadow: 0 0 10px rgba(192,132,252,0.5); margin-bottom: 16px; letter-spacing: 1px; }
.back-home { display: inline-block; margin-bottom: 12px; padding: 6px 14px; border: 1px solid #8b5cf6; border-radius: 6px; color: #c084fc; text-decoration: none; font-size: 13px; font-weight: 600; transition: all 0.2s; }
.back-home:hover { background: #8b5cf6; color: #fff; }
.tab-bar { display: flex; gap: 6px; justify-content: center; margin-bottom: 16px; flex-wrap: wrap; }
.tab-btn { padding: 5px 12px; border: 1px solid #4a3a6e; border-radius: 6px; background: transparent; color: #7a6a9e; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s; font-family: inherit; }
.tab-btn.active { border-color: #c084fc; color: #c084fc; background: rgba(192,132,252,0.1); }
.machine-visual { background: linear-gradient(180deg, #2a1a3e, #1e0e32); border-radius: 16px; padding: 20px; border: 1px solid #4a3a6e; }
.status-bar { text-align: center; padding: 8px; margin-bottom: 12px; border-radius: 8px; font-size: 13px; font-weight: 700; letter-spacing: 1px; }
.status-IDLE { background: rgba(34,197,94,0.15); color: #22c55e; border: 1px solid rgba(34,197,94,0.3); }
.status-BREWING { background: rgba(251,191,36,0.15); color: #fbbf24; border: 1px solid rgba(251,191,36,0.3); animation: pulse 1s infinite; }
.status-COMPLETE { background: rgba(34,197,94,0.15); color: #22c55e; border: 1px solid rgba(34,197,94,0.3); }
.status-ERROR { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
.menu-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; margin: 12px 0; }
.menu-card { background: rgba(139,92,246,0.08); border: 1px solid #4a3a6e; border-radius: 10px; padding: 12px; text-align: center; cursor: pointer; transition: all 0.2s; }
.menu-card:hover { background: rgba(139,92,246,0.15); border-color: #8b5cf6; }
.menu-card.selected { border-color: #c084fc; background: rgba(192,132,252,0.15); box-shadow: 0 0 12px rgba(192,132,252,0.2); }
.menu-card .name { color: #e2d4f8; font-size: 14px; font-weight: 700; }
.menu-card .price { color: #c084fc; font-size: 16px; font-weight: 800; margin-top: 4px; }
.ingredient-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; margin: 12px 0; }
.ingredient-bar { background: rgba(139,92,246,0.1); border-radius: 8px; padding: 8px; text-align: center; }
.ingredient-bar .label { color: #a8a0b8; font-size: 11px; }
.ingredient-bar .value { color: #c084fc; font-size: 13px; font-weight: 700; margin-top: 2px; }
.ingredient-bar .fill { height: 4px; background: #4a3a6e; border-radius: 2px; margin-top: 4px; overflow: hidden; }
.ingredient-bar .fill-inner { height: 100%; border-radius: 2px; transition: width 0.5s; background: linear-gradient(90deg, #8b5cf6, #c084fc); }
.btn { padding: 10px 20px; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: inherit; color: #fff; }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-primary { background: linear-gradient(180deg, #8b5cf6, #6d3bd4); }
.btn-primary:hover:not(:disabled) { background: linear-gradient(180deg, #9d6ff7, #7d4de4); }
.btn-success { background: linear-gradient(180deg, #22c55e, #16a34a); }
.btn-success:hover:not(:disabled) { background: linear-gradient(180deg, #2dd46e, #1db354); }
.btn-warning { background: linear-gradient(180deg, #f59e0b, #d97706); }
.btn-warning:hover:not(:disabled) { background: linear-gradient(180deg, #fbbf24, #e58a00); }
.btn-danger { background: linear-gradient(180deg, #ef4444, #dc2626); }
.btn-danger:hover:not(:disabled) { background: linear-gradient(180deg, #f55, #e33); }
.brew-animation { text-align: center; padding: 30px 0; }
.brew-cup { font-size: 60px; animation: fillCup 1.5s ease-out; }
.brew-steam { font-size: 30px; animation: steam 0.5s infinite alternate; }
@keyframes fillCup { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes steam { from { transform: translateY(0); opacity: 1; } to { transform: translateY(-10px); opacity: 0.5; } }
.step-indicator { display: flex; gap: 4px; justify-content: center; margin-bottom: 12px; }
.step-dot { width: 10px; height: 10px; border-radius: 50%; background: #3a2a5e; transition: all 0.3s; }
.step-dot.active { background: #c084fc; box-shadow: 0 0 8px rgba(192,132,252,0.5); }
.step-dot.done { background: #22c55e; }
.scene { position: relative; min-height: 380px; background: linear-gradient(180deg, #1e0e32, #2a1a3e); border-radius: 12px; padding: 20px; margin-bottom: 12px; border: 1px solid #4a3a6e; overflow: hidden; }
.scene-machine { max-width: 300px; margin: 0 auto; background: linear-gradient(180deg, #3a2a5e, #2a1a4e); border-radius: 16px; padding: 20px; border: 2px solid #6a4a9e; }
.scene-screen { background: #0a0a1a; border: 2px solid #8b5cf6; border-radius: 8px; padding: 16px; min-height: 80px; color: #c084fc; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: monospace; }
.scene-menu { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 10px; }
.scene-menu-item { background: #2a1a4e; border: 1px solid #4a3a6e; border-radius: 6px; padding: 8px 4px; text-align: center; color: #a8a0b8; font-size: 10px; transition: all 0.3s; }
.scene-menu-item.visible { border-color: #8b5cf6; color: #c084fc; }
.scene-menu-item.selected { background: rgba(139,92,246,0.2); border-color: #c084fc; }
.steam-visual { position: absolute; top: 20px; left: 50%; transform: translateX(-50%); font-size: 24px; animation: steamFloat 1s infinite ease-out; }
@keyframes steamFloat { 0% { opacity: 0; transform: translateX(-50%) translateY(0); } 50% { opacity: 0.8; } 100% { opacity: 0; transform: translateX(-50%) translateY(-30px); } }
.cup-fill { position: relative; width: 60px; height: 80px; margin: 10px auto; border: 3px solid #8b5cf6; border-radius: 0 0 10px 10px; overflow: hidden; }
.cup-fill-inner { position: absolute; bottom: 0; width: 100%; background: linear-gradient(180deg, #c084fc, #6d3bd4); transition: height 1.5s ease-out; }
.popup { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #1a0a2e; border: 2px solid #c084fc; border-radius: 12px; padding: 20px; text-align: center; min-width: 200px; z-index: 5; box-shadow: 0 10px 40px rgba(0,0,0,0.8); }
.popup.done { border-color: #22c55e; }
.error { color: #ef4444; padding: 10px; margin: 8px 0; border: 1px solid #ef4444; border-radius: 6px; background: rgba(239,68,68,0.1); font-size: 13px; text-align: center; }
.success { color: #22c55e; padding: 10px; margin: 8px 0; border: 1px solid #22c55e; border-radius: 6px; background: rgba(34,197,94,0.1); font-size: 13px; text-align: center; }
`;

const INGREDIENT_NAMES = {
  COFFEE_BEANS: 'Coffee Beans', MILK: 'Milk', WATER: 'Water',
  SUGAR: 'Sugar', CHOCOLATE: 'Chocolate', CREAM: 'Cream'
};

const INGREDIENT_MAX = {
  COFFEE_BEANS: 200, MILK: 2000, WATER: 4000, SUGAR: 1000, CHOCOLATE: 500, CREAM: 500
};

const beverageIcons = ['☕', '🥛', '🍵', '🍫', '☕'];

export function CoffeeMachineView() {
  const [menu, setMenu] = useState([]);
  const [status, setStatus] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [brewing, setBrewing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [refillAmt, setRefillAmt] = useState({});
  const [machineState, setMachineState] = useState('IDLE');

  useEffect(() => {
    getMenu().then(setMenu).catch(() => setError('Failed to load menu'));
    getStatus().then(d => { setStatus(d); setMachineState(d.status); }).catch(() => {});
  }, []);

  const refreshStatus = () => getStatus().then(d => { setStatus(d); setMachineState(d.status); }).catch(() => {});

  const handleSelect = async (id) => {
    setError(''); setMessage('');
    const res = await selectBeverage(id);
    if (res.success) { setSelectedId(id); setMessage(res.message); }
    else setError(res.message || 'Cannot select');
  };

  const handleBrew = async () => {
    if (!selectedId) { setError('Select a beverage first'); return; }
    setError(''); setBrewing(true); setMachineState('BREWING');
    const res = await brew(selectedId);
    if (res.success) { setMessage(res.message); setMachineState('COMPLETE'); }
    else { setError(res.message || 'Brew failed'); setMachineState('ERROR'); }
    setBrewing(false);
    refreshStatus();
  };

  const handleReset = async () => {
    setSelectedId(null); setMessage(''); setError('');
    await resetMachine();
    refreshStatus();
  };

  const handleRefill = async (ingredient) => {
    const amt = refillAmt[ingredient] || 50;
    await refillIngredient(ingredient, amt);
    refreshStatus();
  };

  const cupLevel = brewing ? 90 : 0;

  return (
    <div>
      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      <div className="machine-visual">
        <div className={`status-bar status-${machineState}`}>
          {machineState === 'IDLE' && '⏸ IDLE — Ready to brew'}
          {machineState === 'BREWING' && '⏳ BREWING — Please wait...'}
          {machineState === 'COMPLETE' && '✅ COMPLETE — Beverage ready!'}
          {machineState === 'ERROR' && '❌ ERROR — Check ingredients'}
        </div>

        {machineState === 'BREWING' ? (
          <div className="brew-animation">
            <div className="brew-steam">💨</div>
            <div className="brew-cup">☕</div>
            <div style={{ color: '#c084fc', fontSize: 14, marginTop: 8 }}>Brewing your {status?.currentBeverage || 'beverage'}...</div>
          </div>
        ) : (
          <>
            <div style={{ color: '#e2d4f8', fontSize: 14, fontWeight: 700, marginBottom: 8 }}>☕ Menu</div>
            <div className="menu-grid">
              {menu.map((b, i) => (
                <div key={b.id} className={`menu-card ${selectedId === b.id ? 'selected' : ''}`} onClick={() => handleSelect(b.id)}>
                  <div style={{ fontSize: 24 }}>{beverageIcons[i]}</div>
                  <div className="name">{b.name}</div>
                  <div className="price">₹{b.price}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '12px 0', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={handleBrew} disabled={brewing || !selectedId || (machineState !== 'IDLE' && machineState !== 'COMPLETE')}>☕ Brew {selectedId ? menu.find(b => b.id === selectedId)?.name : ''} {brewing ? '...' : ''}</button>
              <button className="btn btn-danger" onClick={handleReset} disabled={machineState === 'IDLE'}>🔄 Reset</button>
            </div>
          </>
        )}

        <div style={{ color: '#e2d4f8', fontSize: 14, fontWeight: 700, margin: '12px 0 8px' }}>📊 Ingredients</div>
        <div className="ingredient-grid">
          {status && Object.entries(status.ingredients || {}).map(([key, val]) => (
            <div key={key} className="ingredient-bar">
              <div className="label">{INGREDIENT_NAMES[key] || key}</div>
              <div className="value">{val}{key === 'MILK' || key === 'WATER' || key === 'CREAM' ? 'ml' : 'g'}</div>
              <div className="fill">
                <div className="fill-inner" style={{ width: `${Math.min(100, (val / INGREDIENT_MAX[key]) * 100)}%` }} />
              </div>
              <button className="btn btn-warning" style={{ padding: '3px 8px', fontSize: 10, marginTop: 4 }} onClick={() => handleRefill(key)}>+50</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AnimatedFlow() {
  const [step, setStep] = useState(0);
  const [menu, setMenu] = useState([]);
  const [selectedBeverage, setSelectedBeverage] = useState(null);
  const [brewResult, setBrewResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cupLevel, setCupLevel] = useState(0);
  const [showSteam, setShowSteam] = useState(false);
  const mountedRef = useRef(true);
  const steps = ['Browse', 'Select', 'Brewing', 'Ready', 'Done'];

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  useEffect(() => { getMenu().then(setMenu).catch(() => {}); }, []);

  const reset = () => {
    setStep(0); setSelectedBeverage(null); setBrewResult(null);
    setLoading(false); setError(''); setCupLevel(0); setShowSteam(false);
  };

  const startSim = async () => {
    setError(''); setStep(1);
    const data = await getMenu();
    if (mountedRef.current) setMenu(data);
  };

  const selectAction = async (b) => {
    setError(''); setLoading(true);
    const res = await selectBeverage(b.id);
    if (!mountedRef.current) return;
    if (res.error) { setError(res.error); setLoading(false); return; }
    setSelectedBeverage(b);
    setLoading(false);
    setStep(2);
  };

  const brewAction = async () => {
    if (!selectedBeverage) return;
    setError(''); setLoading(true); setStep(3);
    setCupLevel(0);
    setTimeout(() => { if (mountedRef.current) setShowSteam(true); }, 200);
    setTimeout(() => { if (mountedRef.current) setCupLevel(90); }, 400);
    const res = await brew(selectedBeverage.id);
    if (!mountedRef.current) return;
    if (res.error) { setError(res.error); setLoading(false); setStep(2); return; }
    setBrewResult(res);
    setLoading(false);
    setStep(4);
  };

  const finishAction = () => {
    setStep(5);
  };

  const btnStyle = {
    padding: '8px 20px', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', color: '#fff', transition: 'all 0.2s',
    background: '#8b5cf6', margin: '0 4px',
  };

  return (
    <div>
      <div className="step-indicator">
        {steps.map((s, i) => (
          <div key={s} className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} title={s} />
        ))}
        <span style={{ fontSize: 11, color: '#7a6a9e', marginLeft: 8 }}>{steps[step] || 'Idle'}</span>
      </div>

      <div className="scene">
        <div className="scene-machine">
          <div className="scene-screen">
            {step === 0 && <><div style={{ fontSize: 28 }}>☕</div><div style={{ fontSize: 13, fontWeight: 700 }}>Coffee Machine</div><div style={{ fontSize: 11, opacity: 0.6 }}>Press start to begin</div></>}
            {step === 1 && <><div style={{ fontSize: 28 }}>📋</div><div style={{ fontSize: 13, fontWeight: 700 }}>Browse Menu</div><div style={{ fontSize: 11, opacity: 0.6 }}>Select your beverage</div></>}
            {step === 2 && selectedBeverage && <><div style={{ fontSize: 28 }}>🎯</div><div style={{ fontSize: 13, fontWeight: 700 }}>{selectedBeverage.name}</div><div style={{ fontSize: 11, opacity: 0.6 }}>₹{selectedBeverage.price}</div></>}
            {step === 3 && <><div style={{ fontSize: 28 }}>⏳</div><div style={{ fontSize: 13, fontWeight: 700 }}>Brewing...</div></>}
            {step === 4 && brewResult && <><div style={{ fontSize: 28 }}>🍵</div><div style={{ fontSize: 13, fontWeight: 700 }}>Ready!</div><div style={{ fontSize: 11, opacity: 0.6 }}>{selectedBeverage?.name}</div></>}
            {step === 5 && <><div style={{ fontSize: 28 }}>✅</div><div style={{ fontSize: 13, fontWeight: 700 }}>Done</div><div style={{ fontSize: 11, opacity: 0.6 }}>Enjoy your beverage!</div></>}
          </div>

          <div className="scene-menu">
            {menu.map((b, i) => (
              <div key={b.id} className={`scene-menu-item ${step >= 1 ? 'visible' : ''} ${selectedBeverage?.id === b.id ? 'selected' : ''}`}>
                {beverageIcons[i]} {b.name}
              </div>
            ))}
          </div>
        </div>

        {showSteam && <div className="steam-visual">💨</div>}

        <div className="cup-fill" style={{ marginTop: 16 }}>
          <div className="cup-fill-inner" style={{ height: `${cupLevel}%` }} />
        </div>
        <div style={{ textAlign: 'center', color: '#7a6a9e', fontSize: 11 }}>{selectedBeverage?.name || 'Select a beverage'}</div>

        {step === 2 && selectedBeverage && (
          <div className="popup">
            <div style={{ fontSize: 36 }}>🎯</div>
            <div style={{ fontWeight: 700, color: '#c084fc', fontSize: 15 }}>{selectedBeverage.name} Selected!</div>
            <div style={{ fontSize: 13, color: '#a8a0b8', marginTop: 4 }}>₹{selectedBeverage.price}</div>
          </div>
        )}

        {step === 4 && brewResult && (
          <div className="popup done">
            <div style={{ fontSize: 36 }}>🍵</div>
            <div style={{ fontWeight: 700, color: '#22c55e', fontSize: 15 }}>Ready!</div>
            <div style={{ fontSize: 12, color: '#a8a0b8', marginTop: 4 }}>{selectedBeverage?.name}</div>
          </div>
        )}

        {step === 5 && (
          <div className="popup done">
            <div style={{ fontSize: 36 }}>✅</div>
            <div style={{ fontWeight: 700, color: '#22c55e', fontSize: 15 }}>All Done!</div>
            <div style={{ fontSize: 12, color: '#a8a0b8', marginTop: 4 }}>Enjoy your {selectedBeverage?.name} ☕</div>
          </div>
        )}
      </div>

      {error && <div className="error">{error}<button onClick={reset} style={{ marginLeft: 12, padding: '4px 12px', background: '#3a2a5e', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#ccc' }}>↺ Reset</button></div>}

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        {step === 0 && <button onClick={startSim} style={{ padding: '12px 32px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>▶ Start Simulation</button>}

        {step === 1 && menu.map(b => (
          <button key={b.id} onClick={() => selectAction(b)} disabled={loading} style={btnStyle}>
            {beverageIcons[menu.indexOf(b)]} {b.name} ₹{b.price} {loading ? '...' : ''}
          </button>
        ))}

        {step === 2 && selectedBeverage && <button onClick={brewAction} disabled={loading} style={{ ...btnStyle, background: '#f59e0b' }}>⏳ Brew {selectedBeverage.name} {loading ? '...' : ''}</button>}

        {step === 4 && <button onClick={finishAction} style={{ ...btnStyle, background: '#22c55e' }}>✅ Enjoy</button>}

        {step === 5 && <button onClick={reset} style={{ ...btnStyle, background: '#8b5cf6' }}>🔄 New Order</button>}
      </div>
    </div>
  );
}

export default function CoffeeMachinePage() {
  const [tab, setTab] = useState('machine');
  const tabs = ['machine', 'simulation', 'diagram', 'design'];
  const tabLabels = { machine: 'Machine', simulation: 'Simulation', diagram: 'Class Diagram', design: 'Design Details' };

  return (
    <div className="coffee-page">
      <style>{styles}</style>
      <Link to="/" className="back-home">← Back</Link>
      <div className="coffee-title">☕ Coffee Machine</div>
      <div className="tab-bar">
        {tabs.map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {tabLabels[t]}
          </button>
        ))}
      </div>
      {tab === 'machine' && <CoffeeMachineView />}
      {tab === 'simulation' && <AnimatedFlow />}
      {tab === 'diagram' && <ClassDiagram module="coffee" />}
      {tab === 'design' && <DesignDetails module="coffee" />}
    </div>
  );
}