import { useEffect, useRef } from 'react';
import LldPage from '../../components/LldPage';
import { useAtmSandboxWorkspace } from './useAtmSandboxWorkspace';
import './AtmPage.css';
import AtmLiveTerminal from './AtmLiveTerminal';
import { useAtmLiveWorkspace } from './useAtmLiveWorkspace';

const DISPENSE_MODES = [
  { value: 'MINIMIZE_NOTES', label: 'Minimize Notes (Exact)' },
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

/* ============================= TAB 2: 8-STEP SIMULATION ============================= */

const SIM_STEPS = [
  'Reset sandbox',
  'View seeded accounts & cards',
  'Insert card',
  'Authenticate with PIN',
  'Withdraw with a chosen dispense strategy',
  'Send a burst of 10 withdrawal requests',
  'Eject card',
  'Review telemetry & event log',
];

function SimulationTab() {
  const workspace = useAtmSandboxWorkspace();
  const { snapshot, step, busy, error, needsRefresh, burstResult,
    cardNumber, setCardNumber, pin, setPin, amount, setAmount, mode, setMode } = workspace;
  const container = useRef(null);
  useEffect(() => {
    if (!busy && (step > 0 || needsRefresh)) container.current?.querySelector('[data-step-control]')?.focus();
  }, [step, busy, needsRefresh]);
  const disabled = busy || needsRefresh;
  const events = snapshot?.events || [];
  const inventory = snapshot?.inventory || {};

  const accounts = snapshot?.accounts || [];
  const cards = snapshot?.cards || [];
  const simState = snapshot?.simState || 'IDLE';

  return (
    <div className="atm-simulation" ref={container}>
      <div className="atm-step-indicator">
        {SIM_STEPS.map((s, i) => (
          <div key={s} className={`atm-step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} title={s} />
        ))}
        <span className="atm-step-label">{SIM_STEPS[step]}</span>
      </div>

      {error && <div role="alert" className="screen-alert error atm-sim-error">{error}</div>}
      {needsRefresh && <div role="status" className="panel-card">
        <p>Showing the last confirmed state. Refresh before making another change. Refreshing reads current state and does not repeat a withdrawal.</p>
        <button className="btn-trigger" data-step-control onClick={workspace.refresh} disabled={busy}>Retry state refresh</button>
      </div>}

      {!snapshot ? (
        <div className="atm-sim-intro">
          <p>
            Runs entirely against the isolated <code>/api/atm/sim/*</code> sandbox — its own
            <code>BankingRepository</code> and <code>CashDispenser</code> instances, seeded with 2
            accounts and 2 cards — so nothing here can ever touch the real terminal's accounts.
          </p>
          <div className="atm-sim-actions">
            <button className="btn-trigger" onClick={workspace.reset} disabled={disabled}>▶ Reset Sandbox</button>
            <button className="btn-trigger" onClick={workspace.refresh} disabled={busy}>Load current sandbox</button>
          </div>
        </div>
      ) : (
        <>
          <div className="atm-hud">
            <div className="atm-hud-tile"><div className="v">{simState}</div><div className="l">Session State</div></div>
            <div className="atm-hud-tile"><div className="v">₹{(snapshot.dispenserCash ?? 0).toLocaleString('en-IN')}</div><div className="l">Cash In Cassette</div></div>
            <div className="atm-hud-tile"><div className="v">{events.length}</div><div className="l">Events Logged</div></div>
            <div className="atm-hud-tile"><div className="v">{burstResult ? `${burstResult.approved}/${burstResult.attempts}` : '—'}</div><div className="l">Approved Burst Withdrawals</div></div>
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
                    <span className="denom-name">{denom.replace(/_/g, ' ')}</span>
                    <span className="denom-count">{count} notes</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {step === 1 && (
            <div className="atm-sim-actions">
              <span className="atm-sim-hint">The sandbox seeded 2 accounts and 2 cards, shown in the panels above — nothing to do here but look before moving on.</span>
              <button className="btn-trigger" data-step-control onClick={workspace.next} disabled={disabled}>Next: Insert Card →</button>
            </div>
          )}

          {step === 2 && (
            <div className="atm-sim-actions">
              <label>Card<select data-step-control aria-label="Sandbox card" disabled={disabled} value={cardNumber} onChange={(e) => setCardNumber(e.target.value)}>
                <option value="CARD-SIM-1">CARD-SIM-1 (Sim Alice, ₹1000)</option>
                <option value="CARD-SIM-2">CARD-SIM-2 (Sim Bob, ₹5000)</option>
              </select></label>
              <button className="btn-trigger" onClick={workspace.insert} disabled={disabled}>Insert Card</button>
            </div>
          )}

          {step === 3 && simState !== 'CARD_BLOCKED' && (
            <form className="atm-sim-actions" aria-label="Sandbox authentication" onSubmit={event => { event.preventDefault(); workspace.authenticate(); }}>
              <label>4-digit PIN<input type="password" inputMode="numeric" autoComplete="off" data-step-control aria-label="Sandbox PIN" disabled={disabled} value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" maxLength={4} required pattern="[0-9]{4}" /></label>
              <button className="btn-trigger" type="submit" disabled={disabled}>Authenticate</button>
              <button type="button" className="btn-trigger red" onClick={() => setPin('9999')} disabled={disabled}>Use Wrong PIN (demo lockout)</button>
            </form>
          )}

          {step === 4 && (
            <form className="atm-sim-actions" aria-label="Sandbox withdrawal" onSubmit={event => { event.preventDefault(); workspace.withdraw(); }}>
              <label>Amount (₹)<input data-step-control aria-label="Sandbox withdrawal amount (₹)" disabled={disabled} type="number" step="100" min="100" required value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
              <label>Dispense strategy<select aria-label="Sandbox dispense strategy" disabled={disabled} value={mode} onChange={(e) => setMode(e.target.value)}>
                {DISPENSE_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select></label>
              <button className="btn-trigger" type="submit" disabled={disabled}>Withdraw</button>
            </form>
          )}

          {step === 5 && (
            <div className="atm-sim-actions">
              <span className="atm-sim-hint">Sends 10 ₹600 requests together. The sandbox processes them serially; the balance and cassette determine how many are approved. This demonstrates a client request burst. The Java concurrency tests separately exercise the live account lock.</span>
              <button className="btn-trigger" data-step-control onClick={workspace.burst} disabled={disabled}>Send 10 withdrawal requests</button>
            </div>
          )}

          {step === 6 && (
            <div className="atm-sim-actions">
              <button className="btn-trigger" data-step-control onClick={workspace.eject} disabled={disabled}>⏏️ Eject Card</button>
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

          {burstResult && <p role="status">{burstResult.approved} approved responses from {burstResult.attempts} requests.
            {burstResult.unconfirmed > 0 && ` ${burstResult.unconfirmed} responses were not confirmed; their outcome is unknown. The refreshed state and event log show recorded activity.`}
          </p>}
          <div className="atm-sim-actions">
            {simState === 'CARD_BLOCKED' && <button className="btn-trigger" data-step-control onClick={workspace.eject} disabled={disabled}>Eject blocked card</button>}
            <button className="btn-trigger" data-step-control={step === 7 ? true : undefined} onClick={workspace.reset} disabled={disabled}>↺ Reset</button>
            <button className="btn-trigger red" onClick={workspace.exit} disabled={busy}>Exit Sandbox</button>
          </div>
        </>
      )}
    </div>
  );
}

export default function AtmPage() {
  const workspace = useAtmLiveWorkspace();
  return (
    <LldPage module="atm" title="ATM System" icon="🏧" tabs={['app', 'simulation', 'diagram', 'sequence', 'design']}>
      {(activeTab) => (
        <div className={activeTab === 'app' ? 'atm-page atm-live-page' : 'atm-page'}>
          {activeTab === 'app' && <AtmLiveTerminal workspace={workspace} />}
          {activeTab === 'simulation' && <SimulationTab />}
        </div>
      )}
    </LldPage>
  );
}
