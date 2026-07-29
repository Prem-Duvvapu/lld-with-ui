import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { authenticate, getBalance, withdraw, deposit, getTransactions } from './api';
import ClassDiagram from '../../components/ClassDiagram';
import DesignDetails from '../../components/DesignDetails';

const styles = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: linear-gradient(135deg, #0f0c29, #302b63, #24243e); min-height: 100vh; display: flex; justify-content: center; align-items: center; font-family: 'Courier New', monospace; }
.atm-machine { max-width: 420px; width: 100%; margin: 20px; background: linear-gradient(145deg, #4a4a4a, #2d2d2d); border: 4px solid #6b6b6b; border-radius: 20px; padding: 30px 20px 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.8), inset 0 0 20px rgba(255,255,255,0.05); }
.atm-screen { background: #0a1a0a; border: 3px solid #2a3a2a; border-radius: 12px; padding: 24px 20px; min-height: 380px; color: #33ff33; box-shadow: inset 0 0 30px rgba(0,0,0,0.9); position: relative; overflow: hidden; }
.atm-screen::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.03) 2px, rgba(0,255,0,0.03) 4px); pointer-events: none; }
.atm-title { text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 8px; color: #33ff33; text-shadow: 0 0 10px #33ff33, 0 0 20px #33ff33; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #1a3a1a; }
.atm-input { width: 100%; padding: 12px 14px; margin-bottom: 12px; background: #0d1f0d; border: 1px solid #33ff33; border-radius: 6px; color: #33ff33; font-family: 'Courier New', monospace; font-size: 16px; outline: none; letter-spacing: 2px; }
.atm-input:focus { box-shadow: 0 0 8px rgba(51,255,51,0.4); }
.atm-btn { width: 100%; padding: 14px; margin-bottom: 10px; background: linear-gradient(180deg, #1a3a1a, #0d2a0d); border: 1px solid #33ff33; border-radius: 6px; color: #33ff33; font-family: 'Courier New', monospace; font-size: 14px; font-weight: bold; cursor: pointer; text-transform: uppercase; letter-spacing: 2px; transition: all 0.15s ease; }
.atm-btn:hover { background: linear-gradient(180deg, #2a4a2a, #1a3a1a); box-shadow: 0 0 12px rgba(51,255,51,0.3); }
.atm-btn:active { transform: scale(0.97); }
.atm-btn-block { padding: 20px 14px; font-size: 16px; margin-bottom: 10px; }
.atm-btn-small { padding: 10px; font-size: 12px; margin-bottom: 0; }
.atm-btn-back { background: linear-gradient(180deg, #2a1a1a, #1a0d0d); border-color: #ff3333; color: #ff6666; margin-top: 8px; }
.atm-btn-back:hover { box-shadow: 0 0 12px rgba(255,51,51,0.3); }
.atm-btn-clear { background: linear-gradient(180deg, #2a2a1a, #1a1a0d); border-color: #ffff33; color: #ffff66; }
.atm-btn-clear:hover { box-shadow: 0 0 12px rgba(255,255,51,0.3); }
.atm-btn-danger { background: linear-gradient(180deg, #3a1a1a, #2a0d0d); border-color: #ff3333; color: #ff6666; }
.atm-btn-danger:hover { box-shadow: 0 0 12px rgba(255,51,51,0.4); }
.keypad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; max-width: 240px; margin: 0 auto 10px; }
.keypad-btn { padding: 16px; background: #0d1f0d; border: 1px solid #33ff33; border-radius: 6px; color: #33ff33; font-family: 'Courier New', monospace; font-size: 20px; font-weight: bold; cursor: pointer; transition: all 0.1s ease; }
.keypad-btn:hover { background: #1a3a1a; box-shadow: 0 0 8px rgba(51,255,51,0.3); }
.keypad-btn:active { transform: scale(0.95); }
.keypad-btn-wide { grid-column: span 2; }
.keypad-btn-clear { border-color: #ffff33; color: #ffff66; }
.keypad-btn-clear:hover { box-shadow: 0 0 8px rgba(255,255,51,0.3); }
.keypad-btn-enter { border-color: #33ff33; color: #33ff33; background: #0d2a0d; }
.keypad-btn-enter:hover { background: #1a3a1a; box-shadow: 0 0 8px rgba(51,255,51,0.4); }
.pin-dots { text-align: center; margin-bottom: 16px; font-size: 32px; letter-spacing: 12px; min-height: 40px; }
.withdraw-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 10px; }
.withdraw-amount-btn { padding: 18px 8px; background: #0d1f0d; border: 1px solid #33ff33; border-radius: 6px; color: #33ff33; font-family: 'Courier New', monospace; font-size: 16px; font-weight: bold; cursor: pointer; transition: all 0.1s ease; }
.withdraw-amount-btn:hover { background: #1a3a1a; box-shadow: 0 0 8px rgba(51,255,51,0.3); }
.withdraw-amount-btn:active { transform: scale(0.95); }
.balance-display { text-align: center; padding: 20px 0; }
.balance-display .amount { font-size: 36px; font-weight: bold; text-shadow: 0 0 10px #33ff33; margin-top: 8px; }
.receipt { background: #0d0d0d; border: 1px dashed #33ff33; padding: 16px; margin: 12px 0; font-size: 12px; line-height: 1.8; color: #66ff66; }
.receipt-line { display: flex; justify-content: space-between; }
.receipt-divider { text-align: center; color: #33ff33; letter-spacing: 4px; margin: 4px 0; }
.hint { text-align: center; font-size: 11px; color: #1a6a1a; margin-top: 12px; line-height: 1.6; }
.hint strong { color: #33ff33; }
.loading { text-align: center; padding: 20px; animation: blink 1s step-end infinite; }
.error { text-align: center; color: #ff4444; padding: 10px; margin-bottom: 10px; border: 1px solid #ff4444; border-radius: 6px; background: rgba(255,0,0,0.1); font-size: 13px; }
.success { text-align: center; color: #33ff33; padding: 10px; margin-bottom: 10px; border: 1px solid #33ff33; border-radius: 6px; background: rgba(0,255,0,0.05); font-size: 13px; }
.transaction-list { max-height: 220px; overflow-y: auto; margin-bottom: 10px; }
.transaction-item { padding: 8px 4px; border-bottom: 1px solid #1a3a1a; font-size: 12px; display: flex; justify-content: space-between; }
.transaction-item:last-child { border-bottom: none; }
.transaction-credit { color: #33ff33; }
.transaction-debit { color: #ff6666; }
.no-transactions { text-align: center; color: #1a6a1a; padding: 20px; }
@keyframes blink { 50% { opacity: 0; } }
.fade-in { animation: fadeIn 0.3s ease-in; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.slide-up { animation: slideUp 0.35s ease-out; }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.back-home { display: inline-block; margin-bottom: 16px; padding: 8px 16px; border: 1px solid #33ff33; border-radius: 6px; color: #33ff33; text-decoration: none; font-size: 14px; font-weight: 600; transition: all 0.2s; }
.back-home:hover { background: #33ff33; color: #0a1a0a; }
.atm-scene { position: relative; width: 100%; min-height: 400px; background: linear-gradient(180deg, #0a3d2e 0%, #0d2818 100%); border-radius: 12px; padding: 20px; margin-bottom: 12px; overflow: hidden; border: 2px solid #00ff41; }
.atm-machine-visual { max-width: 340px; margin: 0 auto; background: #1a3a2a; border-radius: 12px; padding: 20px; border: 3px solid #2a5a3a; position: relative; }
.atm-screen-visual { background: #0a1a10; border: 2px solid #00ff41; border-radius: 6px; padding: 16px; min-height: 120px; color: #00ff41; font-family: monospace; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: all 0.5s; }
.atm-keypad-visual { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; max-width: 180px; margin: 12px auto; }
.atm-key { padding: 10px; background: #1a3a2a; border: 1px solid #2a5a3a; border-radius: 4px; color: #00ff41; font-size: 16px; font-weight: 700; text-align: center; font-family: monospace; transition: all 0.2s; }
.atm-key.pressed { background: #00ff41; color: #0a1a10; }
.atm-card-slot { position: relative; height: 20px; background: #0a1a10; border-radius: 2px; margin-top: 8px; border: 1px solid #2a5a3a; overflow: hidden; }
.atm-card { position: absolute; right: -60px; top: 50%; transform: translateY(-50%); font-size: 20px; transition: right 1s ease-out; }
.atm-card.inserted { right: 10px; }
.atm-dispenser { position: relative; height: 40px; margin-top: 8px; display: flex; align-items: center; justify-content: center; }
.atm-cash { font-size: 24px; opacity: 0; transform: translateY(20px); transition: all 0.8s ease-out; }
.atm-cash.visible { opacity: 1; transform: translateY(0); }
.atm-receipt { position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%); background: #fff; color: #333; padding: 12px 20px; border-radius: 4px; font-family: monospace; font-size: 11px; text-align: center; transition: all 0.5s; opacity: 0; z-index: 5; }
.atm-receipt.visible { opacity: 1; bottom: 20px; }
.step-indicator { display: flex; gap: 4px; justify-content: center; margin-bottom: 12px; }
.step-dot { width: 10px; height: 10px; border-radius: 50%; background: #1a5a3a; transition: all 0.3s; }
.step-dot.active { background: #00ff41; box-shadow: 0 0 8px rgba(0,255,65,0.5); }
.step-dot.done { background: #3fb950; }
`;

const PRESET_AMOUNTS = [20, 40, 60, 100, 200, 500];

function AtmScreen({ screen, setScreen, cardNumber, setCardNumber, account, onAuthenticated, onExit }) {
  const [pin, setPin] = useState('');
  const [balanceData, setBalanceData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const pinRef = useRef(null);

  useEffect(() => { setError(''); setSuccessMsg(''); }, [screen]);
  useEffect(() => { if (screen === 'pinEntry' && pinRef.current) pinRef.current.focus(); }, [screen]);

  const showError = (msg) => { setError(msg); setSuccessMsg(''); };
  const showSuccess = (msg) => { setSuccessMsg(msg); setError(''); };

  const handleInsertCard = () => {
    if (!cardNumber.trim()) { showError('Please enter a card number'); return; }
    showError(''); setScreen('pinEntry');
  };

  const handlePinSubmit = async () => {
    if (pin.length < 4) { showError('Enter at least 4 digits'); return; }
    setLoading(true); showError('');
    try {
      const data = await authenticate(cardNumber.trim(), pin);
      if (data && !data.error) { onAuthenticated(data); }
      else { showError('Invalid PIN. Try again.'); setPin(''); }
    } catch { showError('Authentication failed.'); setPin(''); }
    finally { setLoading(false); }
  };

  const handleKeypadPress = (key) => {
    showError('');
    if (key === 'clear') { setPin(''); return; }
    if (key === 'enter') { handlePinSubmit(); return; }
    if (pin.length >= 4) return;
    setPin(prev => prev + key);
  };

  useEffect(() => { if (pin.length === 4) handlePinSubmit(); }, [pin]);

  const handleFetchBalance = async () => {
    setLoading(true); showError('');
    try { const data = await getBalance(account.accountNumber); setBalanceData(data); setScreen('balance'); }
    catch { showError('Could not fetch balance'); }
    finally { setLoading(false); }
  };

  const handleWithdrawPreset = async (amount) => {
    setLoading(true); showError('');
    try {
      const data = await withdraw(account.accountNumber, amount);
      if (data && data.error === undefined) {
        setLastReceipt({ type: 'WITHDRAWAL', amount, newBalance: account.balance - amount, timestamp: new Date().toLocaleString() });
        account.balance -= amount;
        setScreen('receipt');
      } else { showError('Withdrawal failed'); }
    } catch { showError('Network error during withdrawal'); }
    finally { setLoading(false); }
  };

  const handleCustomWithdraw = async () => {
    const amt = parseFloat(customAmount);
    if (!amt || amt <= 0) { showError('Enter a valid amount'); return; }
    await handleWithdrawPreset(amt);
  };

  const handleDeposit = async () => {
    const amt = parseFloat(depositAmount);
    if (!amt || amt <= 0) { showError('Enter a valid amount'); return; }
    setLoading(true); showError('');
    try {
      const data = await deposit(account.accountNumber, amt);
      if (data && data.error === undefined) {
        setLastReceipt({ type: 'DEPOSIT', amount: amt, newBalance: account.balance + amt, timestamp: new Date().toLocaleString() });
        account.balance += amt;
        setScreen('receipt');
      } else { showError('Deposit failed'); }
    } catch { showError('Network error during deposit'); }
    finally { setLoading(false); }
  };

  const handleFetchTransactions = async () => {
    setLoading(true); showError('');
    try { const data = await getTransactions(account.accountNumber); setTransactions(data); setScreen('transaction'); }
    catch { showError('Could not fetch transactions'); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="loading slide-up">PROCESSING...</div>;

  if (screen === 'insertCard') {
    return (
      <div className="slide-up">
        <div style={{ textAlign: 'center', marginBottom: 16, fontSize: 12 }}>PLEASE INSERT YOUR CARD</div>
        <input className="atm-input" type="text" placeholder="Card Number" value={cardNumber} onChange={e => { setCardNumber(e.target.value); setError(''); }} onKeyDown={e => e.key === 'Enter' && handleInsertCard()} autoFocus />
        <button className="atm-btn atm-btn-block" onClick={handleInsertCard}>INSERT CARD</button>
        {error && <div className="error">{error}</div>}
        <div className="hint"><strong>Test Accounts:</strong><br />Alice: 123456 / PIN 1234<br />Bob: 789012 / PIN 5678<br />Charlie: 345678 / PIN 9012</div>
      </div>
    );
  }

  if (screen === 'pinEntry') {
    return (
      <div className="slide-up">
        <div style={{ textAlign: 'center', marginBottom: 8, fontSize: 12 }}>ENTER YOUR PIN</div>
        <div className="pin-dots">{pin.padEnd(4, '_').split('').map((c, i) => <span key={i}>{c === '_' ? '\u25CB' : '\u25CF'}</span>)}</div>
        {error && <div className="error">{error}</div>}
        <div className="keypad">
          {[1,2,3,4,5,6,7,8,9].map(n => <button key={n} className="keypad-btn" onClick={() => handleKeypadPress(String(n))}>{n}</button>)}
          <button className="keypad-btn keypad-btn-clear" onClick={() => handleKeypadPress('clear')}>CLR</button>
          <button className="keypad-btn" onClick={() => handleKeypadPress('0')}>0</button>
          <button className="keypad-btn keypad-btn-enter" onClick={() => handleKeypadPress('enter')}>ENT</button>
        </div>
      </div>
    );
  }

  if (screen === 'mainMenu') {
    return (
      <div className="slide-up">
        <div style={{ textAlign: 'center', marginBottom: 16, fontSize: 14 }}>WELCOME, {account?.accountHolder?.toUpperCase() || 'CUSTOMER'}</div>
        <button className="atm-btn atm-btn-block" onClick={handleFetchBalance}>BALANCE INQUIRY</button>
        <button className="atm-btn atm-btn-block" onClick={() => setScreen('withdraw')}>WITHDRAW CASH</button>
        <button className="atm-btn atm-btn-block" onClick={() => setScreen('deposit')}>DEPOSIT CASH</button>
        <button className="atm-btn atm-btn-block" onClick={handleFetchTransactions}>TRANSACTION HISTORY</button>
        <button className="atm-btn atm-btn-block atm-btn-danger" onClick={onExit}>EXIT</button>
        {error && <div className="error">{error}</div>}
      </div>
    );
  }

  if (screen === 'balance') {
    return (
      <div className="slide-up">
        <div className="balance-display">
          <div style={{ fontSize: 14, marginBottom: 4 }}>CURRENT BALANCE</div>
          <div className="amount">${(balanceData?.balance ?? 0).toFixed(2)}</div>
        </div>
        <button className="atm-btn" onClick={() => setScreen('mainMenu')}>BACK TO MENU</button>
        {error && <div className="error">{error}</div>}
      </div>
    );
  }

  if (screen === 'withdraw') {
    return (
      <div className="slide-up">
        <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 12 }}>SELECT WITHDRAWAL AMOUNT</div>
        <div className="withdraw-grid">
          {PRESET_AMOUNTS.map(amt => <button key={amt} className="withdraw-amount-btn" onClick={() => handleWithdrawPreset(amt)}>${amt}</button>)}
        </div>
        <div style={{ textAlign: 'center', fontSize: 11, margin: '6px 0', color: '#1a6a1a' }}>OR ENTER CUSTOM AMOUNT</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="atm-input" style={{ flex: 1, marginBottom: 0 }} type="number" placeholder="$0.00" value={customAmount} onChange={e => setCustomAmount(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCustomWithdraw()} min="0" step="0.01" />
          <button className="atm-btn atm-btn-small" style={{ width: 'auto', padding: '12px 16px', marginBottom: 0 }} onClick={handleCustomWithdraw}>OK</button>
        </div>
        {error && <div className="error">{error}</div>}
        <button className="atm-btn atm-btn-back" onClick={() => { setCustomAmount(''); setScreen('mainMenu'); }}>BACK TO MENU</button>
      </div>
    );
  }

  if (screen === 'deposit') {
    return (
      <div className="slide-up">
        <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 12 }}>ENTER DEPOSIT AMOUNT</div>
        <input className="atm-input" type="number" placeholder="$0.00" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleDeposit()} min="0" step="0.01" autoFocus />
        <button className="atm-btn atm-btn-block" onClick={handleDeposit}>DEPOSIT</button>
        {error && <div className="error">{error}</div>}
        {successMsg && <div className="success">{successMsg}</div>}
        <button className="atm-btn atm-btn-back" onClick={() => { setDepositAmount(''); setScreen('mainMenu'); }}>BACK TO MENU</button>
      </div>
    );
  }

  if (screen === 'transaction') {
    return (
      <div className="slide-up">
        <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 12 }}>TRANSACTION HISTORY</div>
        <div className="transaction-list">
          {transactions.length === 0 ? <div className="no-transactions">No transactions found</div> : (
            transactions.map((tx, i) => (
              <div key={i} className="transaction-item">
                <span>{tx.type || tx.transactionType}</span>
                <span className={tx.type === 'CREDIT' || tx.transactionType === 'CREDIT' ? 'transaction-credit' : 'transaction-debit'}>
                  {tx.type === 'CREDIT' || tx.transactionType === 'CREDIT' ? '+' : '-'}${(tx.amount || 0).toFixed(2)}
                </span>
              </div>
            ))
          )}
        </div>
        <button className="atm-btn" onClick={() => setScreen('mainMenu')}>BACK TO MENU</button>
        {error && <div className="error">{error}</div>}
      </div>
    );
  }

  if (screen === 'receipt' && lastReceipt) {
    return (
      <div className="slide-up">
        <div style={{ textAlign: 'center', marginBottom: 8, fontSize: 12 }}>TRANSACTION RECEIPT</div>
        <div className="receipt">
          <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 8 }}>ATM TRANSACTION</div>
          <div className="receipt-divider">- - - - - - - - - - - - -</div>
          <div className="receipt-line"><span>Type:</span><span>{lastReceipt.type}</span></div>
          <div className="receipt-line"><span>Amount:</span><span>${lastReceipt.amount.toFixed(2)}</span></div>
          <div className="receipt-line"><span>New Balance:</span><span>${lastReceipt.newBalance.toFixed(2)}</span></div>
          <div className="receipt-divider">- - - - - - - - - - - - -</div>
          <div className="receipt-line"><span>{lastReceipt.timestamp}</span></div>
        </div>
        <button className="atm-btn" onClick={() => setScreen('mainMenu')}>BACK TO MENU</button>
      </div>
    );
  }

  return null;
}

function AnimatedFlow() {
  const [step, setStep] = useState(0);
  const [account, setAccount] = useState(null);
  const [tx, setTx] = useState(null);
  const [error, setError] = useState('');
  const [cardInserted, setCardInserted] = useState(false);
  const [cashVisible, setCashVisible] = useState(false);
  const [receiptVisible, setReceiptVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);
  const steps = ['Insert', 'PIN', 'Menu', 'Withdraw', 'Done'];

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const reset = () => {
    setStep(0); setAccount(null); setTx(null); setError(''); setLoading(false);
    setCardInserted(false); setCashVisible(false); setReceiptVisible(false);
  };

  const handleInsertCard = async () => {
    setLoading(true); setError('');
    setCardInserted(true);
    try {
      const auth = await authenticate('1234567890', '1234');
      if (!mountedRef.current) return;
      if (auth.error) { setError(auth.error); setLoading(false); return; }
      setAccount(auth);
      setStep(2);
    } catch { if (mountedRef.current) setError('Card authentication failed'); }
    finally { setLoading(false); }
  };

  const handleEnterPin = () => {
    setStep(3);
  };

  const handleWithdraw = async () => {
    setLoading(true); setError('');
    try {
      const transaction = await withdraw(account.accountNumber, 500);
      if (!mountedRef.current) return;
      if (transaction.error) { setError(transaction.error); setLoading(false); return; }
      setTx(transaction);
      setStep(4);
    } catch { if (mountedRef.current) setError('Withdrawal failed'); }
    finally { setLoading(false); }
  };

  const handleDispenseCash = () => {
    setCashVisible(true);
    setTimeout(() => {
      if (mountedRef.current) {
        setReceiptVisible(true);
        setStep(5);
      }
    }, 800);
  };

  const screenText = () => {
    if (step === 1) return { icon: '💳', text: 'INSERT CARD', sub: cardInserted ? 'Card detected...' : '' };
    if (step === 2) return { icon: '🔐', text: 'ENTER PIN', sub: '****' };
    if (step === 3) return { icon: '💰', text: 'WELCOME ' + (account?.holderName || account?.accountHolder || 'User').toUpperCase(), sub: 'Ready for withdrawal' };
    if (step === 4) return { icon: cashVisible ? '💵' : '🧾', text: 'DISPENSING', sub: '₹500.00' };
    if (step === 5) return { icon: '✅', text: 'TRANSACTION COMPLETE', sub: 'Take your card' };
    return { icon: '🏦', text: 'ATM SIMULATION', sub: 'Press start to begin' };
  };
  const s = screenText();

  return (
    <div>
      <div className="step-indicator">
        {steps.map((s, i) => (
          <div key={s} className={`step-dot ${i + 1 === step ? 'active' : ''} ${i + 1 < step ? 'done' : ''}`} title={s} />
        ))}
        <span style={{ fontSize: 11, color: '#1a5a3a', marginLeft: 8 }}>{steps[step - 1] || 'Idle'}</span>
      </div>

      <div className="atm-scene">
        <div className="atm-machine-visual">
          <div className="atm-screen-visual">
            <div style={{ fontSize: 28, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>{s.text}</div>
            {s.sub && <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>{s.sub}</div>}
          </div>
          <div className="atm-keypad-visual">
            {[1,2,3,4,5,6,7,8,9,'',0,''].map((k, i) => (
              <div key={i} className={`atm-key ${k !== '' && step <= 2 ? 'pressed' : ''}`}>{k}</div>
            ))}
          </div>
          <div className="atm-card-slot">
            <div className={`atm-card ${cardInserted ? 'inserted' : ''}`}>💳</div>
          </div>
          <div className="atm-dispenser">
            <div className={`atm-cash ${cashVisible ? 'visible' : ''}`}>💵💵💵</div>
          </div>
        </div>
        <div className={`atm-receipt ${receiptVisible ? 'visible' : ''}`}>
          {tx && (
            <>
              <div style={{ fontWeight: 700, fontSize: 12 }}>🧾 RECEIPT</div>
              <div>WITHDRAWAL: ₹{tx.amount?.toFixed(2)}</div>
              <div>BALANCE: ₹{account?.balance?.toFixed(2)}</div>
              <div>STATUS: {tx.status}</div>
            </>
          )}
        </div>
      </div>

      {error && <div style={{ color: '#f85149', fontSize: 14, marginBottom: 12, textAlign: 'center' }}>{error}<button onClick={reset} style={{ marginLeft: 12, padding: '4px 12px', background: '#2a2a4a', color: '#ccc', border: 'none', borderRadius: 6, cursor: 'pointer' }}>↺ Reset</button></div>}

      {step === 0 && <button onClick={() => setStep(1)} disabled={loading} style={{ display: 'block', margin: '12px auto', padding: '12px 32px', background: '#00ff41', color: '#0a3d2e', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'Courier New, monospace' }}>▶ Start Simulation</button>}

      {step === 1 && <button onClick={handleInsertCard} disabled={loading} style={{ display: 'block', margin: '12px auto', padding: '8px 20px', background: '#00ff41', color: '#0a3d2e', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Courier New, monospace' }}>💳 Insert Card {loading ? '...' : ''}</button>}

      {step === 2 && <button onClick={handleEnterPin} disabled={loading} style={{ display: 'block', margin: '12px auto', padding: '8px 20px', background: '#00ff41', color: '#0a3d2e', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Courier New, monospace' }}>🔑 Enter PIN</button>}

      {step === 3 && <button onClick={handleWithdraw} disabled={loading} style={{ display: 'block', margin: '12px auto', padding: '8px 20px', background: '#00ff41', color: '#0a3d2e', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Courier New, monospace' }}>💰 Withdraw ₹500 {loading ? '...' : ''}</button>}

      {step === 4 && <button onClick={handleDispenseCash} disabled={cashVisible} style={{ display: 'block', margin: '12px auto', padding: '8px 20px', background: '#00ff41', color: '#0a3d2e', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Courier New, monospace' }}>🧾 Dispense Cash</button>}

      {step === 5 && <div style={{ textAlign: 'center', marginTop: 8 }}><button onClick={reset} style={{ padding: '8px 20px', background: '#00ff41', color: '#0a3d2e', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontFamily: 'Courier New, monospace' }}>🔄 New Transaction</button></div>}
    </div>
  );
}

export default function AtmPage() {
  const [screen, setScreen] = useState('insertCard');
  const [cardNumber, setCardNumber] = useState('');
  const [account, setAccount] = useState(null);
  const [tab, setTab] = useState('atm');

  const handleAuthenticated = (accountData) => { setAccount(accountData); setScreen('mainMenu'); };
  const handleExit = () => { setAccount(null); setCardNumber(''); setScreen('insertCard'); };

  const tabs = ['atm', 'simulation', 'diagram', 'design'];
  const tabLabels = { atm: 'ATM', simulation: 'Simulation', diagram: 'Class Diagram', design: 'Design Details' };

  return (
    <div className="atm-machine">
      <style>{styles}</style>
      <div className="atm-screen">
        <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link to="/" className="back-home">← Back</Link>
        </div>
        <div className="atm-title">ATM</div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '4px 10px', border: `1px solid ${tab === t ? '#00ff41' : '#1a5a3a'}`, borderRadius: 4, background: tab === t ? 'rgba(0,255,65,0.1)' : 'transparent', color: tab === t ? '#00ff41' : '#1a6a1a', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'Courier New, monospace', transition: 'all 0.2s' }}>
              {tabLabels[t]}
            </button>
          ))}
        </div>
        {tab === 'atm' && <AtmScreen screen={screen} setScreen={setScreen} cardNumber={cardNumber} setCardNumber={setCardNumber} account={account} onAuthenticated={handleAuthenticated} onExit={handleExit} />}
        {tab === 'simulation' && <AnimatedFlow />}
        {tab === 'diagram' && <ClassDiagram module="atm" />}
        {tab === 'design' && <DesignDetails module="atm" />}
      </div>
    </div>
  );
}
