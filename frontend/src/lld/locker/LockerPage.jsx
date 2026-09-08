import { useState, useEffect } from 'react'
import * as api from './api'
import LldPage from '../../components/LldPage'
import StepIndicator from '../../components/ui/StepIndicator'
import { usePolling } from '../../hooks/usePolling'

const SIZES = ['SMALL', 'MEDIUM', 'LARGE']
const POLICIES = [
  { value: 'SMALLEST_FIT', label: 'Smallest Fit First' },
  { value: 'FIRST_FIT', label: 'First Fit' },
]

const STATUS_TONE = {
  EMPTY: { bg: 'var(--success-bg)', color: 'var(--success)' },
  OCCUPIED: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  AWAITING_PICKUP: { bg: 'var(--info-bg)', color: 'var(--info)' },
}

export default function LockerPage() {
  const [banks, setBanks] = useState([])
  const [selectedBank, setSelectedBank] = useState('')
  const [lockers, setLockers] = useState([])
  const [message, setMessage] = useState(null)

  const [depositSize, setDepositSize] = useState('SMALL')
  const [depositPolicy, setDepositPolicy] = useState('SMALLEST_FIT')
  const [courierId, setCourierId] = useState('Courier-Sam')
  const [recipientId, setRecipientId] = useState('Recipient-Jordan')
  const [lastReceipt, setLastReceipt] = useState(null)

  const [pickupCodeInput, setPickupCodeInput] = useState('')
  const [lastPickup, setLastPickup] = useState(null)

  const [simSnapshot, setSimSnapshot] = useState(null)
  const [simStep, setSimStep] = useState(0)
  const [simLoading, setSimLoading] = useState(false)
  const [simError, setSimError] = useState('')
  const [winningCode, setWinningCode] = useState(null)

  useEffect(() => {
    api.getBanks().then((res) => {
      setBanks(res)
      if (res.length > 0) setSelectedBank(res[0].id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedBank) {
      api.getLockersInBank(selectedBank).then(setLockers).catch(() => {})
    }
  }, [selectedBank])

  // Poll the selected bank's lockers so another courier/recipient's deposit or pickup shows up
  // without a manual refresh -- locker status is shared state across everyone browsing this bank.
  usePolling(() => {
    if (selectedBank) {
      api.getLockersInBank(selectedBank).then(setLockers).catch(() => {})
    }
  }, 6000, [selectedBank])

  const showBanner = (text, type) => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4000)
  }

  const refreshLockers = () => {
    if (selectedBank) api.getLockersInBank(selectedBank).then(setLockers).catch(() => {})
  }

  const handleDeposit = async () => {
    try {
      const pkg = await api.deposit(selectedBank, depositSize, courierId, recipientId, depositPolicy)
      setLastReceipt(pkg)
      showBanner(`Deposited into locker ${pkg.assignedLockerId} — pickup code ${pkg.pickupCode}`, 'success')
      refreshLockers()
    } catch (err) {
      showBanner(err.message || 'No locker available for that size', 'error')
    }
  }

  const handlePickup = async () => {
    try {
      const pkg = await api.pickup(pickupCodeInput)
      setLastPickup(pkg)
      showBanner(`Locker ${pkg.assignedLockerId} opened for pickup!`, 'success')
      refreshLockers()
    } catch (err) {
      showBanner(err.message || 'Invalid or already-used pickup code', 'error')
      setLastPickup(null)
    }
  }

  // SIMULATION -- a 7-step, user-driven walkthrough against the isolated /api/locker/sim/*
  // sandbox: reset, view the seeded bank, a 4-courier race for the only SMALL locker, a
  // rejected pickup attempt with a bad code, the real winner picking up, a fresh courier
  // reusing the now-freed locker, and a final telemetry review.
  const SIM_STEPS = [
    {
      title: 'Reset Sandbox',
      detail: 'Wipe and reseed the isolated sim sandbox — one bank with exactly 1 SMALL, 1 MEDIUM and 1 LARGE locker, completely separate from the live banks shown in the other tabs.',
      run: async () => {
        const snap = await api.simReset()
        setSimSnapshot(snap)
        setWinningCode(null)
      },
    },
    {
      title: 'View Seeded Bank',
      detail: 'Exactly one locker of each size — the SMALL locker is deliberately the only one of its kind, which is what makes the next step a genuine race.',
      run: async () => {},
    },
    {
      title: '4 Couriers Race for the Only SMALL Locker',
      detail: 'Four couriers simultaneously try to deposit a SMALL package. The per-locker lock (held across "is this candidate still EMPTY? claim it") means exactly one wins — the other three see NoAvailableLockerException, never a double-claim.',
      run: async () => {
        const snap = await api.simRace(4, 'SMALL', depositPolicy)
        setSimSnapshot(snap)
        const active = (snap.parcels || []).find(p => !p.pickedUpAtEpoch)
        setWinningCode(active ? active.pickupCode : null)
      },
    },
    {
      title: 'Reject: Wrong Pickup Code',
      detail: 'Someone tries to open the locker with a made-up code. InvalidPickupCodeException is raised and handled safely — the locker stays AWAITING_PICKUP, untouched.',
      run: async () => {
        const snap = await api.simPickup('000000')
        setSimSnapshot(snap)
      },
    },
    {
      title: 'Real Recipient Picks Up',
      detail: 'The actual winning code opens the locker and moves it AWAITING_PICKUP → EMPTY, ready for reuse.',
      run: async () => {
        if (!winningCode) return
        const snap = await api.simPickup(winningCode)
        setSimSnapshot(snap)
      },
    },
    {
      title: 'A New Courier Reuses the Freed Locker',
      detail: 'The SMALL locker just went EMPTY → this deposit proves the full EMPTY → OCCUPIED → AWAITING_PICKUP → EMPTY cycle really works, not just the first lap.',
      run: async () => {
        const snap = await api.simDeposit('Courier-Reuse', 'Recipient-Reuse', 'SMALL', depositPolicy)
        setSimSnapshot(snap)
      },
    },
    {
      title: 'Review Telemetry & Event Log',
      detail: 'Walkthrough complete — inspect the final locker states, parcels and full event log below.',
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
      module="locker"
      title="Locker Management (Amazon Locker)"
      icon="🔐"
      tabs={[
        { id: 'lockers', label: '🗄️ Banks & Lockers' },
        { id: 'deposit', label: '📦 Deposit' },
        { id: 'pickup', label: '🔓 Pickup' },
        { id: 'sim', label: '🕹️ Concurrency Sim' },
        { id: 'diagram', label: 'Class Diagram' },
        { id: 'sequence', label: 'Sequence Diagram' },
        { id: 'design', label: 'Design Details' },
      ]}
    >
      {(activeTab) => (
        <div>
          <p style={{ margin: '-8px 0 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Strategy Pattern (Smallest-Fit / First-Fit Allocation) • State Machine (Locker Lifecycle) • Factory (Pickup Codes) • Per-Locker Lock Race Safety
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

          {(activeTab === 'lockers' || activeTab === 'deposit') && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-secondary)',
              padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border-primary)',
              marginBottom: '20px', width: 'fit-content'
            }}>
              <label style={{ fontSize: '13px', fontWeight: '600' }}>Locker Bank:</label>
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '6px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', outline: 'none' }}
              >
                {banks.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.location})</option>
                ))}
              </select>
            </div>
          )}

          {activeTab === 'lockers' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
              {lockers.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No lockers in this bank.</p>
              ) : lockers.map(l => {
                const tone = STATUS_TONE[l.status] || STATUS_TONE.EMPTY
                return (
                  <div key={l.id} style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <strong style={{ fontSize: '15px' }}>{l.id}</strong>
                      <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 8px', borderRadius: '4px', background: 'var(--info-bg)', color: 'var(--accent)' }}>{l.size}</span>
                    </div>
                    <span style={{
                      display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                      background: tone.bg, color: tone.color
                    }}>
                      {l.status}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {activeTab === 'deposit' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>Courier Deposit</h3>

                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Courier ID</label>
                <input value={courierId} onChange={(e) => setCourierId(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', marginBottom: '12px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }} />

                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Recipient ID</label>
                <input value={recipientId} onChange={(e) => setRecipientId(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', marginBottom: '12px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }} />

                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Package Size</label>
                <select value={depositSize} onChange={(e) => setDepositSize(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', marginBottom: '12px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}>
                  {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Allocation Policy (Strategy Pattern)</label>
                <select value={depositPolicy} onChange={(e) => setDepositPolicy(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', marginBottom: '20px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}>
                  {POLICIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>

                <button onClick={handleDeposit} disabled={!selectedBank}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: '700', cursor: 'pointer' }}>
                  Deposit Package 📦
                </button>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-primary)', height: 'fit-content' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>Deposit Receipt</h3>
                {!lastReceipt ? (
                  <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Deposit a package to see its pickup code here.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                    <div>Parcel ID: <strong>{lastReceipt.id}</strong></div>
                    <div>Locker: <strong>{lastReceipt.assignedLockerId}</strong></div>
                    <div>Size: <strong>{lastReceipt.size}</strong></div>
                    <div style={{ marginTop: '8px', padding: '12px', borderRadius: '8px', background: 'var(--info-bg)', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Pickup Code</div>
                      <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--accent)', letterSpacing: '2px' }}>{lastReceipt.pickupCode}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'pickup' && (
            <div style={{ maxWidth: '480px', margin: '0 auto', background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>Recipient Pickup</h3>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>6-Digit Pickup Code</label>
              <input value={pickupCodeInput} onChange={(e) => setPickupCodeInput(e.target.value)} maxLength={6}
                placeholder="e.g. 482913"
                style={{ width: '100%', padding: '10px', marginBottom: '16px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', fontSize: '18px', letterSpacing: '2px', textAlign: 'center' }} />
              <button onClick={handlePickup} disabled={pickupCodeInput.length !== 6}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: pickupCodeInput.length === 6 ? 'var(--accent)' : 'var(--border-primary)', color: pickupCodeInput.length === 6 ? '#fff' : 'var(--text-secondary)', border: 'none', fontWeight: '700', cursor: pickupCodeInput.length === 6 ? 'pointer' : 'not-allowed' }}>
                Open Locker 🔓
              </button>

              {lastPickup && (
                <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', background: 'var(--success-bg)', color: 'var(--success)', textAlign: 'center', fontWeight: '700' }}>
                  Locker {lastPickup.assignedLockerId} opened — enjoy your package!
                </div>
              )}
            </div>
          )}

          {activeTab === 'sim' && (
            <LockerSimulationTab
              simSnapshot={simSnapshot}
              simStep={simStep}
              simLoading={simLoading}
              simError={simError}
              simSteps={SIM_STEPS}
              winningCode={winningCode}
              onRunStep={runSimStep}
            />
          )}
        </div>
      )}
    </LldPage>
  )
}

function LockerSimulationTab({ simSnapshot, simStep, simLoading, simError, simSteps, winningCode, onRunStep }) {
  const lockers = simSnapshot?.lockers || []
  const parcels = simSnapshot?.parcels || []
  const events = simSnapshot?.events || []
  const raceResult = simSnapshot?.raceResult
  const isDone = simStep >= simSteps.length
  const currentStepMeta = simSteps[Math.min(simStep, simSteps.length - 1)]

  return (
    <div>
      <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-primary)', marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '20px' }}>🕹️ Interactive Deposit Concurrency Walkthrough</h2>
        <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', fontSize: '13px' }}>
          Four couriers race for the bank's single SMALL locker, then a rejected pickup attempt,
          the real winner's pickup, and a fresh courier reusing the freed locker. Every step below
          calls the real <code>/api/locker/sim/*</code> sandbox endpoints — a completely separate
          bank from the live tabs.
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
            <HudTile label="Lockers" value={lockers.length} tone="neutral" />
            <HudTile label="Parcels Deposited" value={parcels.length} tone="neutral" />
            <HudTile label="Race Succeeded" value={raceResult ? raceResult.succeeded : '—'} tone="ok" />
            <HudTile label="Race Rejected" value={raceResult ? raceResult.rejected : '—'} tone="danger" />
            <HudTile label="Winning Code" value={winningCode || '—'} tone="neutral" />
            <HudTile label="Events Logged" value={events.length} tone="neutral" />
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-primary)', marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 14px', fontSize: '15px' }}>🗄️ Sandbox Lockers</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
              {lockers.map(l => {
                const tone = STATUS_TONE[l.status] || STATUS_TONE.EMPTY
                return (
                  <div key={l.id} style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <span>{l.id}</span>
                      <span>{l.size}</span>
                    </div>
                    <span style={{
                      display: 'inline-block', marginTop: '6px', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                      background: tone.bg, color: tone.color
                    }}>
                      {l.status}
                    </span>
                  </div>
                )
              })}
            </div>
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
