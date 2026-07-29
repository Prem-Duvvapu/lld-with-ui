import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getProducts, updateStock, transferStock, getSuppliers } from './api';
import ClassDiagram from '../../components/ClassDiagram';
import DesignDetails from '../../components/DesignDetails';

const styles = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460); min-height: 100vh; font-family: 'Segoe UI', system-ui, sans-serif; color: #e0e0e0; }
.inv-app { max-width: 1000px; margin: 0 auto; padding: 20px 16px; }
.inv-header { text-align: center; padding: 24px 0; }
.inv-header h1 { font-size: 28px; background: linear-gradient(135deg, #4facfe, #00f2fe); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.inv-header p { color: #8892b0; font-size: 13px; margin-top: 4px; }
.back-home { display: inline-block; margin-bottom: 16px; padding: 8px 16px; border: 1px solid rgba(255,255,255,0.3); border-radius: 6px; color: #ccc; text-decoration: none; font-size: 13px; transition: all 0.2s; }
.back-home:hover { background: rgba(255,255,255,0.1); }
.inv-nav { display: flex; gap: 8px; justify-content: center; margin-bottom: 16px; flex-wrap: wrap; }
.inv-nav button { padding: 8px 18px; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; background: rgba(255,255,255,0.08); color: #8892b0; }
.inv-nav button.active { background: linear-gradient(135deg, #4facfe, #00f2fe); color: #fff; box-shadow: 0 4px 15px rgba(79,172,254,0.3); }
.inv-main { background: rgba(255,255,255,0.05); border-radius: 16px; padding: 24px; min-height: 400px; border: 1px solid rgba(255,255,255,0.08); }
.inv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; margin-bottom: 20px; }
.inv-card { background: rgba(255,255,255,0.06); border-radius: 12px; padding: 16px; border: 1px solid rgba(255,255,255,0.08); transition: all 0.2s; }
.inv-card:hover { transform: translateY(-2px); border-color: rgba(79,172,254,0.3); }
.inv-card h3 { font-size: 15px; margin-bottom: 4px; }
.inv-card .sku { font-size: 11px; color: #5a6785; }
.inv-price { font-size: 14px; font-weight: 700; color: #4facfe; margin: 6px 0; }
.inv-stock-bar { height: 6px; border-radius: 3px; background: rgba(255,255,255,0.1); margin: 8px 0; overflow: hidden; }
.inv-stock-fill { height: 100%; border-radius: 3px; transition: width 0.5s, background 0.5s; }
.inv-stock-text { font-size: 12px; display: flex; justify-content: space-between; }
.stock-critical { color: #f85149; }
.stock-low { color: #d29922; }
.stock-ok { color: #3fb950; }
.inv-form { display: flex; flex-direction: column; gap: 12px; padding: 16px; background: rgba(255,255,255,0.04); border-radius: 12px; margin-bottom: 16px; }
.inv-form h3 { font-size: 15px; color: #4facfe; }
.inv-form-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end; }
.inv-form label { font-size: 12px; color: #8892b0; display: flex; flex-direction: column; gap: 4px; }
.inv-form input, .inv-form select { padding: 8px 12px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; color: #e0e0e0; font-size: 13px; outline: none; }
.inv-form input:focus, .inv-form select:focus { border-color: #4facfe; }
.inv-btn { padding: 8px 18px; background: linear-gradient(135deg, #4facfe, #00f2fe); color: #fff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.inv-btn:hover { box-shadow: 0 4px 15px rgba(79,172,254,0.3); }
.inv-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.inv-btn-secondary { background: rgba(255,255,255,0.1); color: #e0e0e0; }
.inv-btn-secondary:hover { background: rgba(255,255,255,0.15); box-shadow: none; }
.inv-btn-small { padding: 5px 12px; font-size: 11px; }
.step-indicator { display: flex; gap: 4px; justify-content: center; margin-bottom: 14px; align-items: center; }
.step-dot { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,0.15); transition: all 0.3s; }
.step-dot.active { background: #4facfe; box-shadow: 0 0 8px rgba(79,172,254,0.5); }
.step-dot.done { background: #3fb950; }
.inv-scene { width: 100%; min-height: 400px; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); padding: 20px; margin-bottom: 12px; position: relative; overflow: hidden; }
.inv-shelf { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin: 16px 0; }
.inv-box { width: 64px; height: 64px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 28px; transition: all 0.5s; opacity: 0; transform: scale(0); }
.inv-box.visible { opacity: 1; transform: scale(1); }
.inv-box-label { font-size: 10px; text-align: center; color: #8892b0; margin-top: 4px; }
.inv-warehouse { display: flex; gap: 8px; align-items: flex-end; justify-content: center; min-height: 140px; }
.inv-rack { width: 50px; background: rgba(79,172,254,0.15); border: 1px solid rgba(79,172,254,0.2); border-radius: 4px 4px 0 0; transition: height 0.8s ease-out; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 4px; font-size: 10px; color: #8892b0; }
.inv-transfer-arrow { font-size: 28px; text-align: center; margin: 8px 0; opacity: 0; transition: all 0.5s; }
.inv-transfer-arrow.visible { opacity: 1; }
.inv-popup { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(20,20,40,0.96); border: 2px solid #4facfe; border-radius: 12px; padding: 20px; text-align: center; z-index: 10; box-shadow: 0 8px 32px rgba(0,0,0,0.5); animation: popIn 0.4s ease-out; min-width: 200px; }
@keyframes popIn { from { opacity: 0; transform: translate(-50%, -50%) scale(0.5); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
.inv-loading { text-align: center; color: #8892b0; padding: 40px; }
.inv-error { text-align: center; color: #f85149; padding: 16px; }
`;

function ProductGrid() {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selProduct, setSelProduct] = useState(null);
  const [stockQty, setStockQty] = useState('');
  const [stockType, setStockType] = useState('INBOUND');
  const [stockReason, setStockReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      const [p, s] = await Promise.all([getProducts(filter), getSuppliers()]);
      setProducts(p); setSuppliers(s);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const handleStockUpdate = async () => {
    if (!stockQty || parseInt(stockQty) < 1) return;
    setActionLoading(true); setMessage('');
    try {
      const res = await updateStock(selProduct.id, parseInt(stockQty), stockType, stockReason);
      if (res.error) { setMessage(`Error: ${res.error}`); } else {
        setMessage(`Stock ${stockType === 'INBOUND' ? 'added' : 'removed'} successfully`);
        setStockQty(''); setStockReason(''); load();
      }
    } catch { setMessage('Update failed'); }
    finally { setActionLoading(false); }
  };

  const stockLevel = (p) => {
    if (p.currentStock <= p.reorderLevel / 2) return 'critical';
    if (p.currentStock <= p.reorderLevel) return 'low';
    return 'ok';
  };

  if (loading) return <div className="inv-loading">Loading products...</div>;

  return (
    <div>
      <div className="inv-form">
        <h3>Filter & Manage Products</h3>
        <div className="inv-form-row">
          <label>Category <select value={filter} onChange={e => setFilter(e.target.value)}><option value="">All</option><option>ELECTRONICS</option><option>CLOTHING</option><option>FOOD</option><option>STATIONERY</option><option>MEDICINE</option></select></label>
        </div>
      </div>

      {selProduct && (
        <div className="inv-form" style={{ border: '1px solid rgba(79,172,254,0.3)' }}>
          <h3>Update Stock: {selProduct.name}</h3>
          <div className="inv-form-row">
            <label>Type <select value={stockType} onChange={e => setStockType(e.target.value)}><option value="INBOUND">INBOUND (add)</option><option value="OUTBOUND">OUTBOUND (remove)</option></select></label>
            <label>Quantity <input type="number" min="1" value={stockQty} onChange={e => setStockQty(e.target.value)} /></label>
            <label>Reason <input value={stockReason} onChange={e => setStockReason(e.target.value)} placeholder="e.g. Supplier restock" /></label>
            <button className="inv-btn" onClick={handleStockUpdate} disabled={actionLoading}>{actionLoading ? '...' : 'Update Stock'}</button>
            <button className="inv-btn inv-btn-secondary" onClick={() => { setSelProduct(null); setMessage(''); }}>Cancel</button>
          </div>
          {message && <div style={{ fontSize: 13, color: message.includes('Error') ? '#f85149' : '#3fb950' }}>{message}</div>}
        </div>
      )}

      <div className="inv-grid">
        {products.map(p => {
          const level = stockLevel(p);
          const pct = Math.min(100, (p.currentStock / (p.reorderLevel * 2)) * 100);
          const barColor = level === 'critical' ? '#f85149' : level === 'low' ? '#d29922' : '#3fb950';
          return (
            <div key={p.id} className="inv-card">
              <h3>{p.name}</h3>
              <div className="sku">{p.sku} • {p.category}</div>
              <div className="inv-price">₹{p.unitPrice.toFixed(2)}</div>
              <div className="inv-stock-bar"><div className="inv-stock-fill" style={{ width: `${pct}%`, background: barColor }} /></div>
              <div className="inv-stock-text">
                <span className={level === 'critical' ? 'stock-critical' : level === 'low' ? 'stock-low' : 'stock-ok'}>Stock: {p.currentStock}</span>
                <span style={{ color: '#5a6785' }}>Reorder: {p.reorderLevel}</span>
              </div>
              <button className="inv-btn inv-btn-small" style={{ marginTop: 8, width: '100%' }} onClick={() => { setSelProduct(p); setStockQty(''); setStockType('INBOUND'); setStockReason(''); setMessage(''); }}>Update Stock</button>
            </div>
          );
        })}
      </div>
      {products.length === 0 && <div className="inv-loading">No products found</div>}
    </div>
  );
}

function AnimatedFlow() {
  const [step, setStep] = useState(0);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selProduct, setSelProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [restockQty, setRestockQty] = useState(20);
  const [sellQty, setSellQty] = useState(5);
  const [transferQty, setTransferQty] = useState(3);
  const [popup, setPopup] = useState(null);
  const [showBoxes, setShowBoxes] = useState(0);
  const [rackHeights, setRackHeights] = useState([0, 0, 0, 0]);
  const mountedRef = useRef(true);
  const steps = ['Browse', 'Restock', 'Sell', 'Transfer', 'Done'];

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const reset = () => {
    setStep(0); setProducts([]); setSelProduct(null); setLoading(false);
    setError(''); setRestockQty(20); setSellQty(5); setTransferQty(3);
    setPopup(null); setShowBoxes(0); setRackHeights([0, 0, 0, 0]);
  };

  const startSim = async () => {
    setError('');
    try {
      const [p, s] = await Promise.all([getProducts(), getSuppliers()]);
      if (!mountedRef.current) return;
      setProducts(p); setSuppliers(s);
      setSelProduct(p[0]);
      setStep(1);
      for (let i = 0; i <= Math.min(6, p.length); i++) {
        await new Promise(r => setTimeout(r, 300));
        if (!mountedRef.current) return;
        setShowBoxes(i);
      }
    } catch { if (mountedRef.current) setError('Failed to load products'); }
  };

  const restockAction = async () => {
    if (!selProduct) return; setError(''); setLoading(true);
    try {
      const res = await updateStock(selProduct.id, restockQty, 'INBOUND', 'Supplier restock');
      if (!mountedRef.current) return;
      if (res.error) { setError(res.error); setLoading(false); return; }
      setPopup({ title: '📥 Restock Complete', detail: `+${restockQty} units of ${selProduct.name} added to warehouse.`, color: '#3fb950' });
      const newRack = [...rackHeights]; newRack[0] = Math.min(100, newRack[0] + 40); setRackHeights(newRack);
      setLoading(false); setStep(3);
      const [p] = await Promise.all([getProducts()]);
      if (mountedRef.current) setProducts(p);
    } catch { if (mountedRef.current) { setError('Restock failed'); setLoading(false); } }
  };

  const sellAction = async () => {
    if (!selProduct) return; setError(''); setLoading(true);
    try {
      const res = await updateStock(selProduct.id, sellQty, 'OUTBOUND', 'Customer purchase');
      if (!mountedRef.current) return;
      if (res.error) { setError(res.error); setLoading(false); return; }
      setPopup({ title: '🛒 Sale Complete', detail: `-${sellQty} units of ${selProduct.name} sold.`, color: '#d29922' });
      const newRack = [...rackHeights]; newRack[1] = Math.min(100, newRack[1] + 30); setRackHeights(newRack);
      setLoading(false); setStep(4);
      const [p] = await Promise.all([getProducts()]);
      if (mountedRef.current) setProducts(p);
    } catch { if (mountedRef.current) { setError('Sale failed'); setLoading(false); } }
  };

  const transferAction = async () => {
    if (!selProduct) return; setError(''); setLoading(true);
    try {
      const res = await transferStock(selProduct.id, 'Warehouse A', 'Warehouse B', transferQty);
      if (!mountedRef.current) return;
      if (res.error) { setError(res.error); setLoading(false); return; }
      setPopup({ title: '🚚 Transfer Complete', detail: `${transferQty} units moved from Warehouse A to B.`, color: '#4facfe' });
      const newRack = [...rackHeights]; newRack[2] = Math.min(100, newRack[2] + 25); newRack[3] = Math.min(100, newRack[3] + 25); setRackHeights(newRack);
      setLoading(false); setStep(5);
    } catch { if (mountedRef.current) { setError('Transfer failed'); setLoading(false); } }
  };

  const boxItems = products.slice(0, 6);
  const boxColors = ['#4facfe', '#00f2fe', '#3fb950', '#d29922', '#f85149', '#a855f7'];

  return (
    <div>
      <div className="step-indicator">
        {steps.map((s, i) => (
          <div key={s} className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} title={s} />
        ))}
        <span style={{ fontSize: 11, color: '#5a6785', marginLeft: 8 }}>{steps[step] || 'Idle'}</span>
      </div>

      <div className="inv-scene">
        {/* Product boxes */}
        <div className="inv-shelf">
          {boxItems.map((p, i) => (
            <div key={p.id} style={{ textAlign: 'center' }}>
              <div className={`inv-box ${i < showBoxes ? 'visible' : ''}`} style={{ background: boxColors[i % boxColors.length] + '22', border: `2px solid ${boxColors[i % boxColors.length]}44`, transitionDelay: `${i * 0.1}s` }}>
                {['📦', '📱', '👕', '🎧', '📚', '🧴'][i % 6]}
              </div>
              <div className="inv-box-label">{p.name?.split(' ').slice(0, 2).join(' ')}</div>
            </div>
          ))}
        </div>

        {/* Warehouse racks */}
        {step >= 2 && (
          <div className="inv-warehouse">
            {['Whse A', 'Whse B', 'Whse C', 'Whse D'].map((name, i) => (
              <div key={name} style={{ textAlign: 'center' }}>
                <div className="inv-rack" style={{ height: Math.max(20, rackHeights[i]), width: 45 }}>{name}</div>
              </div>
            ))}
          </div>
        )}

        {/* Transfer arrow */}
        {step >= 4 && <div className={`inv-transfer-arrow ${step >= 4 ? 'visible' : ''}`}>🚚 ⟶</div>}

        {/* Popups */}
        {popup && step < 5 && (
          <div className="inv-popup" style={{ borderColor: popup.color }}>
            <div style={{ fontSize: 32 }}>{popup.title.split(' ')[0]}</div>
            <div style={{ fontWeight: 700, color: popup.color, fontSize: 14, marginTop: 4 }}>{popup.title}</div>
            <div style={{ fontSize: 12, color: '#8892b0', marginTop: 8 }}>{popup.detail}</div>
            <button className="inv-btn inv-btn-small" style={{ marginTop: 10 }} onClick={() => setPopup(null)}>OK</button>
          </div>
        )}

        {step === 5 && (
          <div className="inv-popup" style={{ borderColor: '#3fb950' }}>
            <div style={{ fontSize: 36 }}>✅</div>
            <div style={{ fontWeight: 700, color: '#3fb950' }}>All Operations Complete!</div>
            <div style={{ marginTop: 6, fontSize: 12, color: '#8892b0' }}>Inventory managed successfully</div>
            <button onClick={reset} className="inv-btn" style={{ marginTop: 10 }}>🔄 New</button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        {step === 0 && <button onClick={startSim} className="inv-btn" style={{ padding: '10px 28px', fontSize: 14 }}>📦 Browse Inventory</button>}
        {step === 1 && <button onClick={() => setStep(2)} className="inv-btn" disabled={loading}>📦 Browse → Ready</button>}
        {step === 2 && <button onClick={restockAction} disabled={loading} className="inv-btn">📥 Restock Product {loading ? '...' : `(+${restockQty})`}</button>}
        {step === 3 && <button onClick={sellAction} disabled={loading} className="inv-btn">🛒 Sell Item {loading ? '...' : `(-${sellQty})`}</button>}
        {step === 4 && <button onClick={transferAction} disabled={loading} className="inv-btn">🚚 Transfer Stock {loading ? '...' : ''}</button>}
      </div>

      {error && <div className="inv-error">{error}<button onClick={reset} style={{ marginLeft: 12, padding: '4px 12px', background: 'rgba(255,255,255,0.1)', color: '#ccc', border: 'none', borderRadius: 6, cursor: 'pointer' }}>↺ Reset</button></div>}
    </div>
  );
}

export default function InventoryPage() {
  const [tab, setTab] = useState('products');
  const tabs = ['products', 'simulation', 'diagram', 'design'];
  const tabLabels = { products: 'Products', simulation: 'Simulation', diagram: 'Class Diagram', design: 'Design Details' };

  return (
    <div className="inv-app">
      <style>{styles}</style>
      <Link to="/" className="back-home">← Back to Home</Link>
      <header className="inv-header">
        <h1>Inventory Management</h1>
        <p>Stock tracking, movements & warehouse transfers</p>
      </header>
      <nav className="inv-nav">
        {tabs.map(t => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{tabLabels[t]}</button>
        ))}
      </nav>
      <main className="inv-main">
        {tab === 'products' && <ProductGrid />}
        {tab === 'simulation' && <AnimatedFlow />}
        {tab === 'diagram' && <ClassDiagram module="inventory" />}
        {tab === 'design' && <DesignDetails module="inventory" />}
      </main>
    </div>
  );
}