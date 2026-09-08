import { useState, useEffect } from 'react'
import * as api from './api'
import LldPage from '../../components/LldPage'
import StepIndicator from '../../components/ui/StepIndicator'
import { usePolling } from '../../hooks/usePolling'

const POLICIES = ['LRU', 'LFU', 'FIFO']

export default function CacheLibraryPage() {
  const [config, setConfig] = useState(null)
  const [stats, setStats] = useState(null)
  const [message, setMessage] = useState(null)

  const [maximumSize, setMaximumSize] = useState(20)
  const [evictionPolicy, setEvictionPolicy] = useState('LRU')
  const [ttlSeconds, setTtlSeconds] = useState(0)
  const [withStats, setWithStats] = useState(true)
  const [shardCount, setShardCount] = useState(4)

  const [putKey, setPutKey] = useState('welcome')
  const [putValue, setPutValue] = useState('')
  const [getKey, setGetKey] = useState('welcome')
  const [lastGetResult, setLastGetResult] = useState(null)
  const [history, setHistory] = useState([])

  const [simSnapshot, setSimSnapshot] = useState(null)
  const [simStep, setSimStep] = useState(0)
  const [simLoading, setSimLoading] = useState(false)
  const [simError, setSimError] = useState('')

  useEffect(() => {
    api.getConfig().then(setConfig).catch(() => {})
    api.getStats().then(setStats).catch(() => {})
  }, [])

  // Poll stats so a put/get from another tab/session shows up without a manual refresh.
  usePolling(() => {
    api.getStats().then(setStats).catch(() => {})
  }, 6000, [])

  const showBanner = (text, type) => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4000)
  }

  const handleConfigure = async () => {
    try {
      const cfg = await api.configure(Number(maximumSize), evictionPolicy, Number(ttlSeconds), withStats, Number(shardCount))
      setConfig(cfg)
      setHistory([])
      const s = await api.getStats()
      setStats(s)
      showBanner('Cache reconfigured — CacheBuilder produced a fresh instance', 'success')
    } catch (err) {
      showBanner(err.message || 'Failed to configure cache', 'error')
    }
  }

  const handlePut = async () => {
    try {
      await api.put(putKey, putValue)
      setHistory(h => [{ key: putKey, value: putValue }, ...h].slice(0, 10))
      showBanner(`Put "${putKey}"`, 'success')
      api.getStats().then(setStats).catch(() => {})
    } catch (err) {
      showBanner(err.message || 'Failed to put', 'error')
    }
  }

  const handleGet = async () => {
    try {
      const res = await api.get(getKey)
      setLastGetResult({ key: getKey, value: res.value, hit: true })
      showBanner(`Hit: "${getKey}" -> "${res.value}"`, 'success')
    } catch (err) {
      setLastGetResult({ key: getKey, hit: false })
      showBanner(err.message || `No cache entry for "${getKey}"`, 'error')
    }
    api.getStats().then(setStats).catch(() => {})
  }

  // SIMULATION -- a 6-step walkthrough against the isolated /api/cachelibrary/sim/* sandbox:
  // reset, fill a maxSize=3 cache past capacity (watch LRU eviction), a TTL expiry demo, a
  // stats-decorator readout, a live 8-worker 4-shard concurrency race, and a final review.
  const SIM_STEPS = [
    {
      title: 'Reset Sandbox',
      detail: 'Wipe the isolated sim sandbox and configure a small demo cache: maxSize=3, LRU, 1 shard, stats on — deliberately scarce so the next step has real eviction to show.',
      run: async () => {
        const snap = await api.simReset()
        setSimSnapshot(snap)
      },
    },
    {
      title: 'Fill Past Capacity',
      detail: 'Put 4 keys into the maxSize=3 cache. The 4th put must evict the least-recently-used key — watch the EVICTION event appear in the log below.',
      run: async () => {
        await api.simPut('k1', 'v1')
        await api.simPut('k2', 'v2')
        await api.simPut('k3', 'v3')
        const snap = await api.simPut('k4', 'v4')
        setSimSnapshot(snap)
      },
    },
    {
      title: 'TTL Expiry Demo',
      detail: 'Reconfigures with a 1-second TTL, puts a key, waits it out server-side, then proves the key is genuinely gone — not just evicted by capacity.',
      run: async () => {
        const snap = await api.simTtlDemo()
        setSimSnapshot(snap)
      },
    },
    {
      title: 'Stats Decorator Readout',
      detail: 'The StatsDecorator wrapping this cache has been counting every hit, miss and eviction all along without the underlying ShardedCache ever knowing stats exist.',
      run: async () => {
        const snap = await api.simGetSnapshot()
        setSimSnapshot(snap)
      },
    },
    {
      title: '8 Workers Race Across 4 Shards',
      detail: 'Reconfigures to 4 shards (capacity 2 each), then 8 workers concurrently put 8 distinct keys. Different shards never block each other — global capacity is still never exceeded.',
      run: async () => {
        const snap = await api.simRace(8)
        setSimSnapshot(snap)
      },
    },
    {
      title: 'Review Telemetry & Event Log',
      detail: 'Walkthrough complete — inspect the final config, size, stats and full event log below.',
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
      module="cachelibrary"
      title="Generic Cache Library"
      icon="🧰"
      tabs={[
        { id: 'configure', label: '⚙️ Configure & Use' },
        { id: 'stats', label: '📊 Stats' },
        { id: 'sim', label: '🕹️ Concurrency Sim' },
        { id: 'diagram', label: 'Class Diagram' },
        { id: 'sequence', label: 'Sequence Diagram' },
        { id: 'design', label: 'Design Details' },
      ]}
    >
      {(activeTab) => (
        <div>
          <p style={{ margin: '-8px 0 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Builder (CacheBuilder) • Strategy (EvictionPolicy: LRU/LFU/FIFO) • Decorator (StatsDecorator) • Sharded-Lock Concurrency
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

          {activeTab === 'configure' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>CacheBuilder Configuration</h3>

                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Maximum Size</label>
                <input type="number" min={1} value={maximumSize} onChange={(e) => setMaximumSize(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', marginBottom: '12px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }} />

                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Eviction Policy (Strategy Pattern)</label>
                <select value={evictionPolicy} onChange={(e) => setEvictionPolicy(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', marginBottom: '12px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}>
                  {POLICIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>TTL Seconds (0 = never expires)</label>
                <input type="number" min={0} value={ttlSeconds} onChange={(e) => setTtlSeconds(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', marginBottom: '12px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }} />

                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Shard Count</label>
                <input type="number" min={1} value={shardCount} onChange={(e) => setShardCount(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', marginBottom: '12px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }} />

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', marginBottom: '20px' }}>
                  <input type="checkbox" checked={withStats} onChange={(e) => setWithStats(e.target.checked)} />
                  withStats() — wrap in StatsDecorator
                </label>

                <button onClick={handleConfigure}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: '700', cursor: 'pointer' }}>
                  Build Cache 🧰
                </button>

                {config && (
                  <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Live: maxSize={config.maximumSize}, policy={config.evictionPolicy}, ttl={config.ttlSeconds}s, shards={config.shardCount}, stats={String(config.withStats)}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>Put</h3>
                  <input value={putKey} onChange={(e) => setPutKey(e.target.value)} placeholder="key"
                    style={{ width: '100%', padding: '8px 10px', marginBottom: '8px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }} />
                  <input value={putValue} onChange={(e) => setPutValue(e.target.value)} placeholder="value"
                    style={{ width: '100%', padding: '8px 10px', marginBottom: '12px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }} />
                  <button onClick={handlePut}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: '700', cursor: 'pointer' }}>
                    Put
                  </button>
                </div>

                <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>Get</h3>
                  <input value={getKey} onChange={(e) => setGetKey(e.target.value)} placeholder="key"
                    style={{ width: '100%', padding: '8px 10px', marginBottom: '12px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }} />
                  <button onClick={handleGet}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: '700', cursor: 'pointer' }}>
                    Get
                  </button>
                  {lastGetResult && (
                    <p style={{ marginTop: '10px', fontSize: '13px', color: lastGetResult.hit ? 'var(--success)' : 'var(--danger)' }}>
                      {lastGetResult.hit ? `"${lastGetResult.key}" -> "${lastGetResult.value}"` : `"${lastGetResult.key}" — miss (404)`}
                    </p>
                  )}
                </div>

                {history.length > 0 && (
                  <div style={{ background: 'var(--bg-secondary)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: '14px' }}>Recent Puts (this session)</h4>
                    {history.map((h, i) => (
                      <div key={i} style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{h.key} = {h.value}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
              <HudTile label="Hits" value={stats ? stats.hits : '—'} tone="ok" />
              <HudTile label="Misses" value={stats ? stats.misses : '—'} tone="danger" />
              <HudTile label="Evictions" value={stats ? stats.evictions : '—'} tone="neutral" />
            </div>
          )}

          {activeTab === 'sim' && (
            <CacheLibrarySimulationTab
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

function CacheLibrarySimulationTab({ simSnapshot, simStep, simLoading, simError, simSteps, onRunStep }) {
  const config = simSnapshot?.config
  const size = simSnapshot?.size
  const stats = simSnapshot?.stats
  const events = simSnapshot?.events || []
  const raceResult = simSnapshot?.raceResult
  const isDone = simStep >= simSteps.length
  const currentStepMeta = simSteps[Math.min(simStep, simSteps.length - 1)]

  return (
    <div>
      <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-primary)', marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '20px' }}>🕹️ Interactive Cache Concurrency Walkthrough</h2>
        <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', fontSize: '13px' }}>
          Fill a small cache past capacity, watch a TTL expire, read the stats decorator, then race
          8 workers across 4 shards. Every step below calls the real
          <code> /api/cachelibrary/sim/*</code> sandbox endpoints — completely separate from the
          live cache in the other tabs.
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
            <HudTile label="Size" value={size ?? '—'} tone="neutral" />
            <HudTile label="Hits" value={stats ? stats.hits : '—'} tone="ok" />
            <HudTile label="Misses" value={stats ? stats.misses : '—'} tone="danger" />
            <HudTile label="Evictions" value={stats ? stats.evictions : '—'} tone="neutral" />
            <HudTile label="Race Final Size" value={raceResult ? raceResult.finalSize : '—'} tone="ok" />
            <HudTile label="Events Logged" value={events.length} tone="neutral" />
          </div>

          {config && (
            <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Config: maxSize={config.maximumSize}, policy={config.evictionPolicy}, ttl={config.ttlSeconds}s, shards={config.shardCount}
            </p>
          )}

          <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '15px' }}>📜 Sandbox Event Log</h4>
            <div style={{ maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column-reverse', gap: '6px' }}>
              {events.map(ev => {
                const isFailure = ev.type === 'MISS' || ev.type === 'EVICTION'
                const isSummary = ev.type === 'RACE_COMPLETE' || ev.type === 'TTL_EXPIRED'
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
