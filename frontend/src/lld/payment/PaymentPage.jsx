import { useState } from 'react'
import * as api from './api'
import LldPage from '../../components/LldPage'
import StepIndicator from '../../components/ui/StepIndicator'

const METHODS = ['CREDIT_CARD', 'UPI', 'WALLET']

const STATUS_TONE = {
  INITIATED: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  AUTHORIZED: { bg: 'var(--info-bg)', color: 'var(--info)' },
  CAPTURED: { bg: 'var(--success-bg)', color: 'var(--success)' },
  REFUNDED: { bg: 'var(--info-bg)', color: 'var(--info)' },
  FAILED: { bg: 'var(--danger-bg)', color: 'var(--danger)' },
}

export default function PaymentPage() {
  const [payerId, setPayerId] = useState('payer-demo')
  const [amount, setAmount] = useState('1500')
  const [method, setMethod] = useState('UPI')
  const [lastPayment, setLastPayment] = useState(null)
  const [message, setMessage] = useState(null)
  // No "list all" endpoint is exposed live (a real gateway wouldn't hand every merchant's ledger
  // to any caller); the Payments tab shows this browser's own charge history instead.
  const [payments, setPayments] = useState([])

  const [simSnapshot, setSimSnapshot] = useState(null)
  const [simStep, setSimStep] = useState(0)
  const [simLoading, setSimLoading] = useState(false)
  const [simError, setSimError] = useState('')
  const [cleanChargeId, setCleanChargeId] = useState(null)

  const showBanner = (text, type) => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4000)
  }

  const handleCharge = async () => {
    try {
      const idempKey = 'IDEMP-' + Date.now()
      const payment = await api.charge(idempKey, payerId, Number(amount), method)
      setLastPayment(payment)
      setPayments((prev) => [payment, ...prev])
      showBanner(`Charged ₹${amount} — payment ${payment.id} is ${payment.status}`, 'success')
    } catch (err) {
      showBanner(err.message || 'Charge failed', 'error')
    }
  }

  const handleRefund = async (paymentId) => {
    try {
      const refunded = await api.refund(paymentId)
      setPayments((prev) => prev.map((p) => (p.id === paymentId ? refunded : p)))
      showBanner(`Payment ${paymentId} refunded`, 'success')
    } catch (err) {
      showBanner(err.message || 'Refund failed', 'error')
    }
  }

  // SIMULATION -- a 7-step, user-driven walkthrough against the isolated /api/payment/sim/*
  // sandbox: reset, a clean charge, a fraud-rejected charge (trip the velocity check), a
  // duplicate-charge idempotency demo, a refund, a live concurrent double-submit race, and a
  // final telemetry review.
  const SIM_STEPS = [
    {
      title: 'Reset Sandbox',
      detail: 'Wipe the isolated sim sandbox — an empty payment ledger, completely separate from the live payments shown in the other tabs.',
      run: async () => {
        const snap = await api.simReset()
        setSimSnapshot(snap)
        setCleanChargeId(null)
      },
    },
    {
      title: 'A Clean Charge',
      detail: 'Alice charges ₹1,500 via UPI. The fraud chain approves it, AmountLimitHandler included, and it reaches CAPTURED with a real transaction id.',
      run: async () => {
        const snap = await api.simCharge('SIM-CLEAN-' + Date.now(), 'Sim_Alice', 1500, 'UPI')
        setSimSnapshot(snap)
        const payments = snap.payments || []
        const clean = payments.find(p => p.payerId === 'Sim_Alice')
        setCleanChargeId(clean ? clean.id : null)
      },
    },
    {
      title: 'Trip the Velocity Check',
      detail: 'Sim_Bob submits 4 charges back to back — the velocity window only allows 3. The 4th is rejected by VelocityCheckHandler, the FIRST link in the fraud chain, before the payment ever reaches AUTHORIZED.',
      run: async () => {
        let snap;
        for (let i = 0; i < 4; i++) {
          snap = await api.simCharge('SIM-VELOCITY-' + i, 'Sim_Bob', 200, 'WALLET')
        }
        setSimSnapshot(snap)
      },
    },
    {
      title: 'Duplicate-Charge Idempotency Demo',
      detail: 'The same idempotencyKey is submitted twice for Sim_Carol — the second call never re-runs the fraud chain or the payment strategy; it returns the exact same Payment object from the first call.',
      run: async () => {
        const key = 'SIM-DUP-' + Date.now()
        await api.simCharge(key, 'Sim_Carol', 999, 'CREDIT_CARD')
        const snap = await api.simCharge(key, 'Sim_Carol', 999, 'CREDIT_CARD')
        setSimSnapshot(snap)
      },
    },
    {
      title: 'Refund the Clean Charge',
      detail: "Alice's CAPTURED payment from step 2 is refunded — CAPTURED → REFUNDED, a one-way terminal move.",
      run: async () => {
        if (!cleanChargeId) return
        const snap = await api.simRefund(cleanChargeId)
        setSimSnapshot(snap)
      },
    },
    {
      title: 'Live 6-Way Double-Submit Race',
      detail: 'Six threads submit the SAME idempotency key simultaneously. The per-key lock (not a lock-free CAS — see RCA-058-adjacent reasoning in the design write-up) means exactly one payment is ever created and the payment strategy runs exactly once.',
      run: async () => {
        const snap = await api.simRace('SIM-RACE-' + Date.now(), 'Sim_Dave', 750, 'UPI', 6)
        setSimSnapshot(snap)
      },
    },
    {
      title: 'Review Telemetry & Event Log',
      detail: 'Walkthrough complete — inspect the final payment ledger and full event log below.',
      run: async () => {},
    },
  ]

  const runSimStep = async (forceReset) => {
    setSimLoading(true)
    setSimError('')
    try {
      if (forceReset || simStep >= SIM_STEPS.length) {
        await SIM_STEPS[0].run()
        setSimStep(1)
      } else {
        await SIM_STEPS[simStep].run()
        setSimStep(s => s + 1)
      }
    } catch (err) {
      setSimError(err.message || 'Simulation step failed')
    } finally {
      setSimLoading(false)
    }
  }

  return (
    <LldPage
      module="payment"
      title="Payment Gateway"
      icon="💳"
      tabs={[
        { id: 'charge', label: '💳 Charge' },
        { id: 'payments', label: '🧾 Payments' },
        { id: 'sim', label: '🕹️ Concurrency Sim' },
        { id: 'diagram', label: 'Class Diagram' },
        { id: 'sequence', label: 'Sequence Diagram' },
        { id: 'design', label: 'Design Details' },
      ]}
    >
      {(activeTab) => (
        <div>
          <p style={{ margin: '-8px 0 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Strategy Pattern (Payment Methods) • Chain of Responsibility (Fraud Pipeline) • State Machine (Payment Lifecycle) • Idempotent Charge Submission
          </p>

          {message && (
            <div style={{
              padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontWeight: '600',
              background: message.type === 'error' ? 'var(--danger-bg)' : 'var(--success-bg)',
              color: message.type === 'error' ? 'var(--danger)' : 'var(--success)',
              border: `1px solid ${message.type === 'error' ? 'var(--danger)' : 'var(--success)'}`
            }}>
              {message.text}
            </div>
          )}

          {activeTab === 'charge' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>New Charge</h3>

                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Payer ID</label>
                <input value={payerId} onChange={(e) => setPayerId(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', marginBottom: '12px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }} />

                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Amount (₹)</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', marginBottom: '12px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }} />

                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Payment Method (Strategy Pattern)</label>
                <select value={method} onChange={(e) => setMethod(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', marginBottom: '20px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}>
                  {METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
                </select>

                <button onClick={handleCharge}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: '700', cursor: 'pointer' }}>
                  Charge 💳
                </button>
                <p style={{ margin: '10px 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Amounts over ₹{(500000).toLocaleString('en-IN')} trip the fraud chain's amount-limit check.
                </p>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-primary)', height: 'fit-content' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>Last Result</h3>
                {!lastPayment ? (
                  <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Submit a charge to see its result here.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                    <div>Payment ID: <strong>{lastPayment.id}</strong></div>
                    <div>Transaction ID: <strong>{lastPayment.transactionId || '—'}</strong></div>
                    <div>Status: <StatusBadge status={lastPayment.status} /></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {payments.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: '40px 0' }}>
                  No charges yet this session — submit one from the Charge tab.
                </p>
              ) : payments.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-primary)', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h4 style={{ margin: 0 }}>{p.id} — {p.payerId}</h4>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>₹{p.amount.toLocaleString('en-IN')} via {p.method} | Tx: {p.transactionId || '—'}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <StatusBadge status={p.status} />
                    {p.status === 'CAPTURED' && (
                      <button onClick={() => handleRefund(p.id)}
                        style={{ padding: '6px 14px', background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                        Refund
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'sim' && (
            <PaymentSimulationTab
              simSnapshot={simSnapshot}
              simStep={simStep}
              simLoading={simLoading}
              simError={simError}
              simSteps={SIM_STEPS}
              onRunStep={runSimStep}
            />
          )}
        </div>
      )}
    </LldPage>
  )
}

function StatusBadge({ status }) {
  const tone = STATUS_TONE[status] || STATUS_TONE.INITIATED
  return (
    <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', background: tone.bg, color: tone.color }}>
      {status}
    </span>
  )
}

function PaymentSimulationTab({ simSnapshot, simStep, simLoading, simError, simSteps, onRunStep }) {
  const payments = simSnapshot?.payments || []
  const events = simSnapshot?.events || []
  const raceResult = simSnapshot?.raceResult
  const isDone = simStep >= simSteps.length
  const currentStepMeta = simSteps[Math.min(simStep, simSteps.length - 1)]

  return (
    <div>
      <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-primary)', marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '20px' }}>🕹️ Interactive Idempotency & Fraud-Chain Walkthrough</h2>
        <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', fontSize: '13px' }}>
          A clean charge, a velocity-check rejection, a duplicate-submission demo, a refund, and a
          live 6-way double-submit race — every step below calls the real
          <code> /api/payment/sim/*</code> sandbox endpoints, a completely separate ledger from the
          live tabs.
        </p>

        <StepIndicator steps={simSteps.map(s => s.title)} currentStep={Math.min(simStep, simSteps.length - 1)} />

        <div style={{
          marginTop: '20px', padding: '16px 20px', borderRadius: '10px',
          background: 'var(--bg-primary)', border: '1px solid var(--border-primary)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap'
        }}>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {isDone ? 'Walkthrough Complete' : `Step ${simStep + 1} of ${simSteps.length}`}
            </div>
            <h4 style={{ margin: '4px 0' }}>{isDone ? 'All steps executed' : currentStepMeta.title}</h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              {isDone ? 'Reset the sandbox to run the walkthrough again.' : currentStepMeta.detail}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => onRunStep(true)}
              disabled={simLoading}
              style={{
                padding: '12px 20px', borderRadius: '8px', border: '1px solid var(--border-primary)', fontWeight: '700',
                cursor: simLoading ? 'default' : 'pointer', background: 'var(--bg-secondary)', color: 'var(--text-primary)', whiteSpace: 'nowrap'
              }}
            >
              ⟲ Reset Sandbox
            </button>
            <button
              onClick={() => onRunStep()}
              disabled={simLoading || (isDone && simSnapshot)}
              style={{
                padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: '700', cursor: simLoading ? 'default' : 'pointer',
                background: isDone ? 'var(--border-primary)' : 'var(--accent)', color: isDone ? 'var(--text-secondary)' : '#fff', whiteSpace: 'nowrap'
              }}
            >
              {simLoading ? 'Running…' : isDone ? '✓ Done' : simStep === 0 ? '▶ Start Walkthrough' : `Next: ${currentStepMeta.title} →`}
            </button>
          </div>
        </div>

        {simError && (
          <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)', fontSize: '13px', fontWeight: '600' }}>
            ⚠ {simError}
          </div>
        )}
      </div>

      {!simSnapshot && (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '20px 0' }}>
          Click "▶ Start Walkthrough" above to reset the sandbox and begin.
        </p>
      )}

      {simSnapshot && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <HudTile label="Payments" value={payments.length} tone="neutral" />
            <HudTile label="Race Attempts" value={raceResult ? raceResult.attempts : '—'} tone="neutral" />
            <HudTile label="Distinct Payments Created" value={raceResult ? raceResult.distinctPaymentsCreated : '—'} tone="ok" />
            <HudTile label="Distinct Transaction IDs" value={raceResult ? raceResult.distinctTransactionIds : '—'} tone="ok" />
            <HudTile label="Events Logged" value={events.length} tone="neutral" />
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-primary)', marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 14px', fontSize: '15px' }}>🧾 Sandbox Payment Ledger</h4>
            {payments.length === 0 ? (
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No payments yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {payments.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-primary)', fontSize: '13px' }}>
                    <span><strong>{p.id}</strong> — {p.payerId} — ₹{p.amount.toLocaleString('en-IN')} ({p.method})</span>
                    <StatusBadge status={p.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '15px' }}>📜 Sandbox Event Log</h4>
            <div style={{ maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column-reverse', gap: '6px' }}>
              {events.map(ev => {
                const isFailure = ev.type.includes('REJECTED')
                const isRace = ev.type === 'RACE_COMPLETE'
                return (
                  <div key={ev.id} style={{
                    fontSize: '12px', fontFamily: 'monospace', padding: '8px 12px', borderRadius: '6px',
                    background: 'var(--bg-primary)',
                    borderLeft: `3px solid ${isFailure ? 'var(--danger)' : isRace ? 'var(--info)' : 'var(--success)'}`
                  }}>
                    <span style={{ color: 'var(--text-secondary)' }}>[{ev.timestamp}]</span> <strong>{ev.actor}:</strong> {ev.description}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function HudTile({ label, value, tone }) {
  const color = tone === 'danger' ? 'var(--danger)' : tone === 'ok' ? 'var(--success)' : 'var(--accent)'
  return (
    <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-primary)', textAlign: 'center' }}>
      <div style={{ fontSize: '20px', fontWeight: '800', color }}>{value}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{label}</div>
    </div>
  )
}
