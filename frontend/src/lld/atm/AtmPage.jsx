import { useState, useEffect, useRef } from 'react';
import LldPage from '../../components/LldPage';
import {
  simReset,
  simInsertCard,
  simAuthenticate,
  simWithdraw,
  simEject,
} from './api';
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
    applyResult(result, 3);
  });

  const doAuthenticate = () => withBusy(async () => {
    const result = await simAuthenticate(cardNumber, pin);
    applyResult(result, 4);
  });

  const doWithdraw = () => withBusy(async () => {
    const acc = snapshot?.activeAccount;
    if (!acc) { setError('Authenticate first.'); return; }
    const result = await simWithdraw(acc.accountNumber, Number(amount), mode);
    applyResult(result, 5);
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
    applyResult(last, 6);
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
    <div className="atm-simulation">
      <div className="atm-step-indicator">
        {SIM_STEPS.map((s, i) => (
          <div key={s} className={`atm-step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} title={s} />
        ))}
        <span className="atm-step-label">{SIM_STEPS[step]}</span>
      </div>

      {error && <div role="alert" className="screen-alert error atm-sim-error">{error}</div>}

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
            <div className="atm-hud-tile"><div className="v">₹{(snapshot.dispenserCash ?? 0).toLocaleString('en-IN')}</div><div className="l">Cash In Cassette</div></div>
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

          {step === 1 && (
            <div className="atm-sim-actions">
              <span className="atm-sim-hint">The sandbox seeded 2 accounts and 2 cards, shown in the panels above — nothing to do here but look before moving on.</span>
              <button className="btn-trigger" onClick={() => setStep(2)} disabled={busy}>Next: Insert Card →</button>
            </div>
          )}

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
