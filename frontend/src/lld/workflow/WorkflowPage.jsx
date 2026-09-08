import { useEffect, useState } from 'react'
import * as api from './api'
import LldPage from '../../components/LldPage'
import StepIndicator from '../../components/ui/StepIndicator'

const ESCALATION_STRATEGIES = ['AUTO_ESCALATE', 'NOTIFY_ONLY']
const ROLES = ['MANAGER', 'DIRECTOR', 'FINANCE']

const inputStyle = {
  width: '100%', padding: '8px 10px', marginBottom: '8px', borderRadius: '8px',
  background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)',
}
const cardStyle = { background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-primary)' }

function statusColor(status) {
  switch (status) {
    case 'APPROVED': return 'var(--success)'
    case 'REJECTED': return 'var(--danger)'
    case 'ESCALATED': return 'var(--warning)'
    default: return 'var(--accent)'
  }
}

export default function WorkflowPage() {
  const [message, setMessage] = useState(null)

  const [requester, setRequester] = useState('alice')
  const [amount, setAmount] = useState(1500)
  const [strategyType, setStrategyType] = useState('AUTO_ESCALATE')
  const [workflows, setWorkflows] = useState([])

  const [selectedId, setSelectedId] = useState('')
  const [approverId, setApproverId] = useState('mgr-1')
  const [reason, setReason] = useState('over budget')

  const [simSnapshot, setSimSnapshot] = useState(null)
  const [simStep, setSimStep] = useState(0)
  const [simLoading, setSimLoading] = useState(false)
  const [simError, setSimError] = useState('')
  const [simLargeId, setSimLargeId] = useState(null)

  const showBanner = (text, type) => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4000)
  }

  const refreshWorkflows = async () => {
    try {
      const all = await api.getAllWorkflows()
      setWorkflows(all)
      if (!selectedId && all.length > 0) setSelectedId(all[0].id)
    } catch {
      // best-effort refresh
    }
  }

  useEffect(() => {
    refreshWorkflows()
  }, [])

  const handleSubmit = async () => {
    try {
      const instance = await api.submit(requester, Number(amount), strategyType)
      showBanner(`Submitted ${instance.id} — requires ${instance.steps.map(s => s.role).join(' -> ')}`, 'success')
      await refreshWorkflows()
      setSelectedId(instance.id)
    } catch (err) {
      showBanner(err.message || 'Failed to submit workflow', 'error')
    }
  }

  const selected = workflows.find(w => w.id === selectedId)
  const currentStep = selected && !selected.status.match(/APPROVED|REJECTED/) ? selected.steps[selected.currentStepIndex] : null

  const handleApprove = async () => {
    if (!selected || !currentStep) return
    try {
      const result = await api.approve(selected.id, approverId, currentStep.role)
      showBanner(`${approverId} approved step ${currentStep.role} — now ${result.status}`, 'success')
      await refreshWorkflows()
    } catch (err) {
      showBanner(err.message || 'Approval failed', 'error')
    }
  }

  const handleReject = async () => {
    if (!selected || !currentStep) return
    try {
      const result = await api.reject(selected.id, approverId, currentStep.role, reason)
      showBanner(`${approverId} rejected — now ${result.status}`, 'success')
      await refreshWorkflows()
    } catch (err) {
      showBanner(err.message || 'Rejection failed', 'error')
    }
  }

  const handleEscalate = async () => {
    if (!selected) return
    try {
      const result = await api.escalate(selected.id, selected.currentStepIndex)
      showBanner(`Escalated step ${selected.currentStepIndex} — now ${result.status}`, 'success')
      await refreshWorkflows()
    } catch (err) {
      showBanner(err.message || 'Escalation failed', 'error')
    }
  }

  // SIMULATION -- a 6-step walkthrough against the isolated /api/workflow/sim/* sandbox: reset,
  // submit a small Manager-only expense, submit a large Manager->Director->Finance expense,
  // approve through the large one's first two steps in sequence, a live approve-vs-escalate
  // race on the final step, then a full snapshot review.
  const SIM_STEPS = [
    {
      title: 'Reset Sandbox',
      detail: 'Wipe the isolated sim sandbox back to empty.',
      run: async () => {
        const snap = await api.simReset()
        setSimSnapshot(snap)
        setSimLargeId(null)
      },
    },
    {
      title: 'Submit Small Expense',
      detail: 'A $50 expense from Alice only needs a Manager -- a single-step chain resolved by the threshold Chain of Responsibility.',
      run: async () => {
        const snap = await api.simSubmit('alice', 50, 'AUTO_ESCALATE')
        setSimSnapshot(snap)
      },
    },
    {
      title: 'Submit Large Expense',
      detail: 'A $7,500 expense from Carol needs the full Manager -> Director -> Finance chain.',
      run: async () => {
        const snap = await api.simSubmit('carol', 7500, 'AUTO_ESCALATE')
        const wfs = snap.workflows || []
        const large = wfs.find(w => w.requester === 'carol' && w.steps.length === 3)
        setSimLargeId(large ? large.id : null)
        setSimSnapshot(snap)
      },
    },
    {
      title: "Approve Carol's Manager Step",
      detail: "The Manager approves Carol's expense -- the workflow advances to IN_REVIEW awaiting the Director.",
      run: async () => {
        if (!simLargeId) return
        const snap = await api.simApprove(simLargeId, 'manager-priya', 'MANAGER')
        setSimSnapshot(snap)
      },
    },
    {
      title: 'Live Race: Director Approves vs. Timeout Escalates',
      detail: "A human Director approval and an automatic timeout escalation race on the SAME pending Director step -- the per-instance lock guarantees exactly one wins, never both.",
      run: async () => {
        if (!simLargeId) return
        const snap = await api.simRace(simLargeId, 'director-raj')
        setSimSnapshot(snap)
      },
    },
    {
      title: 'Review Telemetry & Event Log',
      detail: 'Walkthrough complete -- inspect the final workflow instances, their per-step decision history, and the full event log below.',
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
      module="workflow"
      title="Workflow / Approval Engine"
      icon="✅"
      tabs={[
        { id: 'submit', label: '📝 Submit & Track' },
        { id: 'approve', label: '✅ Approve / Reject' },
        { id: 'sim', label: '🕹️ Concurrency Sim' },
        { id: 'diagram', label: 'Class Diagram' },
        { id: 'sequence', label: 'Sequence Diagram' },
        { id: 'design', label: 'Design Details' },
      ]}
    >
      {(activeTab) => (
        <div>
          <p style={{ margin: '-8px 0 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Chain of Responsibility (Threshold Routing) • State Machine (Instance Lifecycle) • Strategy (Escalation Policy) • Per-Instance Approve-vs-Escalate Lock
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

          {activeTab === 'submit' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '24px' }}>
              <div style={cardStyle}>
                <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>Submit Expense</h3>
                <input value={requester} onChange={(e) => setRequester(e.target.value)} placeholder="requester"
                  style={inputStyle} />
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="amount"
                  style={inputStyle} />
                <select value={strategyType} onChange={(e) => setStrategyType(e.target.value)} style={inputStyle}>
                  {ESCALATION_STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                  ≤ $1,000 needs Manager only · &gt; $1,000 adds Director · &gt; $5,000 adds Finance.
                </p>
                <button onClick={handleSubmit}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: '700', cursor: 'pointer' }}>
                  Submit for Approval
                </button>
              </div>

              <div style={cardStyle}>
                <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>Live Workflows</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
                  {workflows.length === 0 && (
                    <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No workflows yet.</p>
                  )}
                  {workflows.map(w => (
                    <div key={w.id} style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>{w.id}</strong>
                        <span style={{ fontWeight: '700', color: statusColor(w.status), fontSize: '12px' }}>{w.status}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {w.requester} · ${w.amount.toFixed(2)} · {w.escalationStrategyType}
                      </div>
                      <div style={{ fontSize: '12px', marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {w.steps.map((s, i) => (
                          <span key={i} style={{
                            padding: '2px 8px', borderRadius: '999px', border: '1px solid var(--border-primary)',
                            background: i === w.currentStepIndex ? 'var(--accent)' : 'var(--bg-secondary)',
                            color: i === w.currentStepIndex ? '#fff' : 'var(--text-secondary)',
                          }}>
                            {s.role}: {s.decision}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'approve' && (
            <div style={{ maxWidth: '520px', margin: '0 auto', ...cardStyle }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>Approve / Reject / Escalate</h3>
              <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} style={inputStyle}>
                <option value="">-- select a workflow --</option>
                {workflows.map(w => <option key={w.id} value={w.id}>{w.id} ({w.requester}, ${w.amount})</option>)}
              </select>

              {selected && (
                <>
                  <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', marginBottom: '12px', fontSize: '13px' }}>
                    Status: <strong style={{ color: statusColor(selected.status) }}>{selected.status}</strong>
                    {currentStep && <> — current step requires <strong>{currentStep.role}</strong></>}
                  </div>

                  <input value={approverId} onChange={(e) => setApproverId(e.target.value)} placeholder="approverId" style={inputStyle} />
                  <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="rejection reason" style={inputStyle} />

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handleApprove} disabled={!currentStep}
                      style={{ flex: 1, padding: '12px', borderRadius: '8px', background: 'var(--success)', color: '#fff', border: 'none', fontWeight: '700', cursor: currentStep ? 'pointer' : 'default', opacity: currentStep ? 1 : 0.5 }}>
                      Approve (as {currentStep ? currentStep.role : '—'})
                    </button>
                    <button onClick={handleReject} disabled={!currentStep}
                      style={{ flex: 1, padding: '12px', borderRadius: '8px', background: 'var(--danger)', color: '#fff', border: 'none', fontWeight: '700', cursor: currentStep ? 'pointer' : 'default', opacity: currentStep ? 1 : 0.5 }}>
                      Reject
                    </button>
                  </div>
                  <button onClick={handleEscalate} disabled={!currentStep}
                    style={{ width: '100%', marginTop: '10px', padding: '12px', borderRadius: '8px', background: 'var(--warning)', color: '#111', border: 'none', fontWeight: '700', cursor: currentStep ? 'pointer' : 'default', opacity: currentStep ? 1 : 0.5 }}>
                    Trigger Timeout Escalation
                  </button>
                </>
              )}
              <button onClick={refreshWorkflows} style={{ width: '100%', marginTop: '16px', padding: '8px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', cursor: 'pointer' }}>
                ⟲ Refresh
              </button>
            </div>
          )}

          {activeTab === 'sim' && (
            <WorkflowSimulationTab
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

function WorkflowSimulationTab({ simSnapshot, simStep, simLoading, simError, simSteps, onRunStep }) {
  const workflowsList = simSnapshot?.workflows || []
  const events = simSnapshot?.events || []
  const raceResult = simSnapshot?.raceResult
  const isDone = simStep >= simSteps.length
  const currentStepMeta = simSteps[Math.min(simStep, simSteps.length - 1)]

  return (
    <div>
      <div style={{ ...cardStyle, marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '20px' }}>🕹️ Interactive Approve-vs-Escalate Concurrency Walkthrough</h2>
        <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', fontSize: '13px' }}>
          Submit a small and a large expense, approve the large one's Manager step, then watch a human
          Director approval race a timeout escalation on the SAME pending step. Every step below calls the
          real <code> /api/workflow/sim/*</code> sandbox endpoints — completely separate from the live
          workflows in the other tabs.
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
            <HudTile label="Workflows" value={workflowsList.length} tone="neutral" />
            <HudTile label="Race: Approve" value={raceResult ? raceResult.approve : '—'} tone="ok" />
            <HudTile label="Race: Escalate" value={raceResult ? raceResult.escalate : '—'} tone="danger" />
            <HudTile label="Events Logged" value={events.length} tone="neutral" />
          </div>

          <div style={{ ...cardStyle, marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 14px', fontSize: '15px' }}>✅ Sandbox Workflows</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {workflowsList.map(w => (
                <div key={w.id} style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '700', fontSize: '13px' }}>{w.id}</span>
                    <span style={{ fontWeight: '700', fontSize: '11px', color: statusColor(w.status) }}>{w.status}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>{w.requester} · ${w.amount}</div>
                  <div style={{ fontSize: '11px', marginTop: '6px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {w.steps.map((s, i) => (
                      <span key={i} style={{ padding: '2px 6px', borderRadius: '999px', border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
                        {s.role}: {s.decision}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={cardStyle}>
            <h4 style={{ margin: '0 0 12px', fontSize: '15px' }}>📜 Sandbox Event Log</h4>
            <div style={{ maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column-reverse', gap: '6px' }}>
              {events.map(ev => {
                const isFailure = ev.type.includes('LOST') || ev.type.includes('REJECTED') || ev.type.includes('FAILED')
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
