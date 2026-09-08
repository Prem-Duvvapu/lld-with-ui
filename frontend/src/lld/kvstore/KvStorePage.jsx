import { useState } from 'react'
import * as api from './api'
import LldPage from '../../components/LldPage'
import StepIndicator from '../../components/ui/StepIndicator'

export default function KvStorePage() {
  const [message, setMessage] = useState(null)

  const [setKey, setSetKey] = useState('welcome')
  const [setValue, setSetValue] = useState('')
  const [setTtl, setSetTtl] = useState('')
  const [getKey, setGetKey] = useState('welcome')
  const [lastGetResult, setLastGetResult] = useState(null)
  const [history, setHistory] = useState([])

  const [casKey, setCasKey] = useState('welcome')
  const [casExpectedVersion, setCasExpectedVersion] = useState(1)
  const [casNewValue, setCasNewValue] = useState('')
  const [casResult, setCasResult] = useState(null)

  const [simSnapshot, setSimSnapshot] = useState(null)
  const [simStep, setSimStep] = useState(0)
  const [simLoading, setSimLoading] = useState(false)
  const [simError, setSimError] = useState('')

  const showBanner = (text, type) => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4000)
  }

  const handleSet = async () => {
    try {
      const entry = await api.set(setKey, setValue, setTtl ? Number(setTtl) : undefined)
      setHistory(h => [{ key: setKey, value: setValue, version: entry.version }, ...h].slice(0, 10))
      showBanner(`SET "${setKey}" -> version ${entry.version}`, 'success')
    } catch (err) {
      showBanner(err.message || 'Failed to SET', 'error')
    }
  }

  const handleGet = async () => {
    try {
      const entry = await api.get(getKey)
      setLastGetResult({ key: getKey, ...entry, hit: true })
      showBanner(`GET "${getKey}" -> "${entry.value}" (v${entry.version})`, 'success')
    } catch (err) {
      setLastGetResult({ key: getKey, hit: false })
      showBanner(err.message || `No entry for "${getKey}"`, 'error')
    }
  }

  const handleDelete = async (key) => {
    try {
      await api.del(key)
      showBanner(`Deleted "${key}"`, 'success')
    } catch (err) {
      showBanner(err.message || 'Failed to delete', 'error')
    }
  }

  const handleCas = async () => {
    try {
      const entry = await api.cas(casKey, Number(casExpectedVersion), casNewValue)
      setCasResult({ success: true, entry })
      showBanner(`CAS succeeded -> version ${entry.version}`, 'success')
    } catch (err) {
      setCasResult({ success: false, message: err.message })
      showBanner(err.message || 'CAS failed', 'error')
    }
  }

  // SIMULATION -- a 6-step walkthrough against the isolated /api/kvstore/sim/* sandbox: reset,
  // a clean set/get, a WAL-replay durability demo, a real TTL expiry wait, a live 8-worker CAS
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
      detail: 'A straightforward SET followed by a GET, so there is something in the WAL before the durability demo.',
      run: async () => {
        await api.simSet('demo-key', 'demo-value')
        const snap = await api.simGet('demo-key')
        setSimSnapshot(snap)
      },
    },
    {
      title: 'WAL Replay: Durability Proof',
      detail: 'Wipes the live sandbox state, then rebuilds it purely by replaying every logged Command — proving the WAL alone is enough to reconstruct identical state.',
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
            Command (Write-Ahead Log) • Template Method (Read Path) • Lock-Free Compare-and-Swap
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

          {activeTab === 'store' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>SET</h3>
                <input value={setKey} onChange={(e) => setSetKey(e.target.value)} placeholder="key"
                  style={{ width: '100%', padding: '8px 10px', marginBottom: '8px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }} />
                <input value={setValue} onChange={(e) => setSetValue(e.target.value)} placeholder="value"
                  style={{ width: '100%', padding: '8px 10px', marginBottom: '8px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }} />
                <input type="number" min={0} value={setTtl} onChange={(e) => setSetTtl(e.target.value)} placeholder="ttlSeconds (optional)"
                  style={{ width: '100%', padding: '8px 10px', marginBottom: '12px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }} />
                <button onClick={handleSet}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: '700', cursor: 'pointer' }}>
                  SET
                </button>

                {history.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <h4 style={{ margin: '0 0 8px', fontSize: '13px' }}>Recent Writes (this session)</h4>
                    {history.map((h, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-secondary)', padding: '4px 0' }}>
                        <span>{h.key} = {h.value} (v{h.version})</span>
                        <button onClick={() => handleDelete(h.key)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '11px' }}>delete</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>GET</h3>
                <input value={getKey} onChange={(e) => setGetKey(e.target.value)} placeholder="key"
                  style={{ width: '100%', padding: '8px 10px', marginBottom: '12px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }} />
                <button onClick={handleGet}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: '700', cursor: 'pointer' }}>
                  GET
                </button>
                {lastGetResult && (
                  <p style={{ marginTop: '12px', fontSize: '13px', color: lastGetResult.hit ? 'var(--success)' : 'var(--danger)' }}>
                    {lastGetResult.hit
                      ? `"${lastGetResult.key}" -> "${lastGetResult.value}" (version ${lastGetResult.version})`
                      : `"${lastGetResult.key}" — miss (404)`}
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'cas' && (
            <div style={{ maxWidth: '480px', margin: '0 auto', background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>Compare-and-Swap</h3>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Key</label>
              <input value={casKey} onChange={(e) => setCasKey(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', marginBottom: '12px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }} />

              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Expected Version</label>
              <input type="number" min={1} value={casExpectedVersion} onChange={(e) => setCasExpectedVersion(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', marginBottom: '12px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }} />

              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>New Value</label>
              <input value={casNewValue} onChange={(e) => setCasNewValue(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', marginBottom: '16px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }} />

              <button onClick={handleCas}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: '700', cursor: 'pointer' }}>
                Attempt CAS
              </button>

              {casResult && (
                <div style={{
                  marginTop: '16px', padding: '12px', borderRadius: '8px', textAlign: 'center', fontWeight: '700',
                  background: casResult.success ? 'var(--success-bg)' : 'var(--danger-bg)',
                  color: casResult.success ? 'var(--success)' : 'var(--danger)'
                }}>
                  {casResult.success
                    ? `Succeeded — now at version ${casResult.entry.version}`
                    : `Failed — ${casResult.message}`}
                </div>
              )}
            </div>
          )}

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
          Write a few keys, replay the WAL to prove durability, watch a TTL expire, then race 8
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
