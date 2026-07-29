import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getProducts, selectProduct, insertCoin, dispense, cancelTransaction } from './api';
import ClassDiagram from '../../components/ClassDiagram';
import DesignDetails from '../../components/DesignDetails';

const styles = `
* { margin: 0; padding: 0; box-sizing: border-box; }
.vm-page { max-width: 560px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg-primary); min-height: 100vh; }
.vm-header { text-align: center; margin-bottom: 16px; }
.vm-header h1 { font-size: 26px; color: var(--text-primary); margin-bottom: 4px; }
.vm-header p { color: var(--text-secondary); font-size: 13px; }
.vm-nav { display: flex; gap: 8px; justify-content: center; margin-bottom: 16px; }
.vm-nav button { padding: 6px 14px; border: 2px solid var(--border-primary); border-radius: 8px; background: var(--bg-secondary); color: var(--text-primary); cursor: pointer; font-weight: 600; font-size: 12px; transition: all 0.2s; }
.vm-nav button.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.vm-main { background: var(--bg-secondary); border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid var(--border-primary); }
.back-home { display: inline-block; margin-bottom: 12px; padding: 6px 14px; border: 1px solid var(--border-primary); border-radius: 6px; color: var(--text-primary); text-decoration: none; font-size: 13px; font-weight: 600; transition: all 0.2s; }
.back-home:hover { background: var(--accent); color: #fff; }
.vm-machine { background: #1a237e; border-radius: 16px; padding: 20px; border: 4px solid #0d1642; box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
.vm-display { background: #00bcd4; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; min-height: 60px; color: #fff; font-family: monospace; font-size: 14px; font-weight: 700; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 2px solid #008ba3; }
.vm-display .sub { font-size: 11px; opacity: 0.8; font-weight: 400; }
.vm-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 16px; }
.vm-slot { background: #283593; border-radius: 8px; padding: 8px 4px; text-align: center; border: 2px solid #3949ab; cursor: pointer; transition: all 0.2s; min-height: 80px; }
.vm-slot:hover { border-color: #5c6bc0; background: #303f9f; }
.vm-slot.selected { border-color: #ffd54f; box-shadow: 0 0 12px rgba(255,213,79,0.4); }
.vm-slot .emoji { font-size: 24px; }
.vm-slot .name { font-size: 10px; color: #c5cae9; font-weight: 600; margin-top: 2px; }
.vm-slot .price { font-size: 11px; color: #ffd54f; font-weight: 700; }
.vm-slot .stock { font-size: 9px; color: #7986cb; }
.vm-slot .sold-out { font-size: 9px; color: #ef5350; font-weight: 700; }
.vm-coin-panel { display: flex; gap: 6px; margin-bottom: 12px; }
.vm-coin-btn { flex: 1; padding: 10px 4px; background: #ffd54f; border: 2px solid #f9a825; border-radius: 8px; color: #333; font-weight: 700; font-size: 12px; cursor: pointer; transition: all 0.2s; }
.vm-coin-btn:hover { background: #ffca28; }
.vm-coin-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.vm-tray { background: #0d1642; border-radius: 8px; padding: 12px; min-height: 50px; display: flex; align-items: center; justify-content: center; border: 2px solid #1a237e; font-size: 13px; color: #c5cae9; }
.vm-inserted { text-align: center; font-size: 13px; color: #c5cae9; margin-bottom: 8px; }
.vm-total { text-align: center; font-size: 11px; color: #7986cb; margin-bottom: 8px; }
.vm-actions { display: flex; gap: 6px; justify-content: center; }
.vm-btn { padding: 8px 16px; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; }
.vm-btn-primary { background: #4caf50; color: #fff; }
.vm-btn-danger { background: #f44336; color: #fff; }
.vm-btn-cancel { background: #ff9800; color: #fff; }
.vm-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.vm-scene { background: #1a237e; border-radius: 16px; padding: 16px; border: 4px solid #0d1642; margin-bottom: 12px; }
.vm-scene-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-bottom: 10px; }
.vm-scene-slot { background: #283593; border-radius: 6px; padding: 6px 2px; text-align: center; border: 2px solid #3949ab; min-height: 60px; }
.vm-scene-slot .emoji { font-size: 20px; }
.vm-scene-slot .name { font-size: 9px; color: #c5cae9; }
.vm-scene-slot .price { font-size: 10px; color: #ffd54f; font-weight: 700; }
.vm-scene-slot.selected { border-color: #ffd54f; }
.vm-scene-dispenser { background: #0d1642; border-radius: 8px; padding: 10px; min-height: 40px; display: flex; align-items: center; justify-content: center; color: #c5cae9; font-size: 20px; border: 2px solid #1a237e; margin-bottom: 8px; }
.vm-scene-coins { text-align: center; font-size: 12px; color: #c5cae9; margin-bottom: 6px; }
.vm-step-indicator { display: flex; gap: 4px; justify-content: center; margin-bottom: 12px; }
.vm-step-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--border-primary); transition: all 0.3s; }
.vm-step-dot.active { background: var(--accent); box-shadow: 0 0 8px rgba(33,150,243,0.5); }
.vm-step-dot.done { background: #4caf50; }
.vm-popup { background: var(--bg-secondary); border-radius: 12px; padding: 16px 20px; text-align: center; box-shadow: 0 4px 16px rgba(0,0,0,0.15); border: 2px solid var(--border-primary); margin: 12px auto; max-width: 300px; }
.vm-popup h3 { color: var(--text-primary); font-size: 15px; }
.vm-popup p { color: var(--text-secondary); font-size: 12px; margin-top: 4px; }
.vm-error { color: #f44336; text-align: center; padding: 8px; font-size: 13px; }
`;

const COINS = [5, 10, 20, 50];

function MachineTab() {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [txn, setTxn] = useState(null);
  const [inserted, setInserted] = useState(0);
  const [message, setMessage] = useState('Select a product');
  const [error, setError] = useState('');
  const [dispensedItem, setDispensedItem] = useState('');

  useEffect(() => {
    getProducts().then(data => {
      if (!data.error) setProducts(data);
    });
  }, []);

  const handleSelect = async (p) => {
    setError('');
    if (p.stock <= 0) { setError('Sold out!'); return; }
    setSelected(p);
    setMessage(`Selected: ${p.name} - ₹${p.price}`);
    try {
      const data = await selectProduct(p.id, 1);
      if (data.error) { setError(data.error); return; }
      setTxn(data);
      setInserted(0);
      setDispensedItem('');
    } catch { setError('Failed to select product'); }
  };

  const handleInsertCoin = async (amount) => {
    if (!txn) { setError('Select a product first'); return; }
    setError('');
    try {
      const data = await insertCoin(txn.id, amount);
      if (data.error) { setError(data.error); return; }
      setInserted(data.insertedAmount);
      setTxn(data);
      if (data.status === 'PAID') {
        setMessage(`Paid! Dispensing...`);
        handleDispense(data.id);
      } else {
        setMessage(`Inserted: ₹${data.insertedAmount} / ₹${data.totalAmount}`);
      }
    } catch { setError('Failed to insert coin'); }
  };

  const handleDispense = async (txnId) => {
    try {
      const data = await dispense(txnId || txn.id);
      if (data.error) { setError(data.error); return; }
      setTxn(data);
      setDispensedItem('🥤');
      setMessage(`Enjoy! Change: ₹${data.change}`);
      setSelected(null);
    } catch { setError('Failed to dispense'); }
  };

  const handleCancel = async () => {
    if (!txn) return;
    try {
      await cancelTransaction(txn.id);
    } catch {}
    setTxn(null);
    setSelected(null);
    setInserted(0);
    setDispensedItem('');
    setMessage('Transaction cancelled');
  };

  const reset = () => {
    setTxn(null);
    setSelected(null);
    setInserted(0);
    setDispensedItem('');
    setMessage('Select a product');
    setError('');
  };

  return (
    <div className="vm-machine">
      <div className="vm-display">
        <div>{message || '💰 Vending Machine'}</div>
        {txn && inserted > 0 && <div className="sub">Inserted: ₹{inserted} / ₹{txn.totalAmount}</div>}
        {txn && !inserted && <div className="sub">Total: ₹{txn.totalAmount}</div>}
      </div>
      <div className="vm-grid">
        {products.map((p) => (
          <div key={p.id} className={`vm-slot ${selected?.id === p.id ? 'selected' : ''}`}
            onClick={() => handleSelect(p)}>
            <div className="emoji">
              {p.category === 'Beverage' ? '🥤' : p.category === 'Snack' ? '🍪' : '🥪'}
            </div>
            <div className="name">{p.name}</div>
            <div className="price">₹{p.price}</div>
            {p.stock > 0 ? <div className="stock">{p.stock} left</div> : <div className="sold-out">SOLD OUT</div>}
          </div>
        ))}
      </div>
      <div className="vm-inserted">{txn ? `Amount: ₹${inserted} / ₹${txn.totalAmount}` : ''}</div>
      {error && <div className="vm-error">{error}</div>}
      <div className="vm-coin-panel">
        {COINS.map(c => (
          <button key={c} className="vm-coin-btn" onClick={() => handleInsertCoin(c)}
            disabled={!txn || txn.status !== 'PENDING'}>₹{c}</button>
        ))}
      </div>
      <div className="vm-tray">
        {dispensedItem ? <span style={{ fontSize: 32 }}>{dispensedItem} Enjoy!</span> : '🔄 Dispenser Tray'}
      </div>
      {txn && txn.status === 'PENDING' && (
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <button className="vm-btn vm-btn-cancel" onClick={handleCancel}>Cancel</button>
        </div>
      )}
      {txn && txn.status === 'COMPLETED' && (
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <button className="vm-btn vm-btn-primary" onClick={reset}>🔄 New Purchase</button>
        </div>
      )}
    </div>
  );
}

function AnimatedFlow() {
  const [step, setStep] = useState(0);
  const [products, setProducts] = useState([]);
  const [txn, setTxn] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [coinsInserted, setCoinsInserted] = useState(0);
  const [dispensed, setDispensed] = useState(false);
  const [collected, setCollected] = useState(false);
  const mountedRef = useRef(true);
  const steps = ['Browse', 'Select', 'Pay', 'Dispense', 'Collect', 'Done'];

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const reset = () => {
    setStep(0); setTxn(null); setError(''); setLoading(false);
    setSelectedProduct(null); setCoinsInserted(0); setDispensed(false); setCollected(false);
  };

  const browseProducts = async () => {
    setLoading(true);
    try {
      const data = await getProducts();
      if (!mountedRef.current) return;
      if (data.error) { setError(data.error); return; }
      setProducts(data);
      setStep(1);
    } catch { if (mountedRef.current) setError('Failed to load products'); }
    finally { if (mountedRef.current) setLoading(false); }
  };

  const handleSelectProduct = async (p) => {
    setSelectedProduct(p);
    setLoading(true); setError('');
    try {
      const data = await selectProduct(p.id, 1);
      if (!mountedRef.current) return;
      if (data.error) { setError(data.error); return; }
      setTxn(data);
      setCoinsInserted(0);
      setStep(2);
    } catch { if (mountedRef.current) setError('Selection failed'); }
    finally { if (mountedRef.current) setLoading(false); }
  };

  const handleInsertCoin = async (amount) => {
    if (!txn) return;
    setLoading(true); setError('');
    try {
      const data = await insertCoin(txn.id, amount);
      if (!mountedRef.current) return;
      if (data.error) { setError(data.error); return; }
      setCoinsInserted(data.insertedAmount);
      setTxn(data);
      if (data.status === 'PAID') {
        setStep(3);
      }
    } catch { if (mountedRef.current) setError('Coin insertion failed'); }
    finally { if (mountedRef.current) setLoading(false); }
  };

  const handleDispense = async () => {
    if (!txn) return;
    setLoading(true); setError('');
    try {
      const data = await dispense(txn.id);
      if (!mountedRef.current) return;
      if (data.error) { setError(data.error); return; }
      setTxn(data);
      setDispensed(true);
      setStep(4);
    } catch { if (mountedRef.current) setError('Dispense failed'); }
    finally { if (mountedRef.current) setLoading(false); }
  };

  const handleCollect = () => {
    setCollected(true);
    setStep(5);
  };

  return (
    <div>
      <div className="vm-step-indicator">
        {steps.map((s, i) => (
          <div key={s} className={`vm-step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} title={s} />
        ))}
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 8 }}>{steps[step] || 'Idle'}</span>
      </div>

      {error && <div className="vm-error">{error}<button onClick={reset} style={{ marginLeft: 8, padding: '2px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 4, cursor: 'pointer', color: 'var(--text-primary)' }}>↺ Reset</button></div>}

      <div className="vm-scene">
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 8 }}>
          <span style={{ fontSize: 28 }}>🪙</span>
          <span style={{ fontSize: 11, color: '#c5cae9', alignSelf: 'center' }}>Vending Machine</span>
        </div>

        {(step >= 1 || products.length > 0) && (
          <div className="vm-scene-grid">
            {(products.length > 0 ? products : []).map((p) => (
              <div key={p.id} className={`vm-scene-slot ${selectedProduct?.id === p.id ? 'selected' : ''}`}
                onClick={step === 1 ? () => handleSelectProduct(p) : undefined}
                style={step === 1 ? { cursor: 'pointer' } : {}}>
                <div className="emoji">
                  {p.category === 'Beverage' ? '🥤' : p.category === 'Snack' ? '🍪' : '🥪'}
                </div>
                <div className="name">{p.name}</div>
                <div className="price">₹{p.price}</div>
              </div>
            ))}
          </div>
        )}

        {step >= 3 && (
          <div className="vm-scene-coins">🪙 Inserted: ₹{coinsInserted}{txn ? ` / ₹${txn.totalAmount}` : ''}</div>
        )}

        <div className="vm-scene-dispenser">
          {dispensed ? '🥤' : collected ? '✅ Collected!' : step >= 3 ? '⏳ Preparing...' : '🔄 Dispenser'}
        </div>

        {step === 1 && selectedProduct && (
          <div className="vm-popup">
            <div style={{ fontSize: 32 }}>🎯</div>
            <h3>{selectedProduct.name}</h3>
            <p>₹{selectedProduct.price} — Confirm selection?</p>
          </div>
        )}

        {step === 2 && txn && (
          <div className="vm-popup">
            <div style={{ fontSize: 32 }}>🪙</div>
            <h3>Insert ₹{txn.totalAmount - coinsInserted} more</h3>
            <p>Total: ₹{txn.totalAmount} | Inserted: ₹{coinsInserted}</p>
          </div>
        )}

        {step === 4 && dispensed && (
          <div className="vm-popup">
            <div style={{ fontSize: 36 }}>🥤</div>
            <h3>Item Dispensed!</h3>
            <p>Change: ₹{txn?.change || 0}</p>
          </div>
        )}

        {step === 5 && (
          <div className="vm-popup">
            <div style={{ fontSize: 36 }}>✅</div>
            <h3>Transaction Complete!</h3>
            <p>{selectedProduct?.name} — Enjoy!</p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        {step === 0 && <button onClick={browseProducts} disabled={loading} style={{ padding: '12px 32px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>🏪 Browse Products {loading ? '...' : ''}</button>}

        {step === 1 && products.length > 0 && !selectedProduct && (
          <div style={{ fontSize: 12, color: '#c5cae9', textAlign: 'center' }}>👆 Click a product above to select it</div>
        )}

        {step === 2 && txn && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {COINS.map(c => (
              <button key={c} onClick={() => handleInsertCoin(c)} disabled={loading}
                style={{ padding: '10px 16px', background: '#ffd54f', border: '2px solid #f9a825', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>
                🪙 ₹{c}
              </button>
            ))}
          </div>
        )}

        {step === 3 && <button onClick={handleDispense} disabled={loading} style={{ padding: '8px 20px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>🤖 Dispense {loading ? '...' : ''}</button>}

        {step === 4 && !collected && <button onClick={handleCollect} style={{ padding: '8px 20px', background: '#ff9800', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>🥤 Collect Item</button>}

        {step === 5 && <button onClick={reset} style={{ padding: '8px 20px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>🔄 New Purchase</button>}
      </div>
    </div>
  );
}

export default function VendingMachinePage() {
  const [tab, setTab] = useState('machine');
  const tabs = ['machine', 'simulation', 'diagram', 'design'];
  const tabLabels = { machine: 'Machine', simulation: 'Simulation', diagram: 'Class Diagram', design: 'Design Details' };

  return (
    <div className="vm-page">
      <style>{styles}</style>
      <Link to="/" className="back-home">← Back</Link>
      <div className="vm-header">
        <h1>🥤 Vending Machine</h1>
        <p>Low-Level Design</p>
      </div>
      <div className="vm-nav">
        {tabs.map(t => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{tabLabels[t]}</button>
        ))}
      </div>
      <div className="vm-main">
        {tab === 'machine' && <MachineTab />}
        {tab === 'simulation' && <AnimatedFlow />}
        {tab === 'diagram' && <ClassDiagram module="vendingmachine" />}
        {tab === 'design' && <DesignDetails module="vendingmachine" />}
      </div>
    </div>
  );
}
