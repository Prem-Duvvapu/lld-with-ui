import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getAllWallets, getWallet, createWallet, addFunds, sendMoney, getTransactions } from './api';
import ClassDiagram from '../../components/ClassDiagram';
import DesignDetails from '../../components/DesignDetails';

const styles = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: linear-gradient(135deg, #0a1628, #1a2a4e, #0a1628); min-height: 100vh; display: flex; justify-content: center; align-items: center; font-family: 'Segoe UI', sans-serif; }
.wallet-page { max-width: 640px; width: 100%; margin: 20px; background: linear-gradient(145deg, #1a2a4e, #0a1628); border: 2px solid #3b82f6; border-radius: 20px; padding: 24px; box-shadow: 0 20px 60px rgba(0,0,0,0.8); }
.wallet-title { text-align: center; font-size: 28px; font-weight: 800; color: #60a5fa; text-shadow: 0 0 10px rgba(96,165,250,0.5); margin-bottom: 16px; letter-spacing: 1px; }
.back-home { display: inline-block; margin-bottom: 12px; padding: 6px 14px; border: 1px solid #3b82f6; border-radius: 6px; color: #60a5fa; text-decoration: none; font-size: 13px; font-weight: 600; transition: all 0.2s; }
.back-home:hover { background: #3b82f6; color: #fff; }
.tab-bar { display: flex; gap: 6px; justify-content: center; margin-bottom: 16px; flex-wrap: wrap; }
.tab-btn { padding: 5px 12px; border: 1px solid #3a4a6e; border-radius: 6px; background: transparent; color: #6a7a9e; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s; font-family: inherit; }
.tab-btn.active { border-color: #60a5fa; color: #60a5fa; background: rgba(96,165,250,0.1); }
.wallet-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin: 12px 0; }
.wallet-card { background: linear-gradient(135deg, #1e3a5f, #152a4a); border: 1px solid #3b82f6; border-radius: 12px; padding: 16px; transition: all 0.2s; position: relative; overflow: hidden; }
.wallet-card::before { content: ''; position: absolute; top: -50%; right: -50%; width: 100%; height: 100%; background: radial-gradient(circle, rgba(59,130,246,0.1), transparent); pointer-events: none; }
.wallet-card .user-name { color: #e2e8f0; font-size: 16px; font-weight: 700; }
.wallet-card .user-id { color: #6a7a9e; font-size: 11px; }
.wallet-card .balance { color: #60a5fa; font-size: 24px; font-weight: 800; margin: 8px 0; }
.wallet-card .currency { color: #6a7a9e; font-size: 12px; }
.wallet-card .chip { position: absolute; top: 12px; right: 12px; font-size: 20px; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; color: #a8b8d8; font-size: 12px; font-weight: 600; margin-bottom: 4px; }
.form-input { width: 100%; padding: 10px 12px; background: #0a1628; border: 1px solid #3a4a6e; border-radius: 8px; color: #e2e8f0; font-size: 14px; outline: none; font-family: inherit; }
.form-input:focus { border-color: #3b82f6; box-shadow: 0 0 8px rgba(59,130,246,0.2); }
.form-select { width: 100%; padding: 10px 12px; background: #0a1628; border: 1px solid #3a4a6e; border-radius: 8px; color: #e2e8f0; font-size: 14px; outline: none; font-family: inherit; cursor: pointer; }
.form-select:focus { border-color: #3b82f6; }
.btn { padding: 10px 20px; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: inherit; color: #fff; }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-primary { background: linear-gradient(180deg, #3b82f6, #2563eb); }
.btn-primary:hover:not(:disabled) { background: linear-gradient(180deg, #4b92ff, #3573fb); }
.btn-success { background: linear-gradient(180deg, #22c55e, #16a34a); }
.btn-success:hover:not(:disabled) { background: linear-gradient(180deg, #2dd46e, #1db354); }
.btn-warning { background: linear-gradient(180deg, #f59e0b, #d97706); }
.btn-warning:hover:not(:disabled) { background: linear-gradient(180deg, #fbbf24, #e58a00); }
.btn-danger { background: linear-gradient(180deg, #ef4444, #dc2626); }
.btn-danger:hover:not(:disabled) { background: linear-gradient(180deg, #f55, #e33); }
.transaction-list { max-height: 300px; overflow-y: auto; margin: 12px 0; }
.transaction-item { padding: 10px 12px; border-bottom: 1px solid #1a2a4e; font-size: 12px; display: flex; justify-content: space-between; align-items: center; }
.transaction-item:last-child { border-bottom: none; }
.txn-credit { color: #22c55e; }
.txn-debit { color: #ef4444; }
.txn-type { color: #6a7a9e; font-size: 11px; }
.balance-display { text-align: center; padding: 20px; }
.balance-amount { font-size: 36px; font-weight: 800; color: #60a5fa; text-shadow: 0 0 10px rgba(96,165,250,0.3); }
.balance-label { color: #6a7a9e; font-size: 13px; margin-bottom: 4px; }
.step-indicator { display: flex; gap: 4px; justify-content: center; margin-bottom: 12px; }
.step-dot { width: 10px; height: 10px; border-radius: 50%; background: #3a4a6e; transition: all 0.3s; }
.step-dot.active { background: #60a5fa; box-shadow: 0 0 8px rgba(96,165,250,0.5); }
.step-dot.done { background: #22c55e; }
.scene { position: relative; min-height: 400px; background: linear-gradient(180deg, #0a1628, #152040); border-radius: 12px; padding: 20px; margin-bottom: 12px; border: 1px solid #3a4a6e; overflow: hidden; }
.scene-wallet { max-width: 500px; margin: 0 auto; }
.wallet-visual { background: linear-gradient(135deg, #1e3a5f, #152a4a); border: 2px solid #3b82f6; border-radius: 16px; padding: 20px; margin-bottom: 12px; position: relative; }
.wallet-visual .chip-icon { position: absolute; top: 12px; right: 12px; font-size: 24px; }
.wallet-visual .name { color: #e2e8f0; font-size: 18px; font-weight: 700; }
.wallet-visual .bal { color: #60a5fa; font-size: 28px; font-weight: 800; margin: 4px 0; }
.wallet-visual .sub { color: #6a7a9e; font-size: 11px; }
.flow-line { position: relative; height: 60px; display: flex; align-items: center; justify-content: center; margin: 8px 0; }
.flow-arrow { font-size: 32px; color: #60a5fa; animation: flowAnim 1s infinite; }
@keyframes flowAnim { 0%,100% { transform: translateX(0); } 50% { transform: translateX(10px); } }
.popup { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #0a1628; border: 2px solid #60a5fa; border-radius: 12px; padding: 20px; text-align: center; min-width: 220px; z-index: 5; box-shadow: 0 10px 40px rgba(0,0,0,0.8); }
.popup.done { border-color: #22c55e; }
.error { color: #ef4444; padding: 10px; margin: 8px 0; border: 1px solid #ef4444; border-radius: 6px; background: rgba(239,68,68,0.1); font-size: 13px; text-align: center; }
.success { color: #22c55e; padding: 10px; margin: 8px 0; border: 1px solid #22c55e; border-radius: 6px; background: rgba(34,197,94,0.1); font-size: 13px; text-align: center; }
`;

function WalletView() {
  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [txns, setTxns] = useState([]);
  const [sendForm, setSendForm] = useState({ toId: '', amount: '', desc: '' });
  const [addFundsAmt, setAddFundsAmt] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CARD');
  const [newUser, setNewUser] = useState({ userId: '', userName: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadWallets = () => getAllWallets().then(setWallets).catch(() => {});
  useEffect(() => { loadWallets(); }, []);

  const loadWallet = async (id) => {
    const w = await getWallet(id);
    if (w && !w.error) { setSelectedWallet(w); }
    const t = await getTransactions(id);
    if (Array.isArray(t)) setTxns(t);
  };

  const handleCreate = async () => {
    if (!newUser.userId || !newUser.userName) { setError('Enter userId and name'); return; }
    setLoading(true); setError('');
    const res = await createWallet(newUser.userId, newUser.userName);
    if (res.error) setError(res.error);
    else { setMessage(`Wallet created for ${res.userName}`); setNewUser({ userId: '', userName: '' }); loadWallets(); }
    setLoading(false);
  };

  const handleAddFunds = async () => {
    if (!selectedWallet) { setError('Select a wallet'); return; }
    const amt = parseFloat(addFundsAmt);
    if (!amt || amt <= 0) { setError('Enter valid amount'); return; }
    setLoading(true); setError('');
    const res = await addFunds(selectedWallet.id, amt, paymentMethod);
    if (res.error) setError(res.error);
    else { setMessage(`₹${amt} added`); setAddFundsAmt(''); loadWallet(selectedWallet.id); loadWallets(); }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!selectedWallet) { setError('Select a wallet'); return; }
    const amt = parseFloat(sendForm.amount);
    if (!amt || amt <= 0) { setError('Enter valid amount'); return; }
    if (!sendForm.toId) { setError('Enter recipient wallet ID'); return; }
    setLoading(true); setError('');
    const res = await sendMoney(selectedWallet.id, parseInt(sendForm.toId), amt, sendForm.desc);
    if (res.error) setError(res.error);
    else { setMessage(`₹${amt} sent!`); setSendForm({ toId: '', amount: '', desc: '' }); loadWallet(selectedWallet.id); loadWallets(); }
    setLoading(false);
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      <div style={{ marginBottom: 16 }}>
        <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 700, marginBottom: 8 }}>👛 Wallets</div>
        <div className="wallet-grid">
          {wallets.map(w => (
            <div key={w.id} className="wallet-card" onClick={() => loadWallet(w.id)} style={{ cursor: 'pointer', borderColor: selectedWallet?.id === w.id ? '#60a5fa' : '#3b82f6' }}>
              <div className="chip">💳</div>
              <div className="user-name">{w.userName}</div>
              <div className="user-id">@{w.userId}</div>
              <div className="balance">₹{w.balance.toFixed(2)}</div>
              <div className="currency">ID: #{w.id}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'rgba(59,130,246,0.05)', borderRadius: 12, padding: 16, border: '1px solid #3a4a6e' }}>
          <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 700, marginBottom: 8 }}>➕ Create Wallet</div>
          <div className="form-group">
            <label>User ID</label>
            <input className="form-input" placeholder="e.g. newuser" value={newUser.userId} onChange={e => setNewUser(p => ({ ...p, userId: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>User Name</label>
            <input className="form-input" placeholder="e.g. John" value={newUser.userName} onChange={e => setNewUser(p => ({ ...p, userName: e.target.value }))} />
          </div>
          <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>👛 Create {loading ? '...' : ''}</button>
        </div>

        {selectedWallet && (
          <div style={{ background: 'rgba(59,130,246,0.05)', borderRadius: 12, padding: 16, border: '1px solid #3a4a6e' }}>
            <div style={{ color: '#60a5fa', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{selectedWallet.userName}</div>
            <div style={{ color: '#60a5fa', fontSize: 24, fontWeight: 800, marginBottom: 8 }}>₹{selectedWallet.balance.toFixed(2)}</div>

            <div className="form-group">
              <label>Add Funds</label>
              <input className="form-input" type="number" placeholder="Amount" value={addFundsAmt} onChange={e => setAddFundsAmt(e.target.value)} style={{ marginBottom: 6 }} />
              <select className="form-select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={{ marginBottom: 6 }}>
                <option value="CARD">💳 Card</option>
                <option value="UPI">📱 UPI</option>
                <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
              </select>
              <button className="btn btn-success" onClick={handleAddFunds} disabled={loading} style={{ width: '100%' }}>💰 Add Funds {loading ? '...' : ''}</button>
            </div>

            <div className="form-group">
              <label>Send Money</label>
              <input className="form-input" type="number" placeholder="To Wallet ID" value={sendForm.toId} onChange={e => setSendForm(p => ({ ...p, toId: e.target.value }))} style={{ marginBottom: 6 }} />
              <input className="form-input" type="number" placeholder="Amount" value={sendForm.amount} onChange={e => setSendForm(p => ({ ...p, amount: e.target.value }))} style={{ marginBottom: 6 }} />
              <input className="form-input" placeholder="Description (optional)" value={sendForm.desc} onChange={e => setSendForm(p => ({ ...p, desc: e.target.value }))} style={{ marginBottom: 6 }} />
              <button className="btn btn-warning" onClick={handleSend} disabled={loading} style={{ width: '100%' }}>📤 Send Money {loading ? '...' : ''}</button>
            </div>
          </div>
        )}
      </div>

      {selectedWallet && (
        <div style={{ marginTop: 16, background: 'rgba(59,130,246,0.05)', borderRadius: 12, padding: 16, border: '1px solid #3a4a6e' }}>
          <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 700, marginBottom: 8 }}>📊 Transaction History</div>
          <div className="transaction-list">
            {txns.length === 0 ? <div style={{ color: '#6a7a9e', textAlign: 'center', padding: 20 }}>No transactions yet</div> : (
              txns.map((tx, i) => (
                <div key={i} className="transaction-item">
                  <div>
                    <div className={tx.type === 'CREDIT' ? 'txn-credit' : 'txn-debit'} style={{ fontWeight: 600 }}>
                      {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount?.toFixed(2)}
                    </div>
                    <div className="txn-type">{tx.description || tx.type}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="txn-type">{tx.status}</div>
                    <div className="txn-type">{new Date(tx.timestamp).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AnimatedFlow() {
  const [step, setStep] = useState(0);
  const [wallets, setWallets] = useState([]);
  const [fromWallet, setFromWallet] = useState(null);
  const [toWallet, setToWallet] = useState(null);
  const [amount, setAmount] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showFlow, setShowFlow] = useState(false);
  const [txResult, setTxResult] = useState(null);
  const [fromBal, setFromBal] = useState(0);
  const [toBal, setToBal] = useState(0);
  const mountedRef = useRef(true);
  const steps = ['Create', 'Fund', 'Send', 'Confirm', 'Done'];

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => { getAllWallets().then(setWallets).catch(() => {}); }, []);

  const reset = () => {
    setStep(0); setFromWallet(null); setToWallet(null); setLoading(false);
    setError(''); setShowFlow(false); setTxResult(null);
    getAllWallets().then(setWallets).catch(() => {});
  };

  const startSim = async () => {
    setError(''); setStep(1);
    const data = await getAllWallets();
    if (mountedRef.current) setWallets(data);
  };

  const createUser = async () => {
    setLoading(true); setError('');
    const res = await createWallet('simuser', 'SimUser');
    if (!mountedRef.current) return;
    if (res.error) { setError(res.error); setLoading(false); return; }
    setFromWallet(res);
    const data = await getAllWallets();
    if (mountedRef.current) setWallets(data);
    setLoading(false);
    setStep(2);
  };

  const fundWallet = async () => {
    if (!fromWallet) return;
    setLoading(true); setError('');
    await addFunds(fromWallet.id, 500, 'CARD');
    if (!mountedRef.current) return;
    const w = await getWallet(fromWallet.id);
    if (mountedRef.current) { setFromWallet(w); setFromBal(w.balance); }
    const data = await getAllWallets();
    if (mountedRef.current) setWallets(data);
    setLoading(false);
    setStep(3);
  };

  const sendMoneyAction = async () => {
    if (!fromWallet || wallets.length < 2) { setError('Need at least 2 wallets'); return; }
    setLoading(true); setError('');
    const target = wallets.find(w => w.id !== fromWallet.id);
    if (!target) { setError('No other wallet found'); setLoading(false); return; }
    setToWallet(target);
    setShowFlow(true);
    setTimeout(async () => {
      const res = await sendMoney(fromWallet.id, target.id, amount, 'Simulation transfer');
      if (!mountedRef.current) return;
      if (res.error) { setError(res.error); setLoading(false); return; }
      setTxResult(res);
      setFromBal(res.fromBalance);
      setToBal(res.toBalance);
      setLoading(false);
      setStep(4);
    }, 1500);
  };

  const finishSim = () => {
    setStep(5);
  };

  const btnStyle = {
    padding: '8px 20px', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', color: '#fff', transition: 'all 0.2s',
    background: '#3b82f6', margin: '0 4px',
  };

  return (
    <div>
      <div className="step-indicator">
        {steps.map((s, i) => (
          <div key={s} className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} title={s} />
        ))}
        <span style={{ fontSize: 11, color: '#6a7a9e', marginLeft: 8 }}>{steps[step] || 'Idle'}</span>
      </div>

      <div className="scene">
        <div className="scene-wallet">
          {/* From Wallet */}
          {fromWallet && (
            <div className="wallet-visual" style={{ borderColor: '#3b82f6' }}>
              <div className="chip-icon">💳</div>
              <div className="name">{fromWallet.userName}</div>
              <div className="bal">₹{(fromBal || fromWallet.balance || 0).toFixed(2)}</div>
              <div className="sub">@{fromWallet.userId} • #{fromWallet.id}</div>
            </div>
          )}

          {!fromWallet && step === 0 && (
            <div className="wallet-visual" style={{ textAlign: 'center', borderStyle: 'dashed' }}>
              <div style={{ fontSize: 40, opacity: 0.3 }}>👛</div>
              <div style={{ color: '#6a7a9e', fontSize: 14 }}>No wallet yet — create one!</div>
            </div>
          )}

          {/* Flow arrow */}
          {showFlow && fromWallet && toWallet && (
            <div className="flow-line">
              <div className="flow-arrow">➡️</div>
              <div style={{ color: '#60a5fa', fontSize: 13, fontWeight: 700 }}>₹{amount}</div>
            </div>
          )}

          {/* To Wallet */}
          {toWallet && (
            <div className="wallet-visual" style={{ borderColor: '#22c55e' }}>
              <div className="chip-icon">💳</div>
              <div className="name">{toWallet.userName}</div>
              <div className="bal">₹{(toBal || toWallet.balance || 0).toFixed(2)}</div>
              <div className="sub">@{toWallet.userId} • #{toWallet.id}</div>
            </div>
          )}

          {!toWallet && step >= 3 && (
            <div className="wallet-visual" style={{ textAlign: 'center', borderStyle: 'dashed', borderColor: '#22c55e' }}>
              <div style={{ fontSize: 32 }}>🏦</div>
              <div style={{ color: '#6a7a9e', fontSize: 14 }}>Recipient wallet</div>
            </div>
          )}
        </div>

        {step === 1 && fromWallet && (
          <div className="popup">
            <div style={{ fontSize: 36 }}>👛</div>
            <div style={{ fontWeight: 700, color: '#60a5fa', fontSize: 15 }}>Wallet Created!</div>
            <div style={{ fontSize: 13, color: '#a8b8d8', marginTop: 4 }}>{fromWallet.userName} • #{fromWallet.id}</div>
          </div>
        )}

        {step === 2 && fromWallet && (
          <div className="popup">
            <div style={{ fontSize: 36 }}>💰</div>
            <div style={{ fontWeight: 700, color: '#22c55e', fontSize: 15 }}>Funds Added!</div>
            <div style={{ fontSize: 13, color: '#a8b8d8', marginTop: 4 }}>₹500 added via CARD</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#60a5fa', marginTop: 2 }}>₹{fromBal.toFixed(2)}</div>
          </div>
        )}

        {step === 4 && txResult && (
          <div className="popup">
            <div style={{ fontSize: 36 }}>✅</div>
            <div style={{ fontWeight: 700, color: '#22c55e', fontSize: 15 }}>Transfer Complete!</div>
            <div style={{ fontSize: 13, color: '#a8b8d8', marginTop: 4 }}>₹{amount} sent to {toWallet?.userName}</div>
          </div>
        )}

        {step === 5 && (
          <div className="popup done">
            <div style={{ fontSize: 36 }}>🎉</div>
            <div style={{ fontWeight: 700, color: '#22c55e', fontSize: 15 }}>Simulation Done!</div>
            <div style={{ fontSize: 12, color: '#a8b8d8', marginTop: 4 }}>Wallet flow completed successfully</div>
          </div>
        )}
      </div>

      {error && <div className="error">{error}<button onClick={reset} style={{ marginLeft: 12, padding: '4px 12px', background: '#1a2a4e', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#ccc' }}>↺ Reset</button></div>}

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        {step === 0 && <button onClick={startSim} style={{ padding: '12px 32px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>▶ Start Simulation</button>}

        {step === 1 && <button onClick={createUser} disabled={loading} style={btnStyle}>👛 Create Wallet {loading ? '...' : ''}</button>}

        {step === 2 && <button onClick={fundWallet} disabled={loading} style={{ ...btnStyle, background: '#22c55e' }}>💰 Add ₹500 {loading ? '...' : ''}</button>}

        {step === 3 && <button onClick={sendMoneyAction} disabled={loading} style={{ ...btnStyle, background: '#f59e0b' }}>📤 Send ₹{amount} {loading ? '...' : ''}</button>}

        {step === 4 && <button onClick={finishSim} style={{ ...btnStyle, background: '#22c55e' }}>✅ Finish</button>}

        {step === 5 && <button onClick={reset} style={{ ...btnStyle, background: '#3b82f6' }}>🔄 New Simulation</button>}
      </div>
    </div>
  );
}

export default function DigitalWalletPage() {
  const [tab, setTab] = useState('wallet');
  const tabs = ['wallet', 'simulation', 'diagram', 'design'];
  const tabLabels = { wallet: 'Wallet', simulation: 'Simulation', diagram: 'Class Diagram', design: 'Design Details' };

  return (
    <div className="wallet-page">
      <style>{styles}</style>
      <Link to="/" className="back-home">← Back</Link>
      <div className="wallet-title">👛 Digital Wallet</div>
      <div className="tab-bar">
        {tabs.map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {tabLabels[t]}
          </button>
        ))}
      </div>
      {tab === 'wallet' && <WalletView />}
      {tab === 'simulation' && <AnimatedFlow />}
      {tab === 'diagram' && <ClassDiagram module="wallet" />}
      {tab === 'design' && <DesignDetails module="wallet" />}
    </div>
  );
}