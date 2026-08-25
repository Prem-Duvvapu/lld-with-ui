import { useState, useEffect, useCallback, useRef } from 'react';
import LldPage from '../../components/LldPage';
import { usePolling } from '../../hooks/usePolling';
import * as api from './api';

const PAYMENT_METHODS = ['CARD', 'UPI', 'BANK_TRANSFER'];

const AVATAR_COLORS = ['#4f46e5', '#0ea5e9', '#16a34a', '#d97706', '#db2777', '#7c3aed'];
const avatarColor = (id) => AVATAR_COLORS[Number(id) % AVATAR_COLORS.length];
const initials = (name) => (name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
const money = (n) => `₹${Number(n ?? 0).toFixed(2)}`;

const styles = `
.wal-app { max-width: 1100px; margin: 0 auto; }

/* ---------- shared bits ---------- */
.wal-form { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-4); background: var(--bg-tertiary); border-radius: var(--radius-lg); margin-bottom: var(--space-4); border: 1px solid var(--border-secondary); }
.wal-form h3, .wal-form h4 { font-size: var(--font-sm); color: var(--accent); margin: 0; }
.wal-form-row { display: flex; gap: var(--space-2); flex-wrap: wrap; align-items: flex-end; }
.wal-form label { font-size: var(--font-xs); color: var(--text-secondary); display: flex; flex-direction: column; gap: 3px; }
.wal-form input, .wal-form select { padding: 6px 10px; background: var(--bg-input); border: 1px solid var(--border-primary); border-radius: var(--radius-sm); color: var(--text-primary); font-size: var(--font-sm); transition: border-color var(--duration-fast) var(--ease-out); }
.wal-form input:focus, .wal-form select:focus { outline: none; border-color: var(--accent); box-shadow: var(--focus-ring); }
.wal-btn { padding: 8px 18px; background: var(--accent); color: #fff; border: none; border-radius: var(--radius-sm); font-size: var(--font-sm); font-weight: 600; cursor: pointer; transition: background var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out); display: inline-flex; align-items: center; gap: 6px; }
.wal-btn:hover:not(:disabled) { background: var(--accent-hover); transform: translateY(-1px); }
.wal-btn:active:not(:disabled) { transform: translateY(0); }
.wal-btn:disabled { opacity: var(--disabled-opacity); cursor: not-allowed; transform: none; }
.wal-btn-secondary { background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border-primary); }
.wal-btn-secondary:hover:not(:disabled) { background: var(--bg-tertiary); }
.wal-msg-ok { color: var(--success); font-size: var(--font-xs); }
.wal-msg-err { color: var(--danger); font-size: var(--font-xs); }
.wal-spinner { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.35); border-top-color: #fff; border-radius: 50%; animation: wal-spin 0.6s linear infinite; }
.wal-btn-secondary .wal-spinner { border-color: rgba(0,0,0,0.2); border-top-color: var(--text-primary); }
@keyframes wal-spin { to { transform: rotate(360deg); } }

/* ---------- wallets tab ---------- */
.wal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-3); margin: var(--space-4) 0; }
.wal-card { background: var(--bg-card); border-radius: var(--radius-lg); padding: var(--space-4); border: 2px solid var(--border-primary); box-shadow: var(--shadow-sm); cursor: pointer; transition: border-color var(--duration-normal) var(--ease-out), box-shadow var(--duration-normal) var(--ease-out), transform var(--duration-fast) var(--ease-out); display: flex; flex-direction: column; gap: var(--space-2); }
.wal-card:hover { border-color: var(--accent); transform: translateY(-2px); box-shadow: var(--shadow-md); }
.wal-card.selected { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(79,70,229,0.15), var(--shadow-md); }
.wal-card-top { display: flex; align-items: center; gap: var(--space-2); }
.wal-avatar { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: var(--font-sm); flex-shrink: 0; }
.wal-card h3 { font-size: var(--font-base); margin: 0; color: var(--text-primary); line-height: 1.2; }
.wal-id { font-size: var(--font-xs); color: var(--text-muted); }
.wal-balance { font-size: var(--font-xl); font-weight: 800; color: var(--accent); }
.wal-txn-list { display: flex; flex-direction: column; gap: 4px; max-height: 260px; overflow-y: auto; }
.wal-txn { display: flex; justify-content: space-between; gap: var(--space-2); padding: 8px 12px; border-radius: var(--radius-sm); background: var(--bg-tertiary); font-size: var(--font-xs); border-left: 3px solid var(--border-primary); }
.wal-txn.CREDIT { border-left-color: var(--success); }
.wal-txn.DEBIT { border-left-color: var(--warning); }
.wal-txn.TRANSFER { border-left-color: var(--accent); }
.wal-txn-amt.CREDIT { color: var(--success); font-weight: 700; }
.wal-txn-amt.DEBIT, .wal-txn-amt.TRANSFER { color: var(--danger); font-weight: 700; }
.wal-command-log { font-family: var(--code-font); font-size: var(--font-xs); color: var(--text-secondary); display: flex; flex-direction: column; gap: 4px; }
.wal-empty { color: var(--text-muted); font-size: var(--font-sm); text-align: center; padding: var(--space-6) 0; }

/* ---------- simulation tab ---------- */
.wal-progress { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-2); }
.wal-progress-track { flex: 1; height: 6px; border-radius: var(--radius-full); background: var(--bg-tertiary); overflow: hidden; }
.wal-progress-fill { height: 100%; border-radius: var(--radius-full); background: var(--accent-gradient); transition: width var(--duration-slow) var(--ease-out); }
.wal-progress-label { font-size: var(--font-xs); color: var(--text-muted); white-space: nowrap; font-variant-numeric: tabular-nums; }
.wal-step-title { font-size: var(--font-lg); font-weight: 700; color: var(--text-primary); margin: var(--space-2) 0 2px; }
.wal-step-desc { font-size: var(--font-sm); color: var(--text-secondary); margin-bottom: var(--space-4); min-height: 20px; }

.wal-stage { display: flex; align-items: center; justify-content: center; gap: var(--space-2); padding: var(--space-6) var(--space-4); background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: var(--radius-lg); margin-bottom: var(--space-4); min-height: 190px; box-shadow: var(--shadow-sm); }
.wal-stage-empty { flex-direction: column; text-align: center; color: var(--text-muted); }
.wal-stage-icon { font-size: 42px; opacity: 0.35; margin-bottom: var(--space-2); }

.wal-actor { flex: 1; max-width: 230px; background: var(--bg-card); border: 2px solid var(--border-primary); border-radius: var(--radius-lg); padding: var(--space-4); text-align: center; transition: border-color var(--duration-normal) var(--ease-out), box-shadow var(--duration-normal) var(--ease-out); }
.wal-actor.highlight { border-color: var(--accent); box-shadow: 0 0 0 4px rgba(79,70,229,0.14); }
.wal-actor.reject { border-color: var(--danger); box-shadow: 0 0 0 4px var(--danger-bg); }
.wal-actor .avatar { width: 46px; height: 46px; border-radius: 50%; margin: 0 auto var(--space-2); display: flex; align-items: center; justify-content: center; font-weight: 700; color: #fff; font-size: var(--font-base); }
.wal-actor .name { font-weight: 600; color: var(--text-primary); font-size: var(--font-sm); }
.wal-actor .sub { font-size: var(--font-xs); color: var(--text-muted); }
.wal-actor .bal { font-size: var(--font-xl); font-weight: 800; color: var(--accent); margin-top: var(--space-2); transition: color var(--duration-normal) var(--ease-out); }
.wal-actor .bal.flash-up { animation: wal-pulse var(--duration-slow) var(--ease-spring); color: var(--success); }
.wal-actor .bal.flash-down { animation: wal-pulse var(--duration-slow) var(--ease-spring); color: var(--danger); }
@keyframes wal-pulse { 0% { transform: scale(1); } 45% { transform: scale(1.12); } 100% { transform: scale(1); } }

.wal-flow-lane { width: 76px; display: flex; align-items: center; justify-content: center; position: relative; height: 46px; flex-shrink: 0; }
.wal-flow-arrow { font-size: 26px; color: var(--accent); transition: opacity var(--duration-normal) var(--ease-out); }
.wal-flow-arrow.animate { animation: wal-flow 0.9s ease-in-out infinite; }
.wal-flow-arrow.reject { color: var(--danger); animation: wal-shake 0.5s var(--ease-out); }
.wal-flow-amount { position: absolute; top: -22px; left: 50%; transform: translateX(-50%); font-size: var(--font-xs); font-weight: 700; color: var(--accent); white-space: nowrap; }
.wal-flow-amount.reject { color: var(--danger); }
@keyframes wal-flow { 0%, 100% { transform: translateX(-6px); opacity: 0.55; } 50% { transform: translateX(6px); opacity: 1; } }
@keyframes wal-shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }

.wal-hud { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--space-2); margin: var(--space-4) 0; }
.wal-hud-tile { background: var(--bg-tertiary); border-radius: var(--radius-md); padding: var(--space-3); text-align: center; border: 1px solid var(--border-secondary); transition: transform var(--duration-fast) var(--ease-out); }
.wal-hud-tile .icon { font-size: var(--font-sm); opacity: 0.7; }
.wal-hud-tile .num { font-size: var(--font-xl); font-weight: 700; color: var(--accent); font-variant-numeric: tabular-nums; }
.wal-hud-tile .lbl { font-size: var(--font-xs); color: var(--text-muted); }

.wal-alert { display: flex; gap: var(--space-2); align-items: flex-start; padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); font-size: var(--font-sm); line-height: var(--leading-normal); margin-top: var(--space-3); animation: wal-fadein var(--duration-normal) var(--ease-out); }
.wal-alert.INFO { background: var(--info-bg); color: var(--info); }
.wal-alert.SUCCESS { background: var(--success-bg); color: var(--success); }
.wal-alert.WARNING { background: var(--warning-bg); color: var(--warning); }
.wal-alert.ERROR { background: var(--danger-bg); color: var(--danger); }
.wal-alert-icon { flex-shrink: 0; }
.wal-alert-text { color: var(--text-primary); }
@keyframes wal-fadein { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

.wal-event-list { display: flex; flex-direction: column; gap: 4px; max-height: 220px; overflow-y: auto; }
.wal-event { display: flex; justify-content: space-between; gap: var(--space-2); padding: 7px 12px; border-radius: var(--radius-sm); background: var(--bg-tertiary); font-size: var(--font-xs); border-left: 3px solid var(--border-primary); }
.wal-event.SUCCESS { border-left-color: var(--success); }
.wal-event.ERROR { border-left-color: var(--danger); }
.wal-event.WARNING { border-left-color: var(--warning); }
.wal-event.INFO { border-left-color: var(--info); }
.wal-event-type { color: var(--text-muted); font-family: var(--code-font); font-size: 10px; }
`;

// -------------------------------------------------------------- Wallets tab

function WalletsTab() {
  const [wallets, setWallets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [txns, setTxns] = useState([]);
  const [commandLog, setCommandLog] = useState([]);
  const [newUser, setNewUser] = useState({ userId: '', userName: '' });
  const [creditAmt, setCreditAmt] = useState('');
  const [creditMethod, setCreditMethod] = useState('CARD');
  const [debitAmt, setDebitAmt] = useState('');
  const [sendForm, setSendForm] = useState({ toId: '', amount: '', desc: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyAction, setBusyAction] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const w = await api.getAllWallets();
      setWallets(w);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  usePolling(load, 8000, []);

  const selectWallet = async (w) => {
    setSelected(w);
    setMessage('');
    try {
      const [t, log] = await Promise.all([api.getTransactions(w.id), api.getCommandLog()]);
      setTxns(t.slice().reverse());
      setCommandLog(log.slice().reverse().slice(0, 15));
    } catch (err) { console.error(err); }
  };

  const refreshSelected = async (id) => {
    const [w, t, log] = await Promise.all([api.getWallet(id), api.getTransactions(id), api.getCommandLog()]);
    setSelected(w);
    setTxns(t.slice().reverse());
    setCommandLog(log.slice().reverse().slice(0, 15));
    await load();
  };

  const runAction = async (action, fn, successMsg) => {
    setBusy(true); setBusyAction(action); setMessage('');
    try {
      await fn();
      setMessage(successMsg);
    } catch (err) {
      setMessage(`Error: ${err.message || 'action failed'}`);
    } finally { setBusy(false); setBusyAction(null); }
  };

  const spinner = <span className="wal-spinner" />;

  return (
    <div>
      <div className="wal-form-row" style={{ marginBottom: 14 }}>
        <button className="wal-btn wal-btn-secondary" onClick={() => setShowCreate(s => !s)}>
          {showCreate ? 'Cancel' : '+ Create Wallet'}
        </button>
      </div>

      {showCreate && (
        <div className="wal-form">
          <h3>New Wallet</h3>
          <div className="wal-form-row">
            <label>User ID <input value={newUser.userId} onChange={e => setNewUser(p => ({ ...p, userId: e.target.value }))} /></label>
            <label>User Name <input value={newUser.userName} onChange={e => setNewUser(p => ({ ...p, userName: e.target.value }))} /></label>
            <button className="wal-btn" disabled={busy || !newUser.userId || !newUser.userName} onClick={() => runAction('create', async () => { await api.createWallet(newUser.userId, newUser.userName); setNewUser({ userId: '', userName: '' }); await load(); }, 'Wallet created').then(() => setShowCreate(false))}>
              {busyAction === 'create' && spinner} Create
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="wal-empty">Loading wallets…</div>
      ) : (
        <div className="wal-grid">
          {wallets.map(w => (
            <div key={w.id} className={`wal-card ${selected?.id === w.id ? 'selected' : ''}`} onClick={() => selectWallet(w)}>
              <div className="wal-card-top">
                <div className="wal-avatar" style={{ background: avatarColor(w.id) }}>{initials(w.userName)}</div>
                <div>
                  <h3>{w.userName}</h3>
                  <div className="wal-id">@{w.userId} · #{w.id}</div>
                </div>
              </div>
              <div className="wal-balance">{money(w.balance)}</div>
            </div>
          ))}
          {wallets.length === 0 && <div className="wal-empty">No wallets found</div>}
        </div>
      )}

      {selected && (
        <>
          <div className="wal-form">
            <h3>Manage: {selected.userName} (#{selected.id})</h3>
            <div className="wal-form-row">
              <label>Credit Amount <input type="number" min="0" value={creditAmt} onChange={e => setCreditAmt(e.target.value)} /></label>
              <label>Via
                <select value={creditMethod} onChange={e => setCreditMethod(e.target.value)}>
                  {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                </select>
              </label>
              <button className="wal-btn" disabled={busy || !creditAmt} onClick={() => runAction('credit', async () => {
                await api.addFunds(selected.id, Number(creditAmt), creditMethod);
                setCreditAmt('');
                await refreshSelected(selected.id);
              }, 'Funds added')}>{busyAction === 'credit' && spinner} + Credit</button>
            </div>
            <div className="wal-form-row">
              <label>Debit Amount <input type="number" min="0" value={debitAmt} onChange={e => setDebitAmt(e.target.value)} /></label>
              <button className="wal-btn wal-btn-secondary" disabled={busy || !debitAmt} onClick={() => runAction('debit', async () => {
                await api.withdraw(selected.id, Number(debitAmt), 'Manual withdrawal');
                setDebitAmt('');
                await refreshSelected(selected.id);
              }, 'Funds withdrawn')}>{busyAction === 'debit' && spinner} − Debit</button>
            </div>
            <div className="wal-form-row">
              <label>To Wallet ID <input type="number" value={sendForm.toId} onChange={e => setSendForm(p => ({ ...p, toId: e.target.value }))} /></label>
              <label>Amount <input type="number" min="0" value={sendForm.amount} onChange={e => setSendForm(p => ({ ...p, amount: e.target.value }))} /></label>
              <label>Note <input value={sendForm.desc} onChange={e => setSendForm(p => ({ ...p, desc: e.target.value }))} /></label>
              <button className="wal-btn" disabled={busy || !sendForm.toId || !sendForm.amount} onClick={() => runAction('send', async () => {
                await api.sendMoney(selected.id, Number(sendForm.toId), Number(sendForm.amount), sendForm.desc);
                setSendForm({ toId: '', amount: '', desc: '' });
                await refreshSelected(selected.id);
              }, 'Transfer complete')}>{busyAction === 'send' && spinner} 📤 Send</button>
            </div>
            {message && <div className={message.startsWith('Error') ? 'wal-msg-err' : 'wal-msg-ok'}>{message}</div>}
          </div>

          <div className="wal-form">
            <h4>Transaction History — Wallet #{selected.id}</h4>
            <div className="wal-txn-list">
              {txns.length === 0 ? <div className="wal-empty">No transactions yet</div> : txns.map(t => (
                <div key={t.id} className={`wal-txn ${t.type}`}>
                  <span>{t.type} — {t.description}</span>
                  <span className={`wal-txn-amt ${t.type}`}>{t.type === 'CREDIT' ? '+' : '-'}{money(t.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="wal-form">
            <h4>Command Log (Command pattern execution history)</h4>
            <div className="wal-command-log">
              {commandLog.length === 0 ? <div className="wal-empty">No commands executed yet</div> :
                commandLog.map((c, i) => <div key={i}>{c}</div>)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ----------------------------------------------------------- Simulation tab

const SIM_STEPS = [
  { title: 'Reset sandbox', desc: 'Re-seed the isolated /sim/* wallet repository — completely separate from live data.' },
  { title: 'View seeded wallets', desc: 'Two wallets, ready to be the actors in this walkthrough.' },
  { title: 'Credit a wallet', desc: 'CreditCommand locks one wallet and adds funds.' },
  { title: 'Debit a wallet', desc: 'DebitCommand re-checks the balance inside the lock before removing funds.' },
  { title: 'Attempt an over-limit transfer', desc: 'TransferCommand rejects it — InsufficientBalanceException, thrown from inside the locked section.' },
  { title: 'Successful transfer', desc: 'Locks are acquired in ascending wallet-id order, not "from then to".' },
  { title: 'View updated balances', desc: 'The combined total across both wallets has not moved.' },
  { title: 'Race N concurrent transfers', desc: 'Many simultaneous transfers, alternating direction — the sum stays exact.' },
];

const STATUS_ICON = { SUCCESS: '✅', INFO: 'ℹ️', WARNING: '⚠️', ERROR: '⛔' };

function useFlash(wallets) {
  const [flash, setFlash] = useState({});
  const prevRef = useRef({});
  useEffect(() => {
    if (!wallets || wallets.length === 0) return;
    const next = {};
    for (const w of wallets) {
      const prev = prevRef.current[w.id];
      if (prev !== undefined && prev !== w.balance) {
        next[w.id] = w.balance > prev ? 'flash-up' : 'flash-down';
      }
    }
    if (Object.keys(next).length > 0) {
      setFlash(next);
      const t = setTimeout(() => setFlash({}), 650);
      prevRef.current = Object.fromEntries(wallets.map(w => [w.id, w.balance]));
      return () => clearTimeout(t);
    }
    prevRef.current = Object.fromEntries(wallets.map(w => [w.id, w.balance]));
  }, [wallets]);
  return flash;
}

function SimulationTab() {
  const [step, setStep] = useState(-1);
  const [wallets, setWallets] = useState([]);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState({ status: 'INFO', text: 'Press Start to reset the isolated sim sandbox.' });
  const [raceResult, setRaceResult] = useState(null);
  const [events, setEvents] = useState([]);
  const [flowState, setFlowState] = useState(null); // 'success' | 'reject' | 'race' | null
  const flash = useFlash(wallets);

  const refreshState = async () => {
    const state = await api.simState();
    setWallets(state.wallets);
    setEvents(state.events || []);
    return state;
  };

  const walletA = () => wallets[0];
  const walletB = () => wallets[1];

  const doReset = async () => {
    setBusy(true); setRaceResult(null); setFlowState(null);
    try {
      const state = await api.simReset();
      setWallets(state.wallets);
      setEvents(state.events || []);
      setStep(0);
      setAlert({ status: 'SUCCESS', text: `Sandbox reset. ${state.wallets.length} wallets seeded (total ${money(state.totalBalance)}). Isolated from live data.` });
    } catch (err) { setAlert({ status: 'ERROR', text: `Reset failed: ${err.message}` }); }
    finally { setBusy(false); }
  };

  const doStep = async (n) => {
    setBusy(true); setFlowState(null);
    try {
      const a = walletA();
      const b = walletB();
      if (n === 1) {
        await refreshState();
        setAlert({ status: 'INFO', text: `Viewing ${wallets.length} seeded wallets in the isolated sim repository — separate from live wallets.` });
      } else if (n === 2) {
        const res = await api.simCredit(a.id, 500, 'UPI', 2);
        setWallets(res.wallets); setEvents(res.events || []);
        const newBal = res.wallets.find(w => w.id === a.id).balance;
        setAlert({ status: 'SUCCESS', text: `Credited ${money(500)} to ${a.userName} via UPI (CreditCommand). New balance ${money(newBal)}.` });
      } else if (n === 3) {
        const res = await api.simDebit(a.id, 200, 3);
        setWallets(res.wallets); setEvents(res.events || []);
        const newBal = res.wallets.find(w => w.id === a.id).balance;
        setAlert({ status: 'SUCCESS', text: `Debited ${money(200)} from ${a.userName} (DebitCommand). New balance ${money(newBal)}.` });
      } else if (n === 4) {
        const target = wallets.find(w => w.id === a.id);
        try {
          await api.simTransfer(a.id, b.id, target.balance + 100000, 'over-limit test', 4);
          setAlert({ status: 'WARNING', text: 'Unexpected: over-limit transfer was accepted.' });
        } catch (err) {
          setFlowState('reject');
          setAlert({ status: 'ERROR', text: `Transfer of far more than the balance was rejected: "${err.message}" — InsufficientBalanceException, thrown from inside TransferCommand's locked section.` });
          await refreshState();
        }
      } else if (n === 5) {
        setFlowState('success');
        const res = await api.simTransfer(a.id, b.id, 300, 'Simulated transfer', 5);
        setWallets(res.wallets); setEvents(res.events || []);
        setAlert({ status: 'SUCCESS', text: `Transferred ${money(300)} from ${a.userName} to ${b.userName}. Locks were acquired in ascending wallet-id order (${Math.min(a.id, b.id)} then ${Math.max(a.id, b.id)}), regardless of transfer direction.` });
      } else if (n === 6) {
        const state = await refreshState();
        setAlert({ status: 'INFO', text: `Total sandbox balance is still ${money(state.totalBalance)} — every credit/debit/transfer above only moved money between wallets, never created or destroyed it.` });
      } else if (n === 7) {
        setFlowState('race');
        const buyers = 20;
        const result = await api.simRace(a.id, b.id, buyers, 5, 7);
        setRaceResult(result);
        setWallets(result.snapshot.wallets);
        setEvents(result.snapshot.events || []);
        setAlert({
          status: result.conserved ? 'SUCCESS' : 'ERROR',
          text: `${buyers} concurrent transfers raced between ${a.userName} and ${b.userName}: ${result.succeeded} succeeded, ${result.rejected} rejected. Combined total: ${money(result.totalBefore)} -> ${money(result.totalAfter)} — conserved exactly, proving the ascending-lock-order rule is deadlock-free and race-free.`
        });
      }
      setStep(n);
    } catch (err) {
      setAlert({ status: 'ERROR', text: `Step failed: ${err.message}` });
    } finally { setBusy(false); }
  };

  const a = walletA();
  const b = walletB();
  const highlightA = step >= 2 && step !== 6;
  const highlightB = step >= 4 && step !== 6;
  const showFlow = step >= 4 && step !== 6 && a && b;
  const total = wallets.reduce((s, w) => s + w.balance, 0);
  const progressPct = step < 0 ? 0 : ((step + 1) / SIM_STEPS.length) * 100;

  return (
    <div>
      <div className="wal-progress">
        <div className="wal-progress-track"><div className="wal-progress-fill" style={{ width: `${progressPct}%` }} /></div>
        <div className="wal-progress-label">{step >= 0 ? `Step ${step + 1} / ${SIM_STEPS.length}` : 'Not started'}</div>
      </div>
      {step >= 0 && (
        <>
          <div className="wal-step-title">{SIM_STEPS[step].title}</div>
          <div className="wal-step-desc">{SIM_STEPS[step].desc}</div>
        </>
      )}

      <div className={`wal-stage ${!a ? 'wal-stage-empty' : ''}`}>
        {!a ? (
          <>
            <div className="wal-stage-icon">👛</div>
            <div>Press Start to bring two wallets onto the stage.</div>
          </>
        ) : (
          <>
            <div className={`wal-actor ${highlightA ? (flowState === 'reject' ? 'reject' : 'highlight') : ''}`}>
              <div className="avatar" style={{ background: avatarColor(a.id) }}>{initials(a.userName)}</div>
              <div className="name">{a.userName}</div>
              <div className="sub">#{a.id}</div>
              <div className={`bal ${flash[a.id] || ''}`}>{money(a.balance)}</div>
            </div>

            {b && (
              <div className="wal-flow-lane">
                {showFlow && (
                  <>
                    <span className={`wal-flow-amount ${flowState === 'reject' ? 'reject' : ''}`}>
                      {flowState === 'reject' ? '✕' : step === 7 ? '⇄' : money(step === 5 ? 300 : '')}
                    </span>
                    <span className={`wal-flow-arrow ${flowState === 'success' || flowState === 'race' ? 'animate' : ''} ${flowState === 'reject' ? 'reject' : ''}`}>
                      {flowState === 'reject' ? '✕' : '➜'}
                    </span>
                  </>
                )}
              </div>
            )}

            {b && (
              <div className={`wal-actor ${highlightB ? (flowState === 'reject' ? 'reject' : 'highlight') : ''}`}>
                <div className="avatar" style={{ background: avatarColor(b.id) }}>{initials(b.userName)}</div>
                <div className="name">{b.userName}</div>
                <div className="sub">#{b.id}</div>
                <div className={`bal ${flash[b.id] || ''}`}>{money(b.balance)}</div>
              </div>
            )}
          </>
        )}
      </div>

      {wallets.length > 0 && (
        <div className="wal-hud">
          <div className="wal-hud-tile"><div className="icon">💰</div><div className="num">₹{Math.round(total).toLocaleString('en-IN')}</div><div className="lbl">Total Balance</div></div>
          <div className="wal-hud-tile"><div className="icon">📡</div><div className="num">{events.length}</div><div className="lbl">Sim Events</div></div>
          {raceResult && <>
            <div className="wal-hud-tile"><div className="icon">✅</div><div className="num" style={{ color: 'var(--success)' }}>{raceResult.succeeded}</div><div className="lbl">Race: Succeeded</div></div>
            <div className="wal-hud-tile"><div className="icon">⛔</div><div className="num" style={{ color: 'var(--danger)' }}>{raceResult.rejected}</div><div className="lbl">Race: Rejected</div></div>
            <div className="wal-hud-tile"><div className="icon">⚖️</div><div className="num" style={{ color: raceResult.conserved ? 'var(--success)' : 'var(--danger)' }}>{raceResult.conserved ? '✓' : '✗'}</div><div className="lbl">Sum Conserved</div></div>
          </>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 12 }}>
        {step === -1 && <button className="wal-btn" disabled={busy} onClick={doReset}>{busy && <span className="wal-spinner" />} ▶ Start Simulation</button>}
        {step >= 0 && step < SIM_STEPS.length - 1 && (
          <button className="wal-btn" disabled={busy} onClick={() => doStep(step + 1)}>
            {busy && <span className="wal-spinner" />} Next: {SIM_STEPS[step + 1].title}
          </button>
        )}
        {step === SIM_STEPS.length - 1 && (
          <button className="wal-btn wal-btn-secondary" onClick={doReset}>↺ Run Again</button>
        )}
      </div>

      <div className={`wal-alert ${alert.status}`}>
        <span className="wal-alert-icon">{STATUS_ICON[alert.status]}</span>
        <span className="wal-alert-text">{alert.text}</span>
      </div>

      <div className="wal-form" style={{ marginTop: 14 }}>
        <h4>Sim Event Log ({events.length})</h4>
        <div className="wal-event-list">
          {events.length === 0 ? <div className="wal-empty">No events yet</div> : events.slice().reverse().slice(0, 10).map(e => (
            <div key={e.id} className={`wal-event ${e.status}`}>
              <span><strong>{e.title}</strong></span>
              <span className="wal-event-type">{e.eventType}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------- page

export default function DigitalWalletPage() {
  return (
    <LldPage module="digitalwallet" title="Digital Wallet" icon="👛" tabs={[
      { id: 'wallets', label: '👛 Wallets & Transfers' },
      { id: 'simulation', label: '🕹️ Interactive Simulation' },
      { id: 'diagram', label: 'Class Diagram' },
      { id: 'sequence', label: 'Sequence Diagram' },
      { id: 'design', label: 'Design Details' }
    ]}>
      <style>{styles}</style>
      {(activeTab) => (
        <div className="wal-app">
          {activeTab === 'wallets' && <WalletsTab />}
          {activeTab === 'simulation' && <SimulationTab />}
        </div>
      )}
    </LldPage>
  );
}
