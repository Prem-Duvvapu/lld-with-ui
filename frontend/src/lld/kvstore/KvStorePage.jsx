import { useState } from 'react'
import * as api from './api'
import LldPage from '../../components/LldPage'
import StepIndicator from '../../components/ui/StepIndicator'
import KvStoreWorkspace from './KvStoreWorkspace'
import { useKvWorkspace } from './useKvWorkspace'

export default function KvStorePage() {
  const workspace = useKvWorkspace()

  const [simSnapshot, setSimSnapshot] = useState(null)
  const [simStep, setSimStep] = useState(0)
  const [simLoading, setSimLoading] = useState(false)
  const [simError, setSimError] = useState('')

  // SIMULATION -- a 6-step walkthrough against the isolated /api/kvstore/sim/* sandbox: reset,
  // a clean set/get, an in-memory WAL replay, a real TTL expiry wait, a live 8-worker CAS
  // race (exactly one winner per version bump), and a final review of the WAL and event log.
  const SIM_STEPS = [
    {
      title: 'Reset Sandbox',
      detail: 'Wipe the isolated sim sandbox — empty store, empty WAL. Completely separate from the live store in the other tabs.',
      run: async () => {
        const snap = await api.simReset()
        setSimSnapshot(snap)
      },
    },
    {
      title: 'Clean SET / GET',
      detail: 'A straightforward SET followed by a GET, so there is something in the in-memory log before replay.',
      run: async () => {
        await api.simSet('demo-key', 'demo-value')
        const snap = await api.simGet('demo-key')
        setSimSnapshot(snap)
      },
    },
    {
      title: 'WAL Replay: In-Memory Reconstruction',
      detail: 'Clears the sandbox map and rebuilds it from the retained in-memory command log. This is not recovery after a process restart; restarting loses the log too.',
      run: async () => {
        const snap = await api.simReplay()
        setSimSnapshot(snap)
      },
    },
    {
      title: 'TTL Expiry Demo',
      detail: 'Sets a key with a 1-second TTL, waits it out server-side, then proves the key is genuinely gone.',
      run: async () => {
        const snap = await api.simTtlDemo()
        setSimSnapshot(snap)
      },
    },
    {
      title: '8 Workers Race a Single CAS',
      detail: 'All 8 workers attempt CAS on the same key with the SAME expected version. The atomic ConcurrentHashMap#compute call guarantees exactly one winner — the rest see a clean VersionConflictException, never a lost update.',
      run: async () => {
        const snap = await api.simCasRace(8)
        setSimSnapshot(snap)
      },
    },
    {
      title: 'Review WAL & Event Log',
      detail: 'Walkthrough complete — inspect the final entries, the full Write-Ahead Log, and the event log below.',
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
      module="kvstore"
      title="Key-Value Store"
      icon="🗃️"
      tabs={[
        { id: 'store', label: '🗃️ Store' },
        { id: 'cas', label: '🔀 CAS' },
        { id: 'sim', label: '🕹️ Concurrency Sim' },
        { id: 'diagram', label: 'Class Diagram' },
        { id: 'sequence', label: 'Sequence Diagram' },
        { id: 'design', label: 'Design Details' },
      ]}
    >
      {(activeTab) => (
        <div>
          <p style={{ margin: '-8px 0 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Command (In-Memory Replay) • Template Method (Read Path) • Per-Key Atomic Compare-and-Swap
          </p>

          {(activeTab === 'store' || activeTab === 'cas') && <KvStoreWorkspace activeTab={activeTab} model={workspace} />}

          {activeTab === 'sim' && (
            <KvStoreSimulationTab
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

function KvStoreSimulationTab({ simSnapshot, simStep, simLoading, simError, simSteps, onRunStep }) {
  const entries = simSnapshot?.entries || {}
  const wal = simSnapshot?.wal || []
  const events = simSnapshot?.events || []
  const raceResult = simSnapshot?.raceResult
  const isDone = simStep >= simSteps.length
  const currentStepMeta = simSteps[Math.min(simStep, simSteps.length - 1)]

  return (
    <div>
      <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-primary)', marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '20px' }}>🕹️ Interactive KV Store Concurrency Walkthrough</h2>
        <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', fontSize: '13px' }}>
          Write a few keys, replay the in-memory WAL, watch a TTL expire, then race 8
          workers on a single CAS. Every step below calls the real
          <code> /api/kvstore/sim/*</code> sandbox endpoints — completely separate from the live
          store in the other tabs.
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
          <div role="alert" style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)', fontSize: '13px', fontWeight: '600' }}>
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
            <HudTile label="Live Entries" value={Object.keys(entries).length} tone="neutral" />
            <HudTile label="WAL Commands" value={simSnapshot.walSize ?? wal.length} tone="neutral" />
            <HudTile label="Race Won" value={raceResult ? raceResult.won : '—'} tone="ok" />
            <HudTile label="Race Lost" value={raceResult ? raceResult.lost : '—'} tone="danger" />
            <HudTile label="Events Logged" value={events.length} tone="neutral" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '15px' }}>🗃️ Sandbox Entries</h4>
              {Object.keys(entries).length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>No entries yet.</p>
              ) : (
                Object.entries(entries).map(([key, entry]) => (
                  <div key={key} style={{ fontSize: '12px', fontFamily: 'monospace', padding: '4px 0', color: 'var(--text-secondary)' }}>
                    {key} = {entry.value} (v{entry.version})
                  </div>
                ))
              )}
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '15px' }}>📝 Write-Ahead Log</h4>
              <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                {wal.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>Empty.</p>
                ) : (
                  wal.map((cmd, i) => (
                    <div key={i} style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-secondary)', padding: '2px 0' }}>
                      {i + 1}. {cmd}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '15px' }}>📜 Sandbox Event Log</h4>
            <div style={{ maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column-reverse', gap: '6px' }}>
              {events.map(ev => {
                const isFailure = ev.type === 'MISS' || ev.type === 'CAS_LOST'
                const isSummary = ev.type === 'RACE_COMPLETE' || ev.type === 'REPLAYED' || ev.type === 'TTL_EXPIRED'
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
