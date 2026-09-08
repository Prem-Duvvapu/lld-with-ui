import { useState, useEffect } from 'react'
import * as api from './api'
import LldPage from '../../components/LldPage'
import StepIndicator from '../../components/ui/StepIndicator'
import { usePolling } from '../../hooks/usePolling'

const POLICIES = [
  { value: 'ALLOW_ALL', label: 'Allow All' },
  { value: 'RESPECT_ROBOTS_TXT', label: 'Respect robots.txt' },
  { value: 'DOMAIN_ALLOWLIST', label: 'Domain Allowlist' },
]

const STATUS_TONE = {
  PENDING: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  RUNNING: { bg: 'var(--info-bg)', color: 'var(--info)' },
  COMPLETED: { bg: 'var(--success-bg)', color: 'var(--success)' },
}

export default function WebCrawlerPage() {
  const [jobs, setJobs] = useState([])
  const [selectedJobId, setSelectedJobId] = useState('')
  const [pages, setPages] = useState([])
  const [message, setMessage] = useState(null)

  const [seedUrlsInput, setSeedUrlsInput] = useState('http://news.example.com\nhttp://blog.example.com')
  const [maxPages, setMaxPages] = useState(5)
  const [filterPolicy, setFilterPolicy] = useState('ALLOW_ALL')

  const [simSnapshot, setSimSnapshot] = useState(null)
  const [simStep, setSimStep] = useState(0)
  const [simLoading, setSimLoading] = useState(false)
  const [simError, setSimError] = useState('')
  const [simJobId, setSimJobId] = useState(null)

  useEffect(() => {
    api.getAllJobs().then(setJobs).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedJobId) {
      api.getPages(selectedJobId).then(setPages).catch(() => {})
    }
  }, [selectedJobId])

  // Poll the job list so a crawl kicked off from another tab/session shows up without a manual refresh.
  usePolling(() => {
    api.getAllJobs().then(setJobs).catch(() => {})
  }, 6000, [])

  const showBanner = (text, type) => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4000)
  }

  const handleStartCrawl = async () => {
    const seedUrls = seedUrlsInput.split('\n').map(s => s.trim()).filter(Boolean)
    try {
      const job = await api.startCrawl(seedUrls, Number(maxPages), filterPolicy)
      showBanner(`Crawl ${job.id} completed — ${job.pagesFetched} page(s) fetched`, 'success')
      const all = await api.getAllJobs()
      setJobs(all)
      setSelectedJobId(job.id)
    } catch (err) {
      showBanner(err.message || 'Failed to start crawl', 'error')
    }
  }

  // SIMULATION -- a 5-step walkthrough against the isolated /api/webcrawler/sim/* sandbox:
  // reset, seed a job with a duplicate URL and two same-domain siblings (so the very first wave
  // has to resolve both the dedup race and the politeness race), dispatch waves until the job
  // completes, a standalone live dedup-race demo, then a final telemetry review.
  const SIM_STEPS = [
    {
      title: 'Reset Sandbox',
      detail: 'Wipe the isolated sim sandbox — no jobs, no pages, no events. Completely separate from the live crawls in the other tabs.',
      run: async () => {
        const snap = await api.simReset()
        setSimSnapshot(snap)
        setSimJobId(null)
      },
    },
    {
      title: 'Seed a Racy Crawl Job',
      detail: 'Seed http://a.com/p twice (a pure dedup race) plus http://b.com/p1 and http://b.com/p2 (two different URLs on the same domain — a pure politeness race), maxPages=2.',
      run: async () => {
        const snap = await api.simSeed(
          ['http://a.com/p', 'http://a.com/p', 'http://b.com/p1', 'http://b.com/p2'],
          2,
          'ALLOW_ALL',
        )
        setSimSnapshot(snap)
        setSimJobId(snap.jobId)
      },
    },
    {
      title: 'Dispatch Waves Until Complete',
      detail: 'Every URL in the frontier is submitted to the worker pool at once. The duplicate URL loses the dedup race immediately; the two same-domain URLs race for the domain lock — only one wins the politeness window.',
      run: async () => {
        let snap = simSnapshot
        let job = null
        for (let i = 0; i < 5; i++) {
          snap = await api.simDispatchWave(simJobId)
          job = (snap.jobs || []).find(j => j.id === simJobId)
          setSimSnapshot(snap)
          if (!job || job.status === 'COMPLETED') break
        }
      },
    },
    {
      title: 'Live Dedup Race: 6 Workers, 1 URL',
      detail: 'Six workers race to claim the exact same URL via the real /sim/race endpoint. The atomic ConcurrentHashMap.putIfAbsent claim guarantees exactly one winner — the other five see DEDUPED, never a double fetch.',
      run: async () => {
        const snap = await api.simRace('http://race.example.com/target', 6)
        setSimSnapshot(snap)
      },
    },
    {
      title: 'Review Telemetry & Event Log',
      detail: 'Walkthrough complete — inspect the final jobs, pages and full event log below.',
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
      module="webcrawler"
      title="Web Crawler"
      icon="🕷️"
      tabs={[
        { id: 'crawl', label: '🚀 Start Crawl' },
        { id: 'pages', label: '📄 Fetched Pages' },
        { id: 'sim', label: '🕹️ Concurrency Sim' },
        { id: 'diagram', label: 'Class Diagram' },
        { id: 'sequence', label: 'Sequence Diagram' },
        { id: 'design', label: 'Design Details' },
      ]}
    >
      {(activeTab) => (
        <div>
          <p style={{ margin: '-8px 0 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Producer-Consumer (Frontier Queue + Worker Pool) • Strategy (URL Filter Policy) • Atomic Dedup Claim • Per-Domain Politeness Lock
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

          {activeTab === 'crawl' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>New Crawl Job</h3>

                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Seed URLs (one per line)</label>
                <textarea value={seedUrlsInput} onChange={(e) => setSeedUrlsInput(e.target.value)} rows={4}
                  style={{ width: '100%', padding: '8px 10px', marginBottom: '12px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', fontFamily: 'monospace', fontSize: '13px' }} />

                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Max Pages</label>
                <input type="number" min={1} value={maxPages} onChange={(e) => setMaxPages(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', marginBottom: '12px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }} />

                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>URL Filter Policy (Strategy Pattern)</label>
                <select value={filterPolicy} onChange={(e) => setFilterPolicy(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', marginBottom: '20px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}>
                  {POLICIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>

                <button onClick={handleStartCrawl}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: '700', cursor: 'pointer' }}>
                  Start Crawl 🕷️
                </button>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>Crawl Jobs</h3>
                {jobs.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No crawl jobs yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
                    {jobs.slice().reverse().map(j => {
                      const tone = STATUS_TONE[j.status] || STATUS_TONE.PENDING
                      return (
                        <button key={j.id} onClick={() => setSelectedJobId(j.id)}
                          style={{
                            textAlign: 'left', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                            background: selectedJobId === j.id ? 'var(--info-bg)' : 'var(--bg-primary)',
                            border: `1px solid ${selectedJobId === j.id ? 'var(--accent)' : 'var(--border-primary)'}`,
                          }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: '13px' }}>{j.id}</strong>
                            <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', background: tone.bg, color: tone.color }}>{j.status}</span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {j.pagesFetched} / {j.maxPages} pages fetched
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'pages' && (
            <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>
                Fetched Pages {selectedJobId ? `— ${selectedJobId}` : ''}
              </h3>
              {!selectedJobId ? (
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Select a job in the Start Crawl tab to view its pages.</p>
              ) : pages.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No pages fetched yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pages.map(p => (
                    <div key={p.url} style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: '13px' }}>{p.url}</strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{p.domain}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{p.links.length} link(s) discovered</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'sim' && (
            <WebCrawlerSimulationTab
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

function WebCrawlerSimulationTab({ simSnapshot, simStep, simLoading, simError, simSteps, onRunStep }) {
  const jobs = simSnapshot?.jobs || []
  const pages = simSnapshot?.pages || []
  const events = simSnapshot?.events || []
  const raceResult = simSnapshot?.raceResult
  const isDone = simStep >= simSteps.length
  const currentStepMeta = simSteps[Math.min(simStep, simSteps.length - 1)]

  return (
    <div>
      <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-primary)', marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '20px' }}>🕹️ Interactive Crawl Concurrency Walkthrough</h2>
        <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', fontSize: '13px' }}>
          Seed a job with a duplicate URL and two same-domain siblings, dispatch waves until it
          completes, then watch a standalone dedup race. Every step below calls the real
          <code> /api/webcrawler/sim/*</code> sandbox endpoints — completely separate from the
          live crawls in the other tabs.
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
            <HudTile label="Jobs" value={jobs.length} tone="neutral" />
            <HudTile label="Pages Fetched" value={pages.length} tone="neutral" />
            <HudTile label="Race Fetched" value={raceResult ? raceResult.fetched : '—'} tone="ok" />
            <HudTile label="Race Deduped" value={raceResult ? raceResult.deduped : '—'} tone="danger" />
            <HudTile label="Events Logged" value={events.length} tone="neutral" />
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-primary)', marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 14px', fontSize: '15px' }}>📄 Sandbox Pages</h4>
            {pages.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>No pages fetched yet.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                {pages.map(p => (
                  <div key={p.url} style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700' }}>{p.url}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>{p.domain}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '15px' }}>📜 Sandbox Event Log</h4>
            <div style={{ maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column-reverse', gap: '6px' }}>
              {events.map(ev => {
                const isFailure = ev.type === 'DEDUPED' || ev.type === 'CLAIM_LOST' || ev.type === 'POLITENESS_DEFERRED'
                const isSummary = ev.type === 'RACE_COMPLETE' || ev.type === 'JOB_COMPLETE'
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
