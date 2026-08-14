import React, { useState, useEffect } from 'react';
import {
  insertCard,
  authenticate,
  getBalance,
  withdraw,
  deposit,
  ejectCard,
  getTransactions,
  getDispenserStatus,
  simReset,
  simAuthenticate,
  simWithdraw,
  simGetEvents,
  simGetSnapshots,
} from './api';
import ClassDiagram from '../../components/ClassDiagram';
import DesignDetails from '../../components/DesignDetails';
import './AtmPage.css';

export default function AtmPage() {
  const [activeTab, setActiveTab] = useState('terminal');

  // ATM Hardware Session State
  const [sessionState, setSessionState] = useState('IDLE'); // IDLE, CARD_INSERTED, AUTHENTICATED, DISPENSING, CARD_BLOCKED
  const [cardNumber, setCardNumber] = useState('1111222233334444');
  const [pinInput, setPinInput] = useState('');
  const [activeAccount, setActiveAccount] = useState(null);
  const [currentBalance, setCurrentBalance] = useState(null);
  const [amountInput, setAmountInput] = useState('500');
  const [transactions, setTransactions] = useState([]);
  const [dispenser, setDispenser] = useState({ totalCash: 0, inventory: {} });
  const [receipt, setReceipt] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [dispensingAnimation, setDispensingAnimation] = useState(false);

  // Simulation Tab State
  const [simSnapshots, setSimSnapshots] = useState(null);
  const [simEvents, setSimEvents] = useState([]);
  const [simLoading, setSimLoading] = useState(false);

  useEffect(() => {
    fetchDispenser();
  }, []);

  const fetchDispenser = async () => {
    try {
      const data = await getDispenserStatus();
      if (data) setDispenser(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleInsertCard = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await insertCard(cardNumber);
      setSessionState(res.state || 'CARD_INSERTED');
      setSuccessMsg(`Card ${cardNumber} inserted. Please enter 4-digit PIN.`);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to insert card');
      if (err.message && err.message.includes('BLOCKED')) {
        setSessionState('CARD_BLOCKED');
      }
    }
  };

  const handleKeypadPress = (val) => {
    if (val === 'CLEAR') {
      setPinInput('');
    } else if (val === 'ENTER') {
      handleAuthenticatePIN();
    } else if (pinInput.length < 4) {
      setPinInput(prev => prev + val);
    }
  };

  const handleAuthenticatePIN = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const acc = await authenticate(cardNumber, pinInput);
      setActiveAccount(acc);
      setCurrentBalance(acc.balance);
      setSessionState('AUTHENTICATED');
      setSuccessMsg(`Welcome, ${acc.holderName}! PIN Verified.`);
      fetchTransactions(acc.accountNumber);
      fetchDispenser();
    } catch (err) {
      setErrorMsg(err.message || 'Authentication Failed');
      setPinInput('');
      if (err.message && err.message.includes('BLOCKED')) {
        setSessionState('CARD_BLOCKED');
      }
    }
  };

  const handleWithdraw = async () => {
    if (!activeAccount) return;
    setErrorMsg('');
    setSuccessMsg('');
    setDispensingAnimation(true);
    try {
      const txn = await withdraw(activeAccount.accountNumber, amountInput);
      setDispensingAnimation(false);
      setReceipt(txn);
      setSuccessMsg(`Successfully withdrew ₹${amountInput}! Cash dispensed.`);
      handleCheckBalance();
      fetchTransactions(activeAccount.accountNumber);
      fetchDispenser();
    } catch (err) {
      setDispensingAnimation(false);
      setErrorMsg(err.message || 'Withdrawal Failed');
    }
  };

  const handleDeposit = async () => {
    if (!activeAccount) return;
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const txn = await deposit(activeAccount.accountNumber, amountInput);
      setSuccessMsg(`Successfully deposited ₹${amountInput}!`);
      handleCheckBalance();
      fetchTransactions(activeAccount.accountNumber);
      fetchDispenser();
    } catch (err) {
      setErrorMsg(err.message || 'Deposit Failed');
    }
  };

  const handleCheckBalance = async () => {
    if (!activeAccount) return;
    try {
      const data = await getBalance(activeAccount.accountNumber);
      setCurrentBalance(data.balance);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEjectCard = async () => {
    try {
      await ejectCard();
      setSessionState('IDLE');
      setActiveAccount(null);
      setPinInput('');
      setCurrentBalance(null);
      setReceipt(null);
      setSuccessMsg('Card ejected. Thank you for banking with us!');
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTransactions = async (accNum) => {
    try {
      const list = await getTransactions(accNum);
      setTransactions(list || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Simulation Controls
  const handleSimReset = async () => {
    setSimLoading(true);
    try {
      const snap = await simReset();
      setSimSnapshots(snap);
      setSimEvents(snap.events || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSimLoading(false);
    }
  };

  const handleSimAuth = async (card, pin) => {
    setSimLoading(true);
    try {
      const snap = await simAuthenticate(card, pin);
      setSimSnapshots(snap);
      setSimEvents(snap.events || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSimLoading(false);
    }
  };

  const handleSimWithdraw = async (acc, amt) => {
    setSimLoading(true);
    try {
      const snap = await simWithdraw(acc, amt);
      setSimSnapshots(snap);
      setSimEvents(snap.events || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div className="atm-page">
      <header className="atm-header">
        <div className="atm-title-area">
          <h1>🏧 ATM System</h1>
          <span className="atm-badge">Thread-Safe ReentrantLock • State Machine</span>
        </div>
        <div className="atm-tabs">
          <button
            className={`atm-tab ${activeTab === 'terminal' ? 'active' : ''}`}
            onClick={() => setActiveTab('terminal')}
          >
            🏧 ATM Terminal
          </button>
          <button
            className={`atm-tab ${activeTab === 'sim' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('sim');
              handleSimReset();
            }}
          >
            🔒 Concurrency Simulation
          </button>
          <button
            className={`atm-tab ${activeTab === 'diagram' ? 'active' : ''}`}
            onClick={() => setActiveTab('diagram')}
          >
            📐 Class Diagram
          </button>
          <button
            className={`atm-tab ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            📋 Design Details
          </button>
        </div>
      </header>

      {/* TAB 1: INTERACTIVE ATM TERMINAL */}
      {activeTab === 'terminal' && (
        <div className="atm-terminal-layout">
          {/* Physical Hardware Frame */}
          <div className="atm-cabinet">
            {/* Header Screen Display */}
            <div className="atm-screen">
              <div className="screen-header">
                <span className="bank-logo">🏦 APEX BANK ATM</span>
                <span className={`status-pill ${sessionState.toLowerCase()}`}>
                  State: {sessionState}
                </span>
              </div>

              {errorMsg && <div className="screen-alert error">{errorMsg}</div>}
              {successMsg && <div className="screen-alert success">{successMsg}</div>}

              {sessionState === 'IDLE' && (
                <div className="screen-body idle">
                  <h2>Please Select Card to Begin</h2>
                  <p>Choose a demo card from the hardware panel on the right.</p>
                </div>
              )}

              {sessionState === 'CARD_INSERTED' && (
                <div className="screen-body pin-entry">
                  <h3>Enter 4-Digit PIN</h3>
                  <div className="pin-dots">
                    {[0, 1, 2, 3].map(idx => (
                      <span key={idx} className={`dot ${pinInput.length > idx ? 'filled' : ''}`}>
                        ●
                      </span>
                    ))}
                  </div>
                  <p className="hint">Use Keypad Below (Demo PINs: John=1234, Jane=4321, Alice=0000)</p>
                </div>
              )}

              {sessionState === 'AUTHENTICATED' && activeAccount && (
                <div className="screen-body menu">
                  <div className="account-hud">
                    <span>Account: <strong>{activeAccount.accountNumber}</strong></span>
                    <span>Balance: <strong className="green">₹{currentBalance !== null ? currentBalance.toFixed(2) : '...'}</strong></span>
                  </div>

                  <div className="atm-amount-selector">
                    <label>Amount (₹):</label>
                    <input
                      type="number"
                      step="100"
                      value={amountInput}
                      onChange={e => setAmountInput(e.target.value)}
                    />
                    <div className="quick-buttons">
                      {[100, 500, 2000, 5000].map(amt => (
                        <button key={amt} onClick={() => setAmountInput(amt)}>+₹{amt}</button>
                      ))}
                    </div>
                  </div>

                  <div className="screen-actions">
                    <button className="btn-action withdraw" onClick={handleWithdraw}>
                      💵 Withdraw Cash
                    </button>
                    <button className="btn-action deposit" onClick={handleDeposit}>
                      📥 Deposit Cash
                    </button>
                    <button className="btn-action balance" onClick={handleCheckBalance}>
                      🔄 Refresh Balance
                    </button>
                    <button className="btn-action eject" onClick={handleEjectCard}>
                      ⏏️ Eject Card
                    </button>
                  </div>
                </div>
              )}

              {sessionState === 'CARD_BLOCKED' && (
                <div className="screen-body blocked">
                  <h2 className="red">🚫 CARD BLOCKED</h2>
                  <p>3 Failed PIN attempts detected. Card retained for security.</p>
                  <button className="btn-eject-reset" onClick={handleEjectCard}>Reset Terminal</button>
                </div>
              )}
            </div>

            {/* Keypad & Slot Panel */}
            <div className="atm-hardware-panel">
              <div className="card-slot-area">
                <span className="slot-label">💳 CARD SLOT</span>
                <div className={`card-slot ${sessionState !== 'IDLE' ? 'active' : ''}`}>
                  {sessionState !== 'IDLE' ? '💳 [CARD INSERTED]' : '[INSERT CARD]'}
                </div>
              </div>

              <div className="keypad-grid">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', 'ENTER'].map(key => (
                  <button
                    key={key}
                    className={`keypad-btn ${key === 'CLEAR' ? 'clear' : key === 'ENTER' ? 'enter' : ''}`}
                    onClick={() => handleKeypadPress(key)}
                  >
                    {key}
                  </button>
                ))}
              </div>

              {/* Cash Dispenser Slot Animation */}
              <div className={`cash-dispenser-slot ${dispensingAnimation ? 'dispensing' : ''}`}>
                <span>💵 CASH DISPENSER SLOT</span>
                {dispensingAnimation && <div className="anim-notes">💸 DISPENSING NOTES...</div>}
              </div>
            </div>
          </div>

          {/* Right Column: Demo Controls & Dispenser Inventory */}
          <div className="atm-side-panel">
            <div className="panel-card">
              <h3>💳 Select Demo Card</h3>
              <div className="card-selector">
                <button
                  className={cardNumber === '1111222233334444' ? 'selected' : ''}
                  onClick={() => setCardNumber('1111222233334444')}
                >
                  John Doe (PIN: 1234) — ₹10,000
                </button>
                <button
                  className={cardNumber === '5555666677778888' ? 'selected' : ''}
                  onClick={() => setCardNumber('5555666677778888')}
                >
                  Jane Smith (PIN: 4321) — ₹25,000
                </button>
                <button
                  className={cardNumber === '9999888877776666' ? 'selected' : ''}
                  onClick={() => setCardNumber('9999888877776666')}
                >
                  Alice Johnson (PIN: 0000) — ₹1,200
                </button>
              </div>
              <button className="btn-insert-main" onClick={handleInsertCard}>
                📥 Insert Selected Card
              </button>
            </div>

            <div className="panel-card">
              <h3>🏦 ATM Note Inventory</h3>
              <div className="total-cash-badge">
                Total Available: <strong>₹{dispenser.totalCash}</strong>
              </div>
              <div className="inventory-grid">
                {dispenser.inventory && Object.entries(dispenser.inventory).map(([denom, count]) => (
                  <div key={denom} className="denom-card">
                    <span className="denom-name">{denom}</span>
                    <span className="denom-count">{count} notes</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Printable Receipt Modal / View */}
            {receipt && (
              <div className="panel-card receipt-card">
                <h3>🧾 Transaction Receipt</h3>
                <div className="receipt-details">
                  <p>Txn ID: {receipt.transactionId}</p>
                  <p>Account: {receipt.accountNumber}</p>
                  <p>Amount: ₹{receipt.amount}</p>
                  <p>Status: <strong className="green">{receipt.status}</strong></p>
                  {receipt.dispensedNotes && (
                    <div className="receipt-notes">
                      <p>Notes Dispensed:</p>
                      {Object.entries(receipt.dispensedNotes).map(([k, v]) => (
                        <span key={k} className="note-chip">{k}: {v}x</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CONCURRENCY SIMULATION */}
      {activeTab === 'sim' && (
        <div className="atm-sim-layout">
          <div className="sim-toolbar">
            <h2>🔒 Interactive ATM Concurrency Scenarios</h2>
            <button className="btn-sim-action" onClick={handleSimReset} disabled={simLoading}>
              🔄 Reset Simulation
            </button>
          </div>

          <div className="sim-scenarios-grid">
            <div className="sim-scenario-card">
              <h3>⚡ Scenario 1: 10-Thread Balance Race</h3>
              <p>Fires 10 concurrent withdrawal threads of ₹600 against Account ACC-SIM-1 (Balance: ₹1000). Demonstrates fine-grained per-account ReentrantLock preventing overselling.</p>
              <button
                className="btn-trigger"
                onClick={() => handleSimWithdraw('ACC-SIM-1', 600)}
                disabled={simLoading}
              >
                🚀 Trigger Simultaneous ₹600 Withdrawals
              </button>
            </div>

            <div className="sim-scenario-card">
              <h3>💸 Scenario 2: Denomination Mismatch Revert</h3>
              <p>Requests ₹2300 withdrawal when insufficient note combinations exist. Demonstrates compensating credit transaction reverting account debit on dispenser failure.</p>
              <button
                className="btn-trigger"
                onClick={() => handleSimWithdraw('ACC-SIM-2', 2300)}
                disabled={simLoading}
              >
                ⚠️ Trigger ₹2300 Denomination Failure
              </button>
            </div>

            <div className="sim-scenario-card">
              <h3>🔒 Scenario 3: 3-Attempt PIN Lockout</h3>
              <p>Enters 3 consecutive wrong PINs to demonstrate security state machine transition to CARD_BLOCKED.</p>
              <button
                className="btn-trigger red"
                onClick={async () => {
                  await handleSimAuth('CARD-SIM-1', '9999');
                  await handleSimAuth('CARD-SIM-1', '9999');
                  await handleSimAuth('CARD-SIM-1', '9999');
                }}
                disabled={simLoading}
              >
                🚫 Trigger 3 Wrong PIN Lockout
              </button>
            </div>
          </div>

          {/* Timeline Event Stream */}
          <div className="sim-events-timeline">
            <h3>📜 Real-Time Simulation Event Log</h3>
            <div className="timeline-list">
              {simEvents.map(evt => (
                <div key={evt.id} className={`timeline-item ${evt.type.toLowerCase()}`}>
                  <span className="time">{evt.timestamp}</span>
                  <span className="actor">{evt.actor}</span>
                  <span className="type-tag">{evt.type}</span>
                  <p className="desc">{evt.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CLASS DIAGRAM */}
      {activeTab === 'diagram' && (
        <ClassDiagram lldKey="atm" />
      )}

      {/* TAB 4: DESIGN DETAILS */}
      {activeTab === 'details' && (
        <DesignDetails lldKey="atm" />
      )}
    </div>
  );
}
