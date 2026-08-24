import { useState, useEffect, useCallback } from 'react';
import LldPage from '../../components/LldPage';
import { usePolling } from '../../hooks/usePolling';
import * as api from './api';

const CATEGORIES = ['ELECTRONICS', 'CLOTHING', 'FOOD', 'STATIONERY', 'MEDICINE', 'OTHER'];
const POLICIES = ['MIN_RESTOCK', 'EOQ', 'URGENT_BUFFER'];

const styles = `
.inv-app { max-width: 1100px; margin: 0 auto; }
.inv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: var(--space-3); margin: var(--space-4) 0; }
.inv-card { background: var(--bg-card); border-radius: 12px; padding: 16px; border: 1px solid var(--border-primary); box-shadow: var(--shadow-sm); }
.inv-card h3 { font-size: var(--font-base); margin: 0 0 2px; color: var(--text-primary); }
.inv-sku { font-size: var(--font-xs); color: var(--text-muted); }
.inv-price { font-size: var(--font-sm); font-weight: 700; color: var(--accent); margin: 6px 0; }
.inv-stock-bar { height: 6px; border-radius: 3px; background: var(--bg-tertiary); margin: 8px 0; overflow: hidden; }
.inv-stock-fill { height: 100%; border-radius: 3px; transition: width 0.4s; }
.inv-stock-text { font-size: var(--font-xs); display: flex; justify-content: space-between; }
.stock-critical { color: var(--danger); font-weight: 600; }
.stock-low { color: var(--warning); font-weight: 600; }
.stock-ok { color: var(--success); font-weight: 600; }
.inv-form { display: flex; flex-direction: column; gap: 10px; padding: 14px 16px; background: var(--bg-tertiary); border-radius: 10px; margin-bottom: 14px; border: 1px solid var(--border-secondary); }
.inv-form h3, .inv-form h4 { font-size: var(--font-sm); color: var(--accent); margin: 0; }
.inv-form-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-end; }
.inv-form label { font-size: var(--font-xs); color: var(--text-secondary); display: flex; flex-direction: column; gap: 3px; }
.inv-form input, .inv-form select { padding: 6px 10px; background: var(--bg-input); border: 1px solid var(--border-primary); border-radius: 6px; color: var(--text-primary); font-size: var(--font-sm); }
.inv-btn { padding: 7px 16px; background: var(--accent); color: #fff; border: none; border-radius: 6px; font-size: var(--font-sm); font-weight: 600; cursor: pointer; }
.inv-btn:hover { background: var(--accent-hover); }
.inv-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.inv-btn-secondary { background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border-primary); }
.inv-btn-small { padding: 4px 10px; font-size: var(--font-xs); }
.inv-msg-ok { color: var(--success); font-size: var(--font-xs); }
.inv-msg-err { color: var(--danger); font-size: var(--font-xs); }
.inv-alerts { display: flex; flex-direction: column; gap: 6px; max-height: 220px; overflow-y: auto; }
.inv-alert { padding: 8px 12px; border-radius: 8px; font-size: var(--font-xs); border-left: 3px solid var(--border-primary); background: var(--bg-tertiary); }
.inv-alert.LOW_STOCK { border-left-color: var(--warning); }
.inv-alert.OUT_OF_STOCK { border-left-color: var(--danger); }
.inv-alert.RESTOCKED, .inv-alert.REORDER_PLACED { border-left-color: var(--success); }
.step-indicator { display: flex; gap: 6px; justify-content: center; align-items: center; margin-bottom: 14px; flex-wrap: wrap; }
.step-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--bg-tertiary); border: 1px solid var(--border-primary); }
.step-dot.active { background: var(--accent); box-shadow: 0 0 6px var(--accent); }
.step-dot.done { background: var(--success); border-color: var(--success); }
.inv-hud { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin: 14px 0; }
.inv-hud-tile { background: var(--bg-tertiary); border-radius: 8px; padding: 10px; text-align: center; border: 1px solid var(--border-secondary); }
.inv-hud-tile .num { font-size: var(--font-xl); font-weight: 700; color: var(--accent); }
.inv-hud-tile .lbl { font-size: var(--font-xs); color: var(--text-muted); }
.inv-log { font-size: var(--font-xs); color: var(--text-secondary); background: var(--bg-tertiary); border-radius: 8px; padding: 10px 14px; margin-top: 10px; }
`;

// -------------------------------------------------------------- Products tab

function ProductsTab() {
  const [category, setCategory] = useState('');
  const [products, setProducts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [qty, setQty] = useState('');
  const [type, setType] = useState('INBOUND');
  const [reason, setReason] = useState('');
  const [policy, setPolicy] = useState('EOQ');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newProduct, setNewProduct] = useState({ sku: '', name: '', category: 'ELECTRONICS', unitPrice: '', currentStock: '', reorderLevel: '' });

  const load = useCallback(async () => {
    try {
      const [p, a] = await Promise.all([api.getProducts(category), api.getAlerts()]);
      setProducts(p);
      setAlerts(a.slice().reverse().slice(0, 15));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [category]);

  useEffect(() => { load(); }, [load]);
  usePolling(load, 6000, [category]);

  const stockLevel = (p) => {
    if (p.currentStock === 0) return 'critical';
    if (p.currentStock <= p.reorderLevel) return 'low';
    return 'ok';
  };

  const runAction = async (fn, successMsg) => {
    setBusy(true); setMessage('');
    try {
      await fn();
      setMessage(successMsg);
      await load();
    } catch (err) {
      setMessage(`Error: ${err.message || 'action failed'}`);
    } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="inv-form-row" style={{ marginBottom: 14 }}>
        <label>Category
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">All</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
        <button className="inv-btn inv-btn-secondary" onClick={() => setShowAdd(s => !s)}>{showAdd ? 'Cancel' : '+ Add Product'}</button>
      </div>

      {showAdd && (
        <div className="inv-form">
          <h3>New Product</h3>
          <div className="inv-form-row">
            <label>SKU <input value={newProduct.sku} onChange={e => setNewProduct({ ...newProduct, sku: e.target.value })} /></label>
            <label>Name <input value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} /></label>
            <label>Category
              <select value={newProduct.category} onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label>Unit Price <input type="number" value={newProduct.unitPrice} onChange={e => setNewProduct({ ...newProduct, unitPrice: e.target.value })} /></label>
            <label>Initial Stock <input type="number" value={newProduct.currentStock} onChange={e => setNewProduct({ ...newProduct, currentStock: e.target.value })} /></label>
            <label>Reorder Level <input type="number" value={newProduct.reorderLevel} onChange={e => setNewProduct({ ...newProduct, reorderLevel: e.target.value })} /></label>
            <button className="inv-btn" disabled={busy} onClick={() => runAction(() => api.addProduct({
              sku: newProduct.sku, name: newProduct.name, category: newProduct.category,
              unitPrice: Number(newProduct.unitPrice), currentStock: Number(newProduct.currentStock),
              reorderLevel: Number(newProduct.reorderLevel), supplierId: 1
            }), 'Product added').then(() => setShowAdd(false))}>Add</button>
          </div>
        </div>
      )}

      {selected && (
        <div className="inv-form">
          <h3>Manage: {selected.name}</h3>
          <div className="inv-form-row">
            <label>Type
              <select value={type} onChange={e => setType(e.target.value)}>
                <option value="INBOUND">INBOUND (add)</option>
                <option value="OUTBOUND">OUTBOUND (remove)</option>
              </select>
            </label>
            <label>Quantity <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} /></label>
            <label>Reason <input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Supplier restock" /></label>
            <button className="inv-btn" disabled={busy || !qty} onClick={() => runAction(
              () => api.updateStock(selected.id, Number(qty), type, reason),
              `Stock ${type === 'INBOUND' ? 'added' : 'removed'}`
            )}>Update Stock</button>
          </div>
          <div className="inv-form-row">
            <label>Reorder Policy
              <select value={policy} onChange={e => setPolicy(e.target.value)}>
                {POLICIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </label>
            <button className="inv-btn inv-btn-secondary" disabled={busy} onClick={() => runAction(
              () => api.reorder(selected.id, policy), `Reorder placed via ${policy}`
            )}>Trigger Reorder</button>
            <button className="inv-btn-secondary inv-btn" onClick={() => { setSelected(null); setMessage(''); }}>Close</button>
          </div>
          {message && <div className={message.startsWith('Error') ? 'inv-msg-err' : 'inv-msg-ok'}>{message}</div>}
        </div>
      )}

      {loading ? <p>Loading products...</p> : (
        <div className="inv-grid">
          {products.map(p => {
            const level = stockLevel(p);
            const pct = Math.min(100, (p.currentStock / Math.max(p.reorderLevel * 2, 1)) * 100);
            const barVar = level === 'critical' ? 'var(--danger)' : level === 'low' ? 'var(--warning)' : 'var(--success)';
            return (
              <div key={p.id} className="inv-card">
                <h3>{p.name}</h3>
                <div className="inv-sku">{p.sku} · {p.category}</div>
                <div className="inv-price">₹{p.unitPrice.toFixed(2)}</div>
                <div className="inv-stock-bar"><div className="inv-stock-fill" style={{ width: `${pct}%`, background: barVar }} /></div>
                <div className="inv-stock-text">
                  <span className={level === 'critical' ? 'stock-critical' : level === 'low' ? 'stock-low' : 'stock-ok'}>Stock: {p.currentStock}</span>
                  <span style={{ color: 'var(--text-muted)' }}>Reorder: {p.reorderLevel}</span>
                </div>
                <button className="inv-btn inv-btn-small" style={{ marginTop: 8, width: '100%' }}
                  onClick={() => { setSelected(p); setQty(''); setType('INBOUND'); setReason(''); setMessage(''); }}>
                  Manage
                </button>
              </div>
            );
          })}
          {products.length === 0 && <p>No products found</p>}
        </div>
      )}

      <div className="inv-form">
        <h4>Recent Stock Alerts</h4>
        <div className="inv-alerts">
          {alerts.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No alerts yet</span>}
          {alerts.map(a => (
            <div key={a.id} className={`inv-alert ${a.type}`}>
              <strong>{a.type.replace(/_/g, ' ')}</strong> — {a.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------- Simulation tab

const SIM_STEPS = [
  'Reset sandbox', 'View seeded stock', 'Sell some units', 'Cross the low-stock line',
  'Sell out completely', 'Restock above the line', 'Trigger an auto-reorder', 'Race N buyers for the last units'
];

function SimulationTab() {
  const [step, setStep] = useState(-1);
  const [products, setProducts] = useState([]);
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState('Press Start to reset the isolated sim sandbox.');
  const [raceResult, setRaceResult] = useState(null);
  const [alerts, setAlerts] = useState([]);

  const refreshState = async () => {
    const state = await api.simState();
    setProducts(state.products);
    setAlerts(state.alerts || []);
    return state;
  };

  const currentProduct = () => products.find(p => p.id === target?.id) || target;

  const doReset = async () => {
    setBusy(true); setRaceResult(null);
    try {
      await api.simReset();
      const state = await refreshState();
      const pick = state.products.find(p => p.currentStock > 5) || state.products[0];
      setTarget(pick);
      setStep(0);
      setLog(`Sandbox reset. ${state.products.length} products seeded. Tracking "${pick.name}" (stock=${pick.currentStock}, reorder level=${pick.reorderLevel}).`);
    } catch (err) { setLog(`Reset failed: ${err.message}`); }
    finally { setBusy(false); }
  };

  const doStep = async (n) => {
    setBusy(true);
    try {
      const p = currentProduct();
      if (n === 1) {
        await refreshState();
        setLog(`Viewing ${products.length} seeded products in the isolated sim repository — separate from live data.`);
      } else if (n === 2) {
        await api.simSell(p.id, 2);
        await refreshState();
        setLog(`Sold 2 units of "${p.name}". Stock now ${currentProduct()?.currentStock ?? '?'}.`);
      } else if (n === 3) {
        const before = currentProduct();
        const toSell = Math.max(before.currentStock - before.reorderLevel + 1, 1);
        await api.simSell(p.id, toSell);
        await refreshState();
        setLog(`Sold ${toSell} units, crossing below the reorder level — a LOW_STOCK alert should now appear below.`);
      } else if (n === 4) {
        const before = currentProduct();
        if (before.currentStock > 0) {
          await api.simSell(p.id, before.currentStock);
        }
        await refreshState();
        setLog(`Sold the remaining stock to zero — an OUT_OF_STOCK alert should now appear.`);
      } else if (n === 5) {
        await api.simRestock(p.id, 40);
        await refreshState();
        setLog(`Restocked +40 units, crossing back above the reorder level — a RESTOCKED alert should now appear.`);
      } else if (n === 6) {
        const movement = await api.simReorder(p.id, 'EOQ');
        await refreshState();
        setLog(`Auto-reorder via EOQ policy placed for +${movement.quantity} units — a REORDER_PLACED alert should now appear.`);
      } else if (n === 7) {
        const before = currentProduct();
        const buyers = 10;
        // sell down to a small number first so the race is visibly contended
        if (before.currentStock > 3) {
          await api.simSell(p.id, before.currentStock - 3);
        }
        const result = await api.simRace(p.id, buyers);
        setRaceResult(result);
        await refreshState();
        setLog(`${buyers} buyers raced for the last ${result.remainingStock + result.succeeded} units of "${result.product}": ${result.succeeded} succeeded, ${result.rejected} rejected, ${result.remainingStock} remain — the per-product lock decided the outcome, not luck.`);
      }
      setStep(n);
    } catch (err) {
      setLog(`Step failed: ${err.message}`);
    } finally { setBusy(false); }
  };

  const p = currentProduct();

  return (
    <div>
      <div className="step-indicator">
        {SIM_STEPS.map((s, i) => (
          <div key={s} className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} title={s} />
        ))}
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
          {step >= 0 ? `Step ${step + 1}/8: ${SIM_STEPS[step]}` : 'Not started'}
        </span>
      </div>

      {p && (
        <div className="inv-hud">
          <div className="inv-hud-tile"><div className="num">{p.currentStock}</div><div className="lbl">Current Stock</div></div>
          <div className="inv-hud-tile"><div className="num">{p.reorderLevel}</div><div className="lbl">Reorder Level</div></div>
          <div className="inv-hud-tile"><div className="num">{alerts.length}</div><div className="lbl">Alerts Fired</div></div>
          {raceResult && <>
            <div className="inv-hud-tile"><div className="num" style={{ color: 'var(--success)' }}>{raceResult.succeeded}</div><div className="lbl">Race: Succeeded</div></div>
            <div className="inv-hud-tile"><div className="num" style={{ color: 'var(--danger)' }}>{raceResult.rejected}</div><div className="lbl">Race: Rejected</div></div>
          </>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 12 }}>
        {step === -1 && <button className="inv-btn" disabled={busy} onClick={doReset}>▶ Start Simulation</button>}
        {step >= 0 && step < SIM_STEPS.length - 1 && (
          <button className="inv-btn" disabled={busy} onClick={() => doStep(step + 1)}>
            Next: {SIM_STEPS[step + 1]}
          </button>
        )}
        {step === SIM_STEPS.length - 1 && (
          <button className="inv-btn inv-btn-secondary" onClick={doReset}>↺ Run Again</button>
        )}
      </div>

      <div className="inv-log">{log}</div>

      <div className="inv-form" style={{ marginTop: 14 }}>
        <h4>Sim Alerts ({alerts.length})</h4>
        <div className="inv-alerts">
          {alerts.slice().reverse().slice(0, 10).map(a => (
            <div key={a.id} className={`inv-alert ${a.type}`}>
              <strong>{a.type.replace(/_/g, ' ')}</strong> — {a.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------- page

export default function InventoryPage() {
  return (
    <LldPage module="inventory" title="Inventory Management" icon="📦" tabs={[
      { id: 'products', label: '📋 Products & Alerts' },
      { id: 'simulation', label: '🕹️ Interactive Simulation' },
      { id: 'diagram', label: 'Class Diagram' },
      { id: 'design', label: 'Design Details' }
    ]}>
      <style>{styles}</style>
      {(activeTab) => (
        <div className="inv-app">
          {activeTab === 'products' && <ProductsTab />}
          {activeTab === 'simulation' && <SimulationTab />}
        </div>
      )}
    </LldPage>
  );
}
