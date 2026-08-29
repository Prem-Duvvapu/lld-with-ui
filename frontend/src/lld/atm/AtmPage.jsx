import { useState, useEffect, useRef } from 'react';
import LldPage from '../../components/LldPage';
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
  simInsertCard,
  simAuthenticate,
  simWithdraw,
  simEject,
} from './api';
import './AtmPage.css';

const DISPENSE_MODES = [
  { value: 'MINIMIZE_NOTES', label: 'Minimize Notes (Greedy)' },
  { value: 'CONSERVE_LARGE_NOTES', label: 'Conserve Large Notes' },
];

const SESSION_STATES = ['IDLE', 'CARD_INSERTED', 'AUTHENTICATED', 'TRANSACTION_IN_PROGRESS', 'DISPENSING'];

function StateStrip({ state }) {
  const idx = SESSION_STATES.indexOf(state);
  return (
    <div className="atm-state-strip">
      {SESSION_STATES.map((s, i) => (
        <div key={s} className={`atm-state-node ${s === state ? 'active' : ''} ${i < idx ? 'passed' : ''}`}>
          {s.replace(/_/g, ' ')}
        </div>
      ))}
      {state === 'CARD_BLOCKED' && <div className="atm-state-node blocked active">CARD BLOCKED</div>}
    </div>
  );
}

/* ============================= TAB 1: LIVE TERMINAL ============================= */

function AppTab() {
  const [sessionState, setSessionState] = useState('IDLE');
  const [cardNumber, setCardNumber] = useState('1111222233334444');
  const [pinInput, setPinInput] = useState('');
  const [activeAccount, setActiveAccount] = useState(null);
  const [currentBalance, setCurrentBalance] = useState(null);
  const [amountInput, setAmountInput] = useState('500');
  const [mode, setMode] = useState('MINIMIZE_NOTES');
  const [transactions, setTransactions] = useState([]);
  const [dispenser, setDispenser] = useState({ totalCash: 0, inventory: {} });
  const [receipt, setReceipt] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [dispensingAnimation, setDispensingAnimation] = useState(false);

  useEffect(() => { fetchDispenser(); }, []);

  const fetchDispenser = async () => {
    try {
      const data = await getDispenserStatus();
      if (data) setDispenser(data);
    } catch (err) { console.error(err); }
  };

  const handleInsertCard = async () => {
    setErrorMsg(''); setSuccessMsg('');
    try {
      const res = await insertCard(cardNumber);
      setSessionState(res.state || 'CARD_INSERTED');
      setSuccessMsg(`Card ${cardNumber} inserted. Please enter 4-digit PIN.`);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to insert card');
      if (err.message && err.message.includes('BLOCKED')) setSessionState('CARD_BLOCKED');
    }
  };

  const handleKeypadPress = (val) => {
    if (val === 'CLEAR') setPinInput('');
    else if (val === 'ENTER') handleAuthenticatePIN();
    else if (pinInput.length < 4) setPinInput((prev) => prev + val);
  };

  const handleAuthenticatePIN = async () => {
    setErrorMsg(''); setSuccessMsg('');
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
      if (err.message && err.message.includes('BLOCKED')) setSessionState('CARD_BLOCKED');
    }
  };

  const handleWithdraw = async () => {
    if (!activeAccount) return;
    setErrorMsg(''); setSuccessMsg('');
    setSessionState('TRANSACTION_IN_PROGRESS');
    setDispensingAnimation(true);
    try {
      const txn = await withdraw(activeAccount.accountNumber, amountInput, mode);
      setDispensingAnimation(false);
      setSessionState('AUTHENTICATED');
      setReceipt(txn);
      setSuccessMsg(`Successfully withdrew ₹${amountInput}! Cash dispensed via ${mode === 'MINIMIZE_NOTES' ? 'fewest-notes' : 'note-conserving'} strategy.`);
      handleCheckBalance();
      fetchTransactions(activeAccount.accountNumber);
      fetchDispenser();
    } catch (err) {
      setDispensingAnimation(false);
      setSessionState('AUTHENTICATED');
      setErrorMsg(err.message || 'Withdrawal Failed');
    }
  };

  const handleDeposit = async () => {
    if (!activeAccount) return;
    setErrorMsg(''); setSuccessMsg('');
    try {
      await deposit(activeAccount.accountNumber, amountInput);
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
    } catch (err) { console.error(err); }
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
    } catch (err) { console.error(err); }
  };

  const fetchTransactions = async (accNum) => {
    try {
      const list = await getTransactions(accNum);
      setTransactions(list || []);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="atm-terminal-layout">
      <div className="atm-cabinet">
        <div className="atm-screen">
          <div className="screen-header">
            <span className="bank-logo">🏦 APEX BANK ATM</span>
            <span className={`status-pill ${sessionState.toLowerCase()}`}>State: {sessionState}</span>
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
                {[0, 1, 2, 3].map((idx) => (
                  <span key={idx} className={`dot ${pinInput.length > idx ? 'filled' : ''}`}>●</span>
                ))}
              </div>
              <p className="hint">Use Keypad Below (Demo PINs: John=1234, Jane=4321, Alice=0000)</p>
            </div>
          )}

          {(sessionState === 'AUTHENTICATED' || sessionState === 'TRANSACTION_IN_PROGRESS') && activeAccount && (
            <div className="screen-body menu">
              <div className="account-hud">
                <span>Account: <strong>{activeAccount.accountNumber}</strong></span>
                <span>Balance: <strong className="green">₹{currentBalance !== null ? currentBalance.toFixed(2) : '...'}</strong></span>
              </div>

              <div className="atm-amount-selector">
                <label>Amount (₹):</label>
                <input type="number" step="100" value={amountInput} onChange={(e) => setAmountInput(e.target.value)} />
                <div className="quick-buttons">
                  {[100, 500, 2000, 5000].map((amt) => (
                    <button key={amt} onClick={() => setAmountInput(amt)}>+₹{amt}</button>
                  ))}
                </div>
                <label className="mode-label">Dispense Strategy:</label>
                <select className="mode-select" value={mode} onChange={(e) => setMode(e.target.value)}>
                  {DISPENSE_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              <div className="screen-actions">
                <button className="btn-action withdraw" onClick={handleWithdraw} disabled={sessionState !== 'AUTHENTICATED'}>💵 Withdraw Cash</button>
                <button className="btn-action deposit" onClick={handleDeposit} disabled={sessionState !== 'AUTHENTICATED'}>📥 Deposit Cash</button>
                <button className="btn-action balance" onClick={handleCheckBalance}>🔄 Refresh Balance</button>
                <button className="btn-action eject" onClick={handleEjectCard}>⏏️ Eject Card</button>
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

        <div className="atm-hardware-panel">
          <div className="card-slot-area">
            <span className="slot-label">💳 CARD SLOT</span>
            <div className={`card-slot ${sessionState !== 'IDLE' ? 'active' : ''}`}>
              {sessionState !== 'IDLE' ? '💳 [CARD INSERTED]' : '[INSERT CARD]'}
            </div>
          </div>

          <div className="keypad-grid">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', 'ENTER'].map((key) => (
              <button key={key} className={`keypad-btn ${key === 'CLEAR' ? 'clear' : key === 'ENTER' ? 'enter' : ''}`}
                onClick={() => handleKeypadPress(key)}>{key}</button>
            ))}
          </div>

          <div className={`cash-dispenser-slot ${dispensingAnimation ? 'dispensing' : ''}`}>
            <span>💵 CASH DISPENSER SLOT</span>
            {dispensingAnimation && <div className="anim-notes">💸 DISPENSING NOTES...</div>}
          </div>
        </div>
      </div>

      <div className="atm-side-panel">
        <div className="panel-card">
          <h3>💳 Select Demo Card</h3>
          <div className="card-selector">
            <button className={cardNumber === '1111222233334444' ? 'selected' : ''} onClick={() => setCardNumber('1111222233334444')}>
              John Doe (PIN: 1234) — ₹10,000
            </button>
            <button className={cardNumber === '5555666677778888' ? 'selected' : ''} onClick={() => setCardNumber('5555666677778888')}>
              Jane Smith (PIN: 4321) — ₹25,000
            </button>
            <button className={cardNumber === '9999888877776666' ? 'selected' : ''} onClick={() => setCardNumber('9999888877776666')}>
              Alice Johnson (PIN: 0000) — ₹1,200
            </button>
          </div>
          <button className="btn-insert-main" onClick={handleInsertCard}>📥 Insert Selected Card</button>
        </div>

        <div className="panel-card">
          <h3>🏦 ATM Note Inventory</h3>
          <div className="total-cash-badge">Total Available: <strong>₹{dispenser.totalCash}</strong></div>
          <div className="inventory-grid">
            {dispenser.inventory && Object.entries(dispenser.inventory).map(([denom, count]) => (
              <div key={denom} className="denom-card">
                <span className="denom-name">{denom}</span>
                <span className="denom-count">{count} notes</span>
              </div>
            ))}
          </div>
        </div>

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

        {transactions.length > 0 && (
          <div className="panel-card">
            <h3>📜 Recent Transactions</h3>
            <div className="txn-list">
              {transactions.slice().reverse().slice(0, 8).map((t) => (
                <div key={t.transactionId} className={`txn-row ${t.status === 'FAILED' ? 'failed' : ''}`}>
                  <span>{t.type}</span>
                  <span>₹{t.amount}</span>
                  <span className="txn-status">{t.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================= TAB 2: 8-STEP SIMULATION ============================= */

const SIM_STEPS = [
  'Reset sandbox',
  'View seeded accounts & cards',
  'Insert card',
  'Authenticate with PIN',
  'Withdraw with a chosen dispense strategy',
  'Trigger a 10-thread concurrent withdrawal race',
  'Eject card',
  'Review telemetry & event log',
];

function SimulationTab() {
  const [snapshot, setSnapshot] = useState(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cardNumber, setCardNumber] = useState('CARD-SIM-1');
  const [pin, setPin] = useState('1234');
  const [amount, setAmount] = useState('300');
  const [mode, setMode] = useState('MINIMIZE_NOTES');
  const [raceResult, setRaceResult] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const events = snapshot?.events || [];
  const inventory = snapshot?.inventory || {};

  const applyResult = (result, advanceHint) => {
    if (!mountedRef.current) return;
    if (result?.error) { setError(result.error); return; }
    setSnapshot(result);
    if (advanceHint != null) setStep((s) => Math.min(SIM_STEPS.length - 1, Math.max(s, advanceHint)));
  };

  const withBusy = async (fn) => {
    setBusy(true); setError('');
    try { await fn(); } catch (err) { setError(err.message || 'Simulation step failed'); }
    finally { if (mountedRef.current) setBusy(false); }
  };

  const doReset = () => withBusy(async () => {
    const result = await simReset();
    setRaceResult(null);
    applyResult(result, 1);
  });

  const doInsertCard = () => withBusy(async () => {
    const result = await simInsertCard(cardNumber);
    applyResult(result, 2);
  });

  const doAuthenticate = () => withBusy(async () => {
    const result = await simAuthenticate(cardNumber, pin);
    applyResult(result, 3);
  });

  const doWithdraw = () => withBusy(async () => {
    const acc = snapshot?.activeAccount;
    if (!acc) { setError('Authenticate first.'); return; }
    const result = await simWithdraw(acc.accountNumber, Number(amount), mode);
    applyResult(result, 4);
  });

  const doRace = () => withBusy(async () => {
    const acc = snapshot?.activeAccount;
    if (!acc) { setError('Authenticate first.'); return; }
    const attempts = 10;
    const results = await Promise.all(
      Array.from({ length: attempts }, () => simWithdraw(acc.accountNumber, 600, mode).catch((e) => ({ error: e.message })))
    );
    const succeeded = results.filter((r) => !r?.error).length;
    setRaceResult({ attempts, succeeded });
    const last = results.find((r) => !r?.error) || results[results.length - 1];
    applyResult(last, 5);
  });

  const doEject = () => withBusy(async () => {
    const result = await simEject();
    applyResult(result, 6);
  });

  const reset = () => { setSnapshot(null); setStep(0); setError(''); setRaceResult(null); };
  const finalStep = () => setStep(7);

  const accounts = snapshot?.accounts || [];
  const cards = snapshot?.cards || [];
  const simState = snapshot?.simState || 'IDLE';

  return (
    <div>
      <div className="atm-step-indicator">
        {SIM_STEPS.map((s, i) => (
          <div key={s} className={`atm-step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} title={s} />
        ))}
        <span className="atm-step-label">{SIM_STEPS[step]}</span>
      </div>

      {error && <div className="screen-alert error atm-sim-error">{error}</div>}

      {!snapshot ? (
        <div className="atm-sim-intro">
          <p>
            Runs entirely against the isolated <code>/api/atm/sim/*</code> sandbox — its own
            <code>BankingRepository</code> and <code>CashDispenser</code> instances, seeded with 2
            accounts and 2 cards — so nothing here can ever touch the real terminal's accounts.
          </p>
          <div className="atm-sim-actions">
            <button className="btn-trigger" onClick={doReset} disabled={busy}>▶ Reset Sandbox</button>
          </div>
        </div>
      ) : (
        <>
          <div className="atm-hud">
            <div className="atm-hud-tile"><div className="v">{simState}</div><div className="l">Session State</div></div>
            <div className="atm-hud-tile"><div className="v">₹{snapshot.dispenserCash ?? 0}</div><div className="l">Cash In Cassette</div></div>
            <div className="atm-hud-tile"><div className="v">{events.length}</div><div className="l">Events Logged</div></div>
            <div className="atm-hud-tile"><div className="v">{raceResult ? `${raceResult.succeeded}/${raceResult.attempts}` : '—'}</div><div className="l">Race Winners</div></div>
            <div className="atm-hud-tile"><div className="v">{snapshot.activeAccount ? snapshot.activeAccount.accountNumber : '—'}</div><div className="l">Active Account</div></div>
          </div>

          <StateStrip state={simState} />

          <div className="atm-sim-grid">
            <div className="panel-card">
              <h3>👤 Seeded Accounts</h3>
              {accounts.map((a) => (
                <div key={a.accountNumber} className={`sim-account-row ${snapshot.activeAccount?.accountNumber === a.accountNumber ? 'active' : ''}`}>
                  <span>{a.holderName} ({a.accountNumber})</span>
                  <strong>₹{a.balance?.toFixed ? a.balance.toFixed(2) : a.balance}</strong>
                </div>
              ))}
              <h3 style={{ marginTop: 12 }}>💳 Seeded Cards</h3>
              {cards.map((c) => (
                <div key={c.cardNumber} className={`sim-account-row ${c.blocked ? 'blocked' : ''}`}>
                  <span>{c.cardNumber} (PIN {c.pin})</span>
                  <span>{c.blocked ? '🚫 BLOCKED' : '✅ active'}</span>
                </div>
              ))}
            </div>

            <div className="panel-card">
              <h3>🏦 Cassette Inventory</h3>
              <div className="inventory-grid">
                {Object.entries(inventory).map(([denom, count]) => (
                  <div key={denom} className="denom-card">
                    <span className="denom-name">{denom}</span>
                    <span className="denom-count">{count} notes</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {step === 2 && (
            <div className="atm-sim-actions">
              <select value={cardNumber} onChange={(e) => setCardNumber(e.target.value)}>
                <option value="CARD-SIM-1">CARD-SIM-1 (Sim Alice, ₹1000)</option>
                <option value="CARD-SIM-2">CARD-SIM-2 (Sim Bob, ₹5000)</option>
              </select>
              <button className="btn-trigger" onClick={doInsertCard} disabled={busy}>Insert Card</button>
            </div>
          )}

          {step === 3 && (
            <div className="atm-sim-actions">
              <input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" maxLength={4} />
              <button className="btn-trigger" onClick={doAuthenticate} disabled={busy}>Authenticate</button>
              <button className="btn-trigger red" onClick={() => setPin('9999')} disabled={busy}>Use Wrong PIN (demo lockout)</button>
            </div>
          )}

          {step === 4 && (
            <div className="atm-sim-actions">
              <input type="number" step="100" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                {DISPENSE_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <button className="btn-trigger" onClick={doWithdraw} disabled={busy}>Withdraw</button>
            </div>
          )}

          {step === 5 && (
            <div className="atm-sim-actions">
              <span className="atm-sim-hint">Fires 10 concurrent ₹600 withdrawals at the active account — the per-account lock must let exactly one win.</span>
              <button className="btn-trigger" onClick={doRace} disabled={busy}>🚀 Trigger 10-Thread Race</button>
            </div>
          )}

          {step === 6 && (
            <div className="atm-sim-actions">
              <button className="btn-trigger" onClick={doEject} disabled={busy}>⏏️ Eject Card</button>
            </div>
          )}

          {step === 7 && (
            <div className="atm-sim-actions">
              <span className="atm-sim-hint">Walkthrough complete — inspect the event log below.</span>
            </div>
          )}

          <div className="panel-card">
            <h3>📜 Event Log</h3>
            <div className="timeline-list">
              {events.slice().reverse().slice(0, 30).map((evt) => (
                <div key={evt.id} className={`timeline-item ${(evt.type || '').toLowerCase()}`}>
                  <span className="time">{evt.timestamp}</span>
                  <span className="actor">{evt.actor}</span>
                  <span className="type-tag">{evt.type}</span>
                  <p className="desc">{evt.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="atm-sim-actions">
            {step >= 6 && step < 7 && <button className="btn-trigger" onClick={finalStep} disabled={busy}>Review Telemetry →</button>}
            <button className="btn-trigger" onClick={doReset} disabled={busy}>↺ Reset</button>
            <button className="btn-trigger red" onClick={reset} disabled={busy}>Exit Sandbox</button>
          </div>
        </>
      )}
    </div>
  );
}

export default function AtmPage() {
  return (
    <LldPage module="atm" title="ATM System" icon="🏧" tabs={['app', 'simulation', 'diagram', 'sequence', 'design']}>
      {(activeTab) => (
        <div className="atm-page">
          {activeTab === 'app' && <AppTab />}
          {activeTab === 'simulation' && <SimulationTab />}
        </div>
      )}
    </LldPage>
  );
}
