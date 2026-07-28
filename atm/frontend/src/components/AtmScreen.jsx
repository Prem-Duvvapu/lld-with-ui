import React, { useState, useEffect, useRef } from 'react';

const PRESET_AMOUNTS = [20, 40, 60, 100, 200, 500];

export default function AtmScreen({ screen, setScreen, cardNumber, setCardNumber, account, onAuthenticated, onExit }) {
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

  useEffect(() => {
    if (screen === 'pinEntry' && pinRef.current) {
      pinRef.current.focus();
    }
  }, [screen]);

  const showError = (msg) => { setError(msg); setSuccessMsg(''); };
  const showSuccess = (msg) => { setSuccessMsg(msg); setError(''); };

  const handleInsertCard = () => {
    if (!cardNumber.trim()) { showError('Please enter a card number'); return; }
    showError('');
    setScreen('pinEntry');
  };

  const handlePinSubmit = async () => {
    if (pin.length < 4) { showError('Enter at least 4 digits'); return; }
    setLoading(true);
    showError('');
    try {
      const res = await fetch('http://localhost:8086/api/atm/authenticate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardNumber: cardNumber.trim(), pin })
      });
      setLoading(false);
      if (res.ok) {
        const account = await res.json();
        onAuthenticated(account);
      } else {
        showError('Invalid PIN. Try again.');
        setPin('');
      }
    } catch {
      setLoading(false);
      showError('Authentication failed. Please try again.');
      setPin('');
    }
  };

  const handleKeypadPress = (key) => {
    showError('');
    if (key === 'clear') { setPin(''); return; }
    if (key === 'enter') { handlePinSubmit(); return; }
    if (pin.length >= 4) return;
    setPin(prev => prev + key);
  };

  useEffect(() => {
    if (pin.length === 4) {
      handlePinSubmit();
    }
  }, [pin]);

  const handleFetchBalance = async () => {
    setLoading(true);
    showError('');
    try {
      const res = await fetch(`http://localhost:8086/api/atm/${account.accountNumber}/balance`);
      setLoading(false);
      if (res.ok) {
        setBalanceData(await res.json());
        setScreen('balance');
      } else {
        showError('Could not fetch balance');
      }
    } catch {
      setLoading(false);
      showError('Network error fetching balance');
    }
  };

  const handleWithdrawPreset = async (amount) => {
    setLoading(true);
    showError('');
    try {
      const res = await fetch(`http://localhost:8086/api/atm/${account.accountNumber}/withdraw`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      setLoading(false);
      if (res.ok) {
        setLastReceipt({ type: 'WITHDRAWAL', amount, newBalance: account.balance - amount, timestamp: new Date().toLocaleString() });
        account.balance -= amount;
        setScreen('receipt');
      } else {
        const msg = res.status === 400 ? 'Insufficient balance' : 'Withdrawal failed';
        showError(msg);
      }
    } catch {
      setLoading(false);
      showError('Network error during withdrawal');
    }
  };

  const handleCustomWithdraw = async () => {
    const amount = parseFloat(customAmount);
    if (!amount || amount <= 0) { showError('Enter a valid amount'); return; }
    await handleWithdrawPreset(amount);
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) { showError('Enter a valid amount'); return; }
    setLoading(true);
    showError('');
    try {
      const res = await fetch(`http://localhost:8086/api/atm/${account.accountNumber}/deposit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      setLoading(false);
      if (res.ok) {
        setLastReceipt({ type: 'DEPOSIT', amount, newBalance: account.balance + amount, timestamp: new Date().toLocaleString() });
        account.balance += amount;
        setScreen('receipt');
      } else {
        showError('Deposit failed');
      }
    } catch {
      setLoading(false);
      showError('Network error during deposit');
    }
  };

  const handleFetchTransactions = async () => {
    setLoading(true);
    showError('');
    try {
      const res = await fetch(`http://localhost:8086/api/atm/${account.accountNumber}/transactions`);
      setLoading(false);
      if (res.ok) {
        setTransactions(await res.json());
        setScreen('transaction');
      } else {
        showError('Could not fetch transactions');
      }
    } catch {
      setLoading(false);
      showError('Network error fetching transactions');
    }
  };

  if (loading) {
    return <div className="loading slide-up">PROCESSING...</div>;
  }

  if (screen === 'insertCard') {
    return (
      <div className="slide-up">
        <div style={{ textAlign: 'center', marginBottom: 16, fontSize: 12 }}>
          PLEASE INSERT YOUR CARD
        </div>
        <input
          className="atm-input"
          type="text"
          placeholder="Card Number"
          value={cardNumber}
          onChange={e => { setCardNumber(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleInsertCard()}
          autoFocus
        />
        <button className="atm-btn atm-btn-block" onClick={handleInsertCard}>
          INSERT CARD
        </button>
        {error && <div className="error">{error}</div>}
        <div className="hint">
          <strong>Test Accounts:</strong><br />
          Alice: 123456 / PIN 1234<br />
          Bob: 789012 / PIN 5678<br />
          Charlie: 345678 / PIN 9012
        </div>
      </div>
    );
  }

  if (screen === 'pinEntry') {
    return (
      <div className="slide-up">
        <div style={{ textAlign: 'center', marginBottom: 8, fontSize: 12 }}>
          ENTER YOUR PIN
        </div>
        <div className="pin-dots">
          {pin.padEnd(4, '_').split('').map((c, i) => (
            <span key={i}>{c === '_' ? '\u25CB' : '\u25CF'}</span>
          ))}
        </div>
        {error && <div className="error">{error}</div>}
        <div className="keypad">
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button key={n} className="keypad-btn" onClick={() => handleKeypadPress(String(n))}>{n}</button>
          ))}
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
        <div style={{ textAlign: 'center', marginBottom: 16, fontSize: 14 }}>
          WELCOME, {account?.accountHolder?.toUpperCase() || 'CUSTOMER'}
        </div>
        <button className="atm-btn atm-btn-block" onClick={handleFetchBalance}>
          BALANCE INQUIRY
        </button>
        <button className="atm-btn atm-btn-block" onClick={() => setScreen('withdraw')}>
          WITHDRAW CASH
        </button>
        <button className="atm-btn atm-btn-block" onClick={() => setScreen('deposit')}>
          DEPOSIT CASH
        </button>
        <button className="atm-btn atm-btn-block" onClick={handleFetchTransactions}>
          TRANSACTION HISTORY
        </button>
        <button className="atm-btn atm-btn-block atm-btn-danger" onClick={onExit}>
          EXIT
        </button>
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
        <button className="atm-btn" onClick={() => setScreen('mainMenu')}>
          BACK TO MENU
        </button>
        {error && <div className="error">{error}</div>}
      </div>
    );
  }

  if (screen === 'withdraw') {
    return (
      <div className="slide-up">
        <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 12 }}>
          SELECT WITHDRAWAL AMOUNT
        </div>
        <div className="withdraw-grid">
          {PRESET_AMOUNTS.map(amt => (
            <button key={amt} className="withdraw-amount-btn" onClick={() => handleWithdrawPreset(amt)}>
              ${amt}
            </button>
          ))}
        </div>
        <div style={{ textAlign: 'center', fontSize: 11, margin: '6px 0', color: '#1a6a1a' }}>OR ENTER CUSTOM AMOUNT</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="atm-input"
            style={{ flex: 1, marginBottom: 0 }}
            type="number"
            placeholder="$0.00"
            value={customAmount}
            onChange={e => setCustomAmount(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCustomWithdraw()}
            min="0"
            step="0.01"
          />
          <button className="atm-btn atm-btn-small" style={{ width: 'auto', padding: '12px 16px', marginBottom: 0 }} onClick={handleCustomWithdraw}>
            OK
          </button>
        </div>
        {error && <div className="error">{error}</div>}
        <button className="atm-btn atm-btn-back" onClick={() => { setCustomAmount(''); setScreen('mainMenu'); }}>
          BACK TO MENU
        </button>
      </div>
    );
  }

  if (screen === 'deposit') {
    return (
      <div className="slide-up">
        <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 12 }}>
          ENTER DEPOSIT AMOUNT
        </div>
        <input
          className="atm-input"
          type="number"
          placeholder="$0.00"
          value={depositAmount}
          onChange={e => setDepositAmount(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleDeposit()}
          min="0"
          step="0.01"
          autoFocus
        />
        <button className="atm-btn atm-btn-block" onClick={handleDeposit}>
          DEPOSIT
        </button>
        {error && <div className="error">{error}</div>}
        {successMsg && <div className="success">{successMsg}</div>}
        <button className="atm-btn atm-btn-back" onClick={() => { setDepositAmount(''); setScreen('mainMenu'); }}>
          BACK TO MENU
        </button>
      </div>
    );
  }

  if (screen === 'transaction') {
    return (
      <div className="slide-up">
        <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 12 }}>
          TRANSACTION HISTORY
        </div>
        <div className="transaction-list">
          {transactions.length === 0 ? (
            <div className="no-transactions">No transactions found</div>
          ) : (
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
        <button className="atm-btn" onClick={() => setScreen('mainMenu')}>
          BACK TO MENU
        </button>
        {error && <div className="error">{error}</div>}
      </div>
    );
  }

  if (screen === 'receipt' && lastReceipt) {
    return (
      <div className="slide-up">
        <div style={{ textAlign: 'center', marginBottom: 8, fontSize: 12 }}>
          TRANSACTION RECEIPT
        </div>
        <div className="receipt">
          <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 8 }}>
            ATM TRANSACTION
          </div>
          <div className="receipt-divider">- - - - - - - - - - - - -</div>
          <div className="receipt-line">
            <span>Type:</span>
            <span>{lastReceipt.type}</span>
          </div>
          <div className="receipt-line">
            <span>Amount:</span>
            <span>${lastReceipt.amount.toFixed(2)}</span>
          </div>
          <div className="receipt-line">
            <span>New Balance:</span>
            <span>${lastReceipt.newBalance.toFixed(2)}</span>
          </div>
          <div className="receipt-divider">- - - - - - - - - - - - -</div>
          <div className="receipt-line">
            <span>{lastReceipt.timestamp}</span>
          </div>
        </div>
        <button className="atm-btn" onClick={() => setScreen('mainMenu')}>
          BACK TO MENU
        </button>
      </div>
    );
  }

  return null;
}