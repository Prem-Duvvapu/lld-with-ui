import { useState } from 'react'
import * as api from './api'
import LldPage from '../../components/LldPage'
import StepIndicator from '../../components/ui/StepIndicator'

const DISCOUNT_TYPES = ['PERCENTAGE_OFF', 'FLAT_OFF', 'BOGO']

export default function CouponPage() {
  const [message, setMessage] = useState(null)

  const [newCode, setNewCode] = useState('SAVE15')
  const [newType, setNewType] = useState('PERCENTAGE_OFF')
  const [newValue, setNewValue] = useState(15)
  const [newMinCart, setNewMinCart] = useState(0)
  const [newCategory, setNewCategory] = useState('')
  const [newFirstOrderOnly, setNewFirstOrderOnly] = useState(false)
  const [newMaxRedemptions, setNewMaxRedemptions] = useState(100)
  const [createdCoupons, setCreatedCoupons] = useState([])

  const [applyCode, setApplyCode] = useState('WELCOME10')
  const [cartTotal, setCartTotal] = useState(100)
  const [itemCount, setItemCount] = useState(2)
  const [category, setCategory] = useState('')
  const [isFirstOrder, setIsFirstOrder] = useState(false)
  const [applyResult, setApplyResult] = useState(null)

  const [simSnapshot, setSimSnapshot] = useState(null)
  const [simStep, setSimStep] = useState(0)
  const [simLoading, setSimLoading] = useState(false)
  const [simError, setSimError] = useState('')

  const showBanner = (text, type) => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4000)
  }

  const handleCreate = async () => {
    try {
      const coupon = await api.createCoupon({
        code: newCode,
        discountType: newType,
        discountValue: Number(newValue),
        minCartValue: Number(newMinCart),
        requiredCategory: newCategory || null,
        firstOrderOnly: newFirstOrderOnly,
        maxRedemptions: Number(newMaxRedemptions),
      })
      setCreatedCoupons(c => [coupon, ...c].slice(0, 10))
      showBanner(`Created coupon "${coupon.code}"`, 'success')
    } catch (err) {
      showBanner(err.message || 'Failed to create coupon', 'error')
    }
  }

  const handleApply = async () => {
    try {
      const result = await api.apply(applyCode, Number(cartTotal), Number(itemCount), category || null, isFirstOrder)
      setApplyResult({ success: true, ...result })
      showBanner(`Applied — ${result.originalTotal.toFixed(2)} -> ${result.discountedTotal.toFixed(2)}`, 'success')
    } catch (err) {
      setApplyResult({ success: false, message: err.message })
      showBanner(err.message || 'Failed to apply coupon', 'error')
    }
  }

  // SIMULATION -- a 5-step walkthrough against the isolated /api/coupon/sim/* sandbox: reset
  // (seeds SIM10, SIM-SCARCE with 3 redemptions, and SIM-VIP with eligibility conditions), a
  // successful apply, a rejected apply (an eligibility condition fails), a live 8-worker
  // redemption race against the scarce coupon, and a final review.
  const SIM_STEPS = [
    {
      title: 'Reset Sandbox',
      detail: 'Wipe the isolated sim sandbox and reseed 3 demo coupons: SIM10 (10% off, no restrictions), SIM-SCARCE (flat $5 off, only 3 redemptions left), and SIM-VIP (20% off, $200 minimum, electronics only, first-order only).',
      run: async () => {
        const snap = await api.simReset()
        setSimSnapshot(snap)
      },
    },
    {
      title: 'Successful Apply',
      detail: 'Apply SIM10 to an eligible $100 cart — no conditions to fail, straightforward 10% off.',
      run: async () => {
        const snap = await api.simApply('SIM10', 100, 1, null, false)
        setSimSnapshot(snap)
      },
    },
    {
      title: 'Rejected Apply: Ineligible Cart',
      detail: 'Apply SIM-VIP to a $50 cart in the wrong category, on a non-first order — the Chain of Responsibility rejects on the FIRST failing condition (minimum cart value), not the others.',
      run: async () => {
        const snap = await api.simApply('SIM-VIP', 50, 1, 'groceries', false)
        setSimSnapshot(snap)
      },
    },
    {
      title: '8 Workers Race the Scarce Coupon',
      detail: 'SIM-SCARCE has exactly 3 redemptions left. Eight workers race to apply it simultaneously — the per-coupon lock guarantees exactly 3 succeed, never more.',
      run: async () => {
        const snap = await api.simRace('SIM-SCARCE', 8)
        setSimSnapshot(snap)
      },
    },
    {
      title: 'Review Telemetry & Event Log',
      detail: 'Walkthrough complete — inspect the final coupons, their redemption counts, and the full event log below.',
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
      module="coupon"
      title="Coupon / Promotion Engine"
      icon="🏷️"
      tabs={[
        { id: 'coupons', label: '🏷️ Create Coupon' },
        { id: 'apply', label: '🧾 Apply' },
        { id: 'sim', label: '🕹️ Concurrency Sim' },
        { id: 'diagram', label: 'Class Diagram' },
        { id: 'sequence', label: 'Sequence Diagram' },
        { id: 'design', label: 'Design Details' },
      ]}
    >
      {(activeTab) => (
        <div>
          <p style={{ margin: '-8px 0 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Strategy (Percentage/Flat/BOGO Discount) • Chain of Responsibility (Eligibility) • Per-Coupon Redemption-Limit Lock
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

          {activeTab === 'coupons' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>New Coupon</h3>
                <input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="code"
                  style={{ width: '100%', padding: '8px 10px', marginBottom: '8px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }} />

                <select value={newType} onChange={(e) => setNewType(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', marginBottom: '8px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}>
                  {DISCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                <input type="number" value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="discountValue (% or flat $, ignored for BOGO)"
                  style={{ width: '100%', padding: '8px 10px', marginBottom: '8px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }} />

                <input type="number" value={newMinCart} onChange={(e) => setNewMinCart(e.target.value)} placeholder="minCartValue"
                  style={{ width: '100%', padding: '8px 10px', marginBottom: '8px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }} />

                <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="requiredCategory (optional)"
                  style={{ width: '100%', padding: '8px 10px', marginBottom: '8px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }} />

                <input type="number" min={1} value={newMaxRedemptions} onChange={(e) => setNewMaxRedemptions(e.target.value)} placeholder="maxRedemptions"
                  style={{ width: '100%', padding: '8px 10px', marginBottom: '8px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }} />

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>
                  <input type="checkbox" checked={newFirstOrderOnly} onChange={(e) => setNewFirstOrderOnly(e.target.checked)} />
                  First order only
                </label>

                <button onClick={handleCreate}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: '700', cursor: 'pointer' }}>
                  Create Coupon 🏷️
                </button>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>Recently Created (this session)</h3>
                {createdCoupons.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No coupons created yet — try WELCOME10, FLAT20, BOGO-SHOES or VIP-ELECTRONICS, seeded on startup.</p>
                ) : (
                  createdCoupons.map(c => (
                    <div key={c.code} style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', marginBottom: '8px' }}>
                      <strong>{c.code}</strong> — {c.discountType} {c.discountValue} · {c.currentRedemptions}/{c.maxRedemptions} redeemed
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'apply' && (
            <div style={{ maxWidth: '480px', margin: '0 auto', background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>Apply a Coupon</h3>
              <input value={applyCode} onChange={(e) => setApplyCode(e.target.value)} placeholder="coupon code"
                style={{ width: '100%', padding: '8px 10px', marginBottom: '8px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }} />
              <input type="number" value={cartTotal} onChange={(e) => setCartTotal(e.target.value)} placeholder="cartTotal"
                style={{ width: '100%', padding: '8px 10px', marginBottom: '8px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }} />
              <input type="number" min={1} value={itemCount} onChange={(e) => setItemCount(e.target.value)} placeholder="itemCount (for BOGO)"
                style={{ width: '100%', padding: '8px 10px', marginBottom: '8px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }} />
              <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="category (optional)"
                style={{ width: '100%', padding: '8px 10px', marginBottom: '8px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>
                <input type="checkbox" checked={isFirstOrder} onChange={(e) => setIsFirstOrder(e.target.checked)} />
                This is the customer's first order
              </label>

              <button onClick={handleApply}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: '700', cursor: 'pointer' }}>
                Apply Coupon
              </button>

              {applyResult && (
                <div style={{
                  marginTop: '16px', padding: '12px', borderRadius: '8px', textAlign: 'center', fontWeight: '700',
                  background: applyResult.success ? 'var(--success-bg)' : 'var(--danger-bg)',
                  color: applyResult.success ? 'var(--success)' : 'var(--danger)'
                }}>
                  {applyResult.success
                    ? `${applyResult.originalTotal.toFixed(2)} -> ${applyResult.discountedTotal.toFixed(2)} (${applyResult.discountType})`
                    : `Rejected — ${applyResult.message}`}
                </div>
              )}
            </div>
          )}

          {activeTab === 'sim' && (
            <CouponSimulationTab
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

function CouponSimulationTab({ simSnapshot, simStep, simLoading, simError, simSteps, onRunStep }) {
  const coupons = simSnapshot?.coupons || []
  const events = simSnapshot?.events || []
  const raceResult = simSnapshot?.raceResult
  const isDone = simStep >= simSteps.length
  const currentStepMeta = simSteps[Math.min(simStep, simSteps.length - 1)]

  return (
    <div>
      <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-primary)', marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '20px' }}>🕹️ Interactive Redemption Concurrency Walkthrough</h2>
        <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', fontSize: '13px' }}>
          Apply a clean coupon, watch an ineligible cart get rejected, then race 8 workers against
          a coupon with only 3 redemptions left. Every step below calls the real
          <code> /api/coupon/sim/*</code> sandbox endpoints — completely separate from the live
          coupons in the other tabs.
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
            <HudTile label="Coupons" value={coupons.length} tone="neutral" />
            <HudTile label="Race Succeeded" value={raceResult ? raceResult.succeeded : '—'} tone="ok" />
            <HudTile label="Race Rejected" value={raceResult ? raceResult.rejected : '—'} tone="danger" />
            <HudTile label="Events Logged" value={events.length} tone="neutral" />
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-primary)', marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 14px', fontSize: '15px' }}>🏷️ Sandbox Coupons</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {coupons.map(c => (
                <div key={c.code} style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
                  <div style={{ fontWeight: '700', fontSize: '13px' }}>{c.code}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>{c.discountType} · {c.discountValue}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{c.currentRedemptions} / {c.maxRedemptions} redeemed</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '15px' }}>📜 Sandbox Event Log</h4>
            <div style={{ maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column-reverse', gap: '6px' }}>
              {events.map(ev => {
                const isFailure = ev.type === 'REJECTED' || ev.type === 'REDEMPTION_REJECTED'
                const isSummary = ev.type === 'RACE_COMPLETE'
                return (
                  <div key={ev.id} style={{
                    fontSize: '12px', fontFamily: 'monospace', padding: '8px 12px', borderRadius: '6px',
                    background: 'var(--bg-primary)',
                    borderLeft: `3px solid ${isFailure ? 'var(--warning)' : isSummary ? 'var(--info)' : 'var(--success)'}`
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
