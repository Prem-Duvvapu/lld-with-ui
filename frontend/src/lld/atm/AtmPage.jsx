import { useState, useEffect, useRef } from 'react';
import { authenticate, getBalance, withdraw, deposit, getTransactions } from './api';
import LldPage from '../../components/LldPage';
import { Card, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import StepIndicator from '../../components/ui/StepIndicator';
import { useToast } from '../../components/ui/ToastContext';

const ATM_CSS = `
.atm-machine-container { max-width: 480px; margin: 0 auto; }
.atm-terminal {
  background: linear-gradient(145deg, #2a2a2a, #1a1a1a);
  border: 4px solid #444;
  border-radius: var(--radius-xl);
  padding: 24px 20px;
  box-shadow: var(--shadow-lg);
}

.atm-screen-bezel {
  background: #0a1a0a;
  border: 3px solid #1a3a1a;
  border-radius: var(--radius-md);
  padding: 20px;
  min-height: 380px;
  color: #33ff33;
  font-family: var(--code-font);
  box-shadow: inset 0 0 20px rgba(0,0,0,0.9);
  position: relative;
}

.atm-screen-bezel::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.03) 2px, rgba(0,255,0,0.03) 4px);
  pointer-events: none;
}

.atm-screen-title {
  text-align: center;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 4px;
  color: #33ff33;
  text-shadow: 0 0 10px rgba(51,255,51,0.5);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #1a3a1a;
}

.keypad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  max-width: 240px;
  margin: 12px auto 0;
}

.keypad-btn {
  padding: 14px;
  background: #0d1f0d;
  border: 1px solid #33ff33;
  border-radius: 6px;
  color: #33ff33;
  font-family: var(--code-font);
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.1s ease;
}

.keypad-btn:hover {
  background: #1a3a1a;
  box-shadow: 0 0 8px rgba(51,255,51,0.4);
}

.keypad-btn:active { transform: scale(0.95); }

.pin-dots {
  text-align: center;
  margin-bottom: 16px;
  font-size: 28px;
  letter-spacing: 12px;
  min-height: 40px;
}

.withdraw-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.withdraw-btn {
  padding: 14px 8px;
  background: #0d1f0d;
  border: 1px solid #33ff33;
  border-radius: 6px;
  color: #33ff33;
  font-family: var(--code-font);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}

.withdraw-btn:hover { background: #1a3a1a; box-shadow: 0 0 8px rgba(51,255,51,0.3); }

.receipt-box {
  background: #000;
  border: 1px dashed #33ff33;
  padding: 14px;
  margin: 12px 0;
  font-size: 12px;
  line-height: 1.6;
  color: #66ff66;
  font-family: var(--code-font);
}

.atm-btn-action {
  width: 100%;
  padding: 12px;
  margin-bottom: 8px;
  background: linear-gradient(180deg, #1a3a1a, #0d2a0d);
  border: 1px solid #33ff33;
  border-radius: 6px;
  color: #33ff33;
  font-family: var(--code-font);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.atm-btn-action:hover { background: #1a4a1a; box-shadow: 0 0 8px rgba(51,255,51,0.3); }
`;

const PRESET_AMOUNTS = [20, 40, 60, 100, 200, 500];

function AtmScreenComponent({ screen, setScreen, cardNumber, setCardNumber, account, setAccount, onAuthenticated, onExit }) {
  const toast = useToast();
  const [pin, setPin] = useState('');
  const [balanceData, setBalanceData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setError(''); }, [screen]);

  const handleInsertCard = () => {
    if (!cardNumber.trim()) { setError('Please enter a card number'); return; }
    setError(''); setScreen('pinEntry');
  };

  const handlePinSubmit = async (pinValue = pin) => {
    if (loading || pinValue.length < 4) return;
    setLoading(true); setError('');
    try {
      const data = await authenticate(cardNumber.trim(), pinValue);
      if (data && !data.error) {
        onAuthenticated(data);
        toast.success(`Welcome ${data.customerName || 'Customer'}!`);
      } else {
        setError('Invalid PIN. Please try again.'); setPin('');
        toast.error('Invalid PIN');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
      toast.error('Auth failed');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleKeypadPress = (key) => {
    setError('');
    if (key === 'clear') { setPin(''); return; }
    if (key === 'enter') { handlePinSubmit(pin); return; }
    if (pin.length >= 4) return;

    const nextPin = pin + key;
    setPin(nextPin);
    if (nextPin.length === 4) {
      handlePinSubmit(nextPin);
    }
  };

  const handleFetchBalance = async () => {
    setLoading(true); setError('');
    try {
      const data = await getBalance(account.accountNumber);
      setBalanceData(data); setScreen('balance');
    } catch (err) {
      setError(err.message || 'Could not fetch balance');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawPreset = async (amount) => {
    if (loading) return;
    setLoading(true); setError('');
    try {
      const data = await withdraw(account.accountNumber, amount);
      if (data && data.error === undefined) {
        const newBal = (account.balance || 0) - amount;
        setAccount((prev) => ({ ...prev, balance: newBal }));
        setLastReceipt({ type: 'WITHDRAWAL', amount, newBalance: newBal, timestamp: new Date().toLocaleString() });
        setScreen('receipt');
        toast.success(`Successfully withdrew ₹${amount}`);
      } else {
        setError(data.error || 'Withdrawal failed');
        toast.error(data.error || 'Withdrawal failed');
      }
    } catch (err) {
      setError(err.message || 'Withdrawal error');
      toast.error(err.message || 'Withdrawal error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    const amt = parseFloat(depositAmount);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    setLoading(true); setError('');
    try {
      const data = await deposit(account.accountNumber, amt);
      if (data && data.error === undefined) {
        const newBal = (account.balance || 0) + amt;
        setAccount((prev) => ({ ...prev, balance: newBal }));
        setLastReceipt({ type: 'DEPOSIT', amount: amt, newBalance: newBal, timestamp: new Date().toLocaleString() });
        setScreen('receipt');
        setDepositAmount('');
        toast.success(`Successfully deposited ₹${amt}`);
      } else {
        setError(data.error || 'Deposit failed');
      }
    } catch (err) {
      setError(err.message || 'Deposit error');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchTransactions = async () => {
    setLoading(true); setError('');
    try {
      const data = await getTransactions(account.accountNumber);
      if (Array.isArray(data)) setTransactions(data);
      setScreen('transaction');
    } catch (err) {
      setError(err.message || 'Could not fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>PROCESSING...</div>;

  if (screen === 'insertCard') {
    return (
      <div>
        <div style={{ textAlign: 'center', marginBottom: 16, fontSize: 12 }}>PLEASE ENTER YOUR CARD NUMBER</div>
        <Input
          type="text"
          placeholder="Card Number (e.g. 123456)"
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleInsertCard()}
          autoFocus
        />
        <button className="atm-btn-action" onClick={handleInsertCard}>INSERT CARD</button>
        {error && <div style={{ color: '#ff4444', textAlign: 'center', marginTop: 8, fontSize: 12 }}>{error}</div>}
        <div style={{ fontSize: 11, color: '#1a6a1a', textAlign: 'center', marginTop: 16, lineHeight: 1.6 }}>
          <strong>Test Accounts:</strong><br />
          Alice: 123456 / PIN 1234<br />
          Bob: 789012 / PIN 5678
        </div>
      </div>
    );
  }

  if (screen === 'pinEntry') {
    return (
      <div>
        <div style={{ textAlign: 'center', marginBottom: 8, fontSize: 12 }}>ENTER YOUR 4-DIGIT PIN</div>
        <div className="pin-dots">{pin.padEnd(4, '_').split('').map((c, i) => <span key={i}>{c === '_' ? '○' : '●'}</span>)}</div>
        {error && <div style={{ color: '#ff4444', textAlign: 'center', marginBottom: 8, fontSize: 12 }}>{error}</div>}
        <div className="keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button key={n} className="keypad-btn" onClick={() => handleKeypadPress(String(n))}>{n}</button>
          ))}
          <button className="keypad-btn" style={{ borderColor: '#ffff33', color: '#ffff66' }} onClick={() => handleKeypadPress('clear')}>CLR</button>
          <button className="keypad-btn" onClick={() => handleKeypadPress('0')}>0</button>
          <button className="keypad-btn" style={{ background: '#0d2a0d' }} onClick={() => handleKeypadPress('enter')}>OK</button>
        </div>
      </div>
    );
  }

  if (screen === 'mainMenu') {
    return (
      <div>
        <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 12 }}>SELECT TRANSACTION</div>
        <button className="atm-btn-action" onClick={handleFetchBalance}>BALANCE INQUIRY</button>
        <button className="atm-btn-action" onClick={() => setScreen('withdraw')}>CASH WITHDRAWAL</button>
        <button className="atm-btn-action" onClick={() => setScreen('deposit')}>CASH DEPOSIT</button>
        <button className="atm-btn-action" onClick={handleFetchTransactions}>STATEMENT</button>
        <button className="atm-btn-action" style={{ borderColor: '#ff3333', color: '#ff6666' }} onClick={onExit}>EXIT CARD</button>
      </div>
    );
  }

  if (screen === 'balance') {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 12, marginBottom: 8 }}>AVAILABLE BALANCE</div>
        <div style={{ fontSize: 32, fontWeight: 700, textShadow: '0 0 10px #33ff33' }}>₹{(balanceData?.balance || account?.balance || 0).toFixed(2)}</div>
        <div style={{ fontSize: 11, color: '#1a6a1a', margin: '12px 0' }}>Account: {account?.accountNumber}</div>
        <button className="atm-btn-action" onClick={() => setScreen('mainMenu')}>BACK TO MENU</button>
      </div>
    );
  }

  if (screen === 'withdraw') {
    return (
      <div>
        <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 12 }}>SELECT WITHDRAWAL AMOUNT</div>
        <div className="withdraw-grid">
          {PRESET_AMOUNTS.map((amt) => (
            <button key={amt} className="withdraw-btn" onClick={() => handleWithdrawPreset(amt)}>₹{amt}</button>
          ))}
        </div>
        {error && <div style={{ color: '#ff4444', textAlign: 'center', margin: '8px 0', fontSize: 12 }}>{error}</div>}
        <button className="atm-btn-action" onClick={() => setScreen('mainMenu')}>CANCEL</button>
      </div>
    );
  }

  if (screen === 'deposit') {
    return (
      <div>
        <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 12 }}>ENTER DEPOSIT AMOUNT</div>
        <Input
          type="number"
          placeholder="Amount (₹)"
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
        />
        <button className="atm-btn-action" onClick={handleDeposit}>DEPOSIT CASH</button>
        {error && <div style={{ color: '#ff4444', textAlign: 'center', margin: '8px 0', fontSize: 12 }}>{error}</div>}
        <button className="atm-btn-action" style={{ borderColor: '#ff3333', color: '#ff6666' }} onClick={() => setScreen('mainMenu')}>CANCEL</button>
      </div>
    );
  }

  if (screen === 'receipt' && lastReceipt) {
    return (
      <div>
        <div className="receipt-box">
          <div style={{ textAlign: 'center', fontWeight: 700 }}>NATIONAL BANK ATM</div>
          <div>-----------------------------</div>
          <div>TYPE: {lastReceipt.type}</div>
          <div>AMOUNT: ₹{lastReceipt.amount.toFixed(2)}</div>
          <div>NEW BALANCE: ₹{lastReceipt.newBalance.toFixed(2)}</div>
          <div>DATE: {lastReceipt.timestamp}</div>
          <div>-----------------------------</div>
          <div style={{ textAlign: 'center' }}>THANK YOU FOR BANKING</div>
        </div>
        <button className="atm-btn-action" onClick={() => setScreen('mainMenu')}>MAIN MENU</button>
      </div>
    );
  }

  if (screen === 'transaction') {
    return (
      <div>
        <div style={{ textAlign: 'center', marginBottom: 8, fontSize: 12 }}>MINI STATEMENT</div>
        <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 12 }}>
          {transactions.map((t, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #1a3a1a', fontSize: 12 }}>
              <span>{t.type}</span>
              <span style={{ color: t.type === 'WITHDRAWAL' ? '#ff6666' : '#33ff33' }}>₹{t.amount}</span>
            </div>
          ))}
        </div>
        <button className="atm-btn-action" onClick={() => setScreen('mainMenu')}>BACK TO MENU</button>
      </div>
    );
  }

  return null;
}

export default function AtmPage() {
  const [screen, setScreen] = useState('insertCard');
  const [cardNumber, setCardNumber] = useState('');
  const [account, setAccount] = useState(null);

  const handleAuthenticated = (accountData) => {
    setAccount(accountData);
    setScreen('mainMenu');
  };

  const handleExit = () => {
    setAccount(null);
    setCardNumber('');
    setScreen('insertCard');
  };

  return (
    <LldPage
      module="atm"
      title="ATM Banking System"
      icon="🏧"
      tabs={['app', 'diagram', 'design']}
    >
      {() => (
        <div className="atm-machine-container">
          <style>{ATM_CSS}</style>
          <div className="atm-terminal">
            <div className="atm-screen-bezel">
              <div className="atm-screen-title">ATM</div>
              <AtmScreenComponent
                screen={screen}
                setScreen={setScreen}
                cardNumber={cardNumber}
                setCardNumber={setCardNumber}
                account={account}
                setAccount={setAccount}
                onAuthenticated={handleAuthenticated}
                onExit={handleExit}
              />
            </div>
          </div>
        </div>
      )}
    </LldPage>
  );
}
