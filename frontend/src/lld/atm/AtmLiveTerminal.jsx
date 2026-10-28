import { useEffect, useLayoutEffect, useRef } from 'react';

const MODES = [
  { value: 'MINIMIZE_NOTES', label: 'Minimize Notes (Exact)' },
  { value: 'CONSERVE_LARGE_NOTES', label: 'Conserve Large Notes' },
];
const CARDS = [
  ['1111222233334444', 'John Doe (PIN: 1234)'],
  ['5555666677778888', 'Jane Smith (PIN: 4321)'],
  ['9999888877776666', 'Alice Johnson (PIN: 0000)'],
];

function ReadFeedback({ status, name }) {
  return <>
    {status.loading && <p role="status">Refreshing {name}…</p>}
    {status.error && <div role="alert" className="screen-alert error">
      {status.error} Last confirmed data is retained, if available.
    </div>}
  </>;
}

export default function AtmLiveTerminal({ workspace }) {
  const {
    sessionState, cardNumber, pinInput, activeAccount, currentBalance, amountInput, mode,
    transactions, dispenser, receipt, errorMsg, successMsg, uncertain, pending, reads,
    activate, load, run, setDraft,
  } = workspace;
  const pinRef = useRef(null);
  const amountRef = useRef(null);
  const insertRef = useRef(null);
  const headerRef = useRef(null);
  const receiptRef = useRef(null);
  const errorRef = useRef(null);
  const previous = useRef({ sessionState, pending });
  const busy = Boolean(pending);
  const locked = busy || uncertain;
  const authenticated = sessionState === 'AUTHENTICATED' && activeAccount;

  useEffect(() => activate(), [activate]);
  useLayoutEffect(() => {
    if (pending) { previous.current.pending = pending; return; }
    const finished = previous.current.pending;
    const transitioned = previous.current.sessionState !== sessionState;
    previous.current = { sessionState, pending };
    if (!finished && !transitioned) return;
    if (uncertain && errorMsg) errorRef.current?.focus();
    else if (sessionState === 'CARD_INSERTED') pinRef.current?.focus();
    else if (sessionState === 'AUTHENTICATED') {
      if (['withdraw', 'deposit'].includes(finished) && !errorMsg && receipt) receiptRef.current?.focus();
      else amountRef.current?.focus();
    } else if (sessionState === 'IDLE') insertRef.current?.focus();
    else headerRef.current?.focus();
  }, [sessionState, pending, errorMsg, receipt, uncertain]);

  const submitPin = event => { event.preventDefault(); run('authenticate'); };
  const keypad = key => {
    if (locked || sessionState !== 'CARD_INSERTED') return;
    if (key === 'CLEAR') setDraft('pinInput', '');
    else if (key === 'ENTER') run('authenticate');
    else if (pinInput.length < 4) setDraft('pinInput', pinInput + key);
  };

  return <div className="atm-terminal-layout atm-live-terminal">
    <div className="atm-cabinet">
      <div className="atm-screen">
        <div className="screen-header">
          <h2 ref={headerRef} tabIndex={-1} className="bank-logo">🏦 APEX BANK ATM</h2>
          <span className={`status-pill ${sessionState.toLowerCase()}`}>State: {sessionState}</span>
        </div>
        {errorMsg && <div ref={errorRef} tabIndex={-1} role="alert" className="screen-alert error">{errorMsg}</div>}
        {successMsg && <div role="status" className="screen-alert success">{successMsg}</div>}
        {pending && <p role="status">{({ insert: 'Inserting card', authenticate: 'Verifying PIN', withdraw: 'Requesting withdrawal', deposit: 'Requesting deposit', eject: 'Ejecting card' })[pending]}…</p>}

        {sessionState === 'IDLE' && <div className="screen-body idle">
          <h3>Please Select Card to Begin</h3>
          <p>Choose a demo card from the card panel.</p>
        </div>}

        {sessionState === 'CARD_INSERTED' && <form className="screen-body pin-entry" aria-label="Authenticate inserted card" onSubmit={submitPin}>
          <h3>Enter 4-Digit PIN</h3>
          <label htmlFor="atm-live-pin">4-digit PIN</label>
          <input ref={pinRef} id="atm-live-pin" type="password" inputMode="numeric" autoComplete="off" maxLength={4}
            value={pinInput} onChange={event => setDraft('pinInput', event.target.value)} disabled={locked} />
          <div className="pin-dots" aria-hidden="true">{[0, 1, 2, 3].map(index =>
            <span key={index} className={`dot ${pinInput.length > index ? 'filled' : ''}`}>●</span>)}</div>
          <p className="hint">Use the PIN field or keypad (John=1234, Jane=4321, Alice=0000).</p>
          <button type="submit" className="btn-action balance" disabled={locked}>Verify PIN</button>
        </form>}

        {authenticated && <div className="screen-body menu">
          <div className="account-hud">
            <span>Account: <strong>{activeAccount.accountNumber}</strong></span>
            <span>Last confirmed balance: <strong className="green">₹{currentBalance !== null ? currentBalance.toFixed(2) : '…'}</strong></span>
          </div>
          <ReadFeedback status={reads.balance} name="balance" />
          <form className="atm-amount-selector" aria-label="ATM transaction" onSubmit={event => { event.preventDefault(); run('withdraw'); }}>
            <label htmlFor="atm-live-amount">Amount (₹)</label>
            <input ref={amountRef} id="atm-live-amount" type="number" required step="any" value={amountInput}
              onChange={event => setDraft('amountInput', event.target.value)} disabled={locked} />
            <div className="quick-buttons">{[100, 500, 2000, 5000].map(amount =>
              <button key={amount} type="button" onClick={() => setDraft('amountInput', String(amount))} disabled={locked}>₹{amount}</button>)}</div>
            <label className="mode-label" htmlFor="atm-live-mode">Dispense strategy</label>
            <select id="atm-live-mode" className="mode-select" value={mode}
              onChange={event => setDraft('mode', event.target.value)} disabled={locked}>
              {MODES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <div className="screen-actions">
              <button type="submit" className="btn-action withdraw" disabled={locked}>💵 Withdraw Cash</button>
              <button type="button" className="btn-action deposit" disabled={locked} onClick={() => {
                if (amountRef.current.reportValidity()) run('deposit');
              }}>📥 Deposit Cash</button>
              <button type="button" className="btn-action balance" aria-disabled={busy || reads.balance.loading} onClick={() => load('balance')}>{reads.balance.error ? 'Retry balance' : '🔄 Refresh Balance'}</button>
            </div>
          </form>
        </div>}

        {sessionState === 'CARD_BLOCKED' && <div className="screen-body blocked">
          <h3 className="red">🚫 CARD BLOCKED</h3>
          <p>The server reports that this card is blocked. Eject it to reset the terminal.</p>
        </div>}
        <button type="button" className="btn-action eject atm-live-eject" disabled={busy} onClick={() => run('eject')}>⏏️ Eject Card</button>
        {sessionState === 'IDLE' && <p className="hint">Eject also resets a terminal left active in another visit.</p>}
      </div>

      <div className="atm-hardware-panel">
        <div className="card-slot-area">
          <span className="slot-label">💳 CARD SLOT</span>
          <div className={`card-slot ${sessionState !== 'IDLE' ? 'active' : ''}`}>
            {sessionState !== 'IDLE' ? '💳 [CARD INSERTED]' : '[INSERT CARD]'}
          </div>
        </div>
        <div className="keypad-grid" role="group" aria-label="PIN keypad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', 'ENTER'].map(key =>
            <button key={key} type="button" className={`keypad-btn ${key === 'CLEAR' ? 'clear' : key === 'ENTER' ? 'enter' : ''}`}
              disabled={locked || sessionState !== 'CARD_INSERTED'} onClick={() => keypad(key)}>{key}</button>)}
        </div>
        <div className={`cash-dispenser-slot ${pending === 'withdraw' ? 'dispensing' : ''}`}>
          <span>💵 CASH DISPENSER SLOT</span>
          {pending === 'withdraw' && <div className="anim-notes">Waiting for withdrawal confirmation…</div>}
        </div>
      </div>
    </div>

    <div className="atm-side-panel">
      <div className="panel-card">
        <h3>💳 Select Demo Card</h3>
        <div className="card-selector" role="group" aria-label="Demo card">
          {CARDS.map(([number, label]) => <button key={number} type="button" aria-pressed={cardNumber === number}
            className={cardNumber === number ? 'selected' : ''} disabled={locked || sessionState !== 'IDLE'}
            onClick={() => setDraft('cardNumber', number)}>{label}</button>)}
        </div>
        <button ref={insertRef} type="button" className="btn-insert-main" disabled={locked || sessionState !== 'IDLE'} onClick={() => run('insert')}>📥 Insert Selected Card</button>
      </div>

      <section className="panel-card" aria-label="ATM note inventory">
        <h3>🏦 ATM Note Inventory</h3>
        <ReadFeedback status={reads.inventory} name="inventory" />
        {dispenser ? <>
          <div className="total-cash-badge">Total Available: <strong>₹{dispenser.totalCash.toLocaleString('en-IN')}</strong></div>
          <div className="inventory-grid">{Object.entries(dispenser.inventory).map(([denomination, count]) =>
            <div key={denomination} className="denom-card"><span className="denom-name">{denomination}</span><span className="denom-count">{count} notes</span></div>)}</div>
        </> : <p>No confirmed inventory yet.</p>}
        <button type="button" className="btn-action balance" aria-disabled={busy || reads.inventory.loading} onClick={() => load('inventory')}>{reads.inventory.error ? 'Retry inventory' : 'Refresh inventory'}</button>
      </section>

      {receipt && <section className="panel-card receipt-card" aria-label="Last confirmed transaction receipt">
        <h3 ref={receiptRef} tabIndex={-1}>🧾 Transaction Receipt</h3>
        <div className="receipt-details">
          <p>Txn ID: {receipt.transactionId}</p><p>Account: {receipt.accountNumber}</p>
          <p>Amount: ₹{receipt.amount.toLocaleString('en-IN')}</p><p>Type: {receipt.type}</p>
          <p>Status: <strong className="green">{receipt.status}</strong></p>
          {receipt.dispensedNotes && <div className="receipt-notes"><p>Notes Dispensed:</p>
            {Object.entries(receipt.dispensedNotes).map(([denomination, count]) => <span key={denomination} className="note-chip">{denomination}: {count}x </span>)}
          </div>}
        </div>
      </section>}

      {activeAccount && <section className="panel-card" aria-label="Recent transactions">
        <h3>📜 Recent Transactions</h3>
        <ReadFeedback status={reads.transactions} name="transactions" />
        {transactions === null ? <p>No confirmed transaction history yet.</p>
          : !transactions.length ? <p>No transactions recorded.</p>
            : <div className="txn-list">{transactions.slice(-8).reverse().map(transaction =>
              <div key={transaction.transactionId} className={`txn-row ${transaction.status === 'FAILED' ? 'failed' : ''}`}>
                <span>{transaction.type}</span><span>₹{transaction.amount.toLocaleString('en-IN')}</span>
                <span className="txn-status">{transaction.status}</span>
                {transaction.failureReason && <span className="atm-txn-reason">{transaction.failureReason}</span>}
              </div>)}</div>}
        <button type="button" className="btn-action balance" aria-disabled={busy || reads.transactions.loading} onClick={() => load('transactions')}>{reads.transactions.error ? 'Retry transactions' : 'Refresh transactions'}</button>
      </section>}
    </div>
  </div>;
}

