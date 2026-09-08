import { useState, useEffect } from 'react'
import * as api from './api'
import LldPage from '../../components/LldPage'
import StepIndicator from '../../components/ui/StepIndicator'
import { usePolling } from '../../hooks/usePolling'

const STRATEGIES = [
  { value: 'HIT_ON_SOFT_17', label: 'Dealer Hits on Soft 17' },
  { value: 'STAND_ON_SOFT_17', label: 'Dealer Stands on Soft 17' },
]

const SUIT_SYMBOL = { HEARTS: '♥', DIAMONDS: '♦', CLUBS: '♣', SPADES: '♠' }
const RANK_LABEL = { TWO: '2', THREE: '3', FOUR: '4', FIVE: '5', SIX: '6', SEVEN: '7', EIGHT: '8', NINE: '9', TEN: '10', JACK: 'J', QUEEN: 'Q', KING: 'K', ACE: 'A' }

function CardChip({ card }) {
  const isRed = card.suit === 'HEARTS' || card.suit === 'DIAMONDS'
  return (
    <span style={{
      display: 'inline-block', padding: '4px 8px', borderRadius: '6px', margin: '2px',
      background: 'var(--bg-primary)', border: '1px solid var(--border-primary)',
      color: isRed ? 'var(--danger)' : 'var(--text-primary)', fontWeight: '700', fontSize: '13px'
    }}>
      {RANK_LABEL[card.rank]}{SUIT_SYMBOL[card.suit]}
    </span>
  )
}

const STATUS_TONE = {
  BETTING: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  DEALING: { bg: 'var(--info-bg)', color: 'var(--info)' },
  PLAYER_TURN: { bg: 'var(--info-bg)', color: 'var(--info)' },
  DEALER_TURN: { bg: 'var(--info-bg)', color: 'var(--info)' },
  SETTLEMENT: { bg: 'var(--success-bg)', color: 'var(--success)' },
}

export default function BlackjackPage() {
  const [tables, setTables] = useState([])
  const [selectedTableId, setSelectedTableId] = useState('')
  const [dealerStrategyType, setDealerStrategyType] = useState('HIT_ON_SOFT_17')
  const [message, setMessage] = useState(null)

  const [simSnapshot, setSimSnapshot] = useState(null)
  const [simStep, setSimStep] = useState(0)
  const [simLoading, setSimLoading] = useState(false)
  const [simError, setSimError] = useState('')

  const refreshTables = () => api.getAllTables().then(setTables).catch(() => {})

  useEffect(() => {
    refreshTables()
  }, [])

  usePolling(() => refreshTables(), 6000, [])

  const showBanner = (text, type) => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4000)
  }

  const selectedTable = tables.find(t => t.id === selectedTableId)

  const handleCreateTable = async () => {
    try {
      const table = await api.createTable(dealerStrategyType)
      showBanner(`Created ${table.id}`, 'success')
      await refreshTables()
      setSelectedTableId(table.id)
    } catch (err) {
      showBanner(err.message || 'Failed to create table', 'error')
    }
  }

  const runAction = async (fn, verb) => {
    if (!selectedTableId) return
    try {
      await fn(selectedTableId)
      showBanner(`${verb} on ${selectedTableId}`, 'success')
      await refreshTables()
    } catch (err) {
      showBanner(err.message || `Failed to ${verb.toLowerCase()}`, 'error')
    }
  }

  // SIMULATION -- a 6-step walkthrough against the isolated /api/blackjack/sim/* sandbox: reset
  // (fresh single-deck shoe), create a table and deal (may resolve immediately on a natural
  // blackjack), hit or stand depending on the outcome, then a live 15-table race against the
  // same shared shoe -- deliberately enough tables to exhaust a 52-card shoe (15*4=60 > ~48
  // cards remaining), proving no two tables ever receive the same physical card.
  const SIM_STEPS = [
    {
      title: 'Reset Sandbox',
      detail: 'Wipe the isolated sim sandbox and shuffle a fresh single 52-card shoe — deliberately scarce (a live table normally shares a 6-deck, 312-card shoe) so the race step has real exhaustion to show.',
      run: async () => {
        const snap = await api.simReset()
        setSimSnapshot(snap)
      },
    },
    {
      title: 'Create a Table & Deal',
      detail: 'Deals 2 cards each to player and dealer from the shared shoe. A natural blackjack settles immediately; otherwise the table moves to PLAYER_TURN.',
      run: async () => {
        const created = await api.simCreateTable('HIT_ON_SOFT_17')
        const tableId = created.tables[created.tables.length - 1].id
        const snap = await api.simDeal(tableId)
        setSimSnapshot(snap)
      },
    },
    {
      title: 'Hit or Stand',
      detail: 'If the round is still live, the player hits once (risking a bust) and then stands — the dealer plays out via its DealerStrategy.',
      run: async () => {
        const snap0 = await api.simGetSnapshot()
        const table = snap0.tables.find(t => t.status === 'PLAYER_TURN')
        if (table) {
          await api.simHit(table.id)
          const after = await api.simGetSnapshot()
          const stillLive = after.tables.find(t => t.id === table.id)
          if (stillLive.status === 'PLAYER_TURN') {
            const snap = await api.simStand(table.id)
            setSimSnapshot(snap)
            return
          }
          setSimSnapshot(after)
          return
        }
        setSimSnapshot(snap0)
      },
    },
    {
      title: '15 Tables Race the Shared Shoe',
      detail: '15 tables (needing 60 cards) concurrently deal from a shoe with roughly 48 cards left — some tables win, some hit ShoeExhaustedException, and not one physical card is ever dealt to two tables.',
      run: async () => {
        const snap = await api.simRace(15)
        setSimSnapshot(snap)
      },
    },
    {
      title: 'Review Telemetry & Event Log',
      detail: 'Walkthrough complete — inspect every table, the shoe\'s remaining count, and the full event log below.',
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
      module="blackjack"
      title="Blackjack / Deck of Cards"
      icon="🃏"
      tabs={[
        { id: 'tables', label: '🃏 Tables' },
        { id: 'sim', label: '🕹️ Concurrency Sim' },
        { id: 'diagram', label: 'Class Diagram' },
        { id: 'sequence', label: 'Sequence Diagram' },
        { id: 'design', label: 'Design Details' },
      ]}
    >
      {(activeTab) => (
        <div>
          <p style={{ margin: '-8px 0 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Factory (Deck.of shuffles a shared Shoe) • Strategy (Dealer House Rules) • State Machine (Round Lifecycle) • Lock-Free Shared-Shoe Draw
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

          {activeTab === 'tables' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '24px' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>New Table</h3>
                <select value={dealerStrategyType} onChange={(e) => setDealerStrategyType(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', marginBottom: '12px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}>
                  {STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <button onClick={handleCreateTable}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: '700', cursor: 'pointer' }}>
                  Create Table 🃏
                </button>

                <h4 style={{ margin: '20px 0 10px', fontSize: '14px' }}>Live Tables</h4>
                {tables.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No tables yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' }}>
                    {tables.slice().reverse().map(t => {
                      const tone = STATUS_TONE[t.status] || STATUS_TONE.BETTING
                      return (
                        <button key={t.id} onClick={() => setSelectedTableId(t.id)}
                          style={{
                            textAlign: 'left', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
                            background: selectedTableId === t.id ? 'var(--info-bg)' : 'var(--bg-primary)',
                            border: `1px solid ${selectedTableId === t.id ? 'var(--accent)' : 'var(--border-primary)'}`,
                          }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                            <strong>{t.id}</strong>
                            <span style={{ fontWeight: '700', padding: '1px 6px', borderRadius: '20px', background: tone.bg, color: tone.color }}>{t.status}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
                {!selectedTable ? (
                  <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Select or create a table to play.</p>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px' }}>{selectedTable.id}</h3>
                      <span style={{
                        fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px',
                        background: (STATUS_TONE[selectedTable.status] || STATUS_TONE.BETTING).bg,
                        color: (STATUS_TONE[selectedTable.status] || STATUS_TONE.BETTING).color
                      }}>{selectedTable.status}</span>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Dealer ({selectedTable.dealerHand.value})</div>
                      {selectedTable.dealerHand.cards.map((c, i) => <CardChip key={i} card={c} />)}
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Player ({selectedTable.playerHand.value})</div>
                      {selectedTable.playerHand.cards.map((c, i) => <CardChip key={i} card={c} />)}
                    </div>

                    {selectedTable.outcome && (
                      <div style={{ marginBottom: '16px', padding: '10px', borderRadius: '8px', background: 'var(--success-bg)', color: 'var(--success)', textAlign: 'center', fontWeight: '700' }}>
                        {selectedTable.outcome}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => runAction(api.deal, 'Dealt')} disabled={selectedTable.status !== 'BETTING'}
                        style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: '700', cursor: 'pointer', opacity: selectedTable.status !== 'BETTING' ? 0.5 : 1 }}>
                        Deal
                      </button>
                      <button onClick={() => runAction(api.hit, 'Hit')} disabled={selectedTable.status !== 'PLAYER_TURN'}
                        style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: '700', cursor: 'pointer', opacity: selectedTable.status !== 'PLAYER_TURN' ? 0.5 : 1 }}>
                        Hit
                      </button>
                      <button onClick={() => runAction(api.stand, 'Stood')} disabled={selectedTable.status !== 'PLAYER_TURN'}
                        style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: '700', cursor: 'pointer', opacity: selectedTable.status !== 'PLAYER_TURN' ? 0.5 : 1 }}>
                        Stand
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'sim' && (
            <BlackjackSimulationTab
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

function BlackjackSimulationTab({ simSnapshot, simStep, simLoading, simError, simSteps, onRunStep }) {
  const tables = simSnapshot?.tables || []
  const events = simSnapshot?.events || []
  const raceResult = simSnapshot?.raceResult
  const isDone = simStep >= simSteps.length
  const currentStepMeta = simSteps[Math.min(simStep, simSteps.length - 1)]

  return (
    <div>
      <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-primary)', marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '20px' }}>🕹️ Interactive Shared-Shoe Concurrency Walkthrough</h2>
        <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', fontSize: '13px' }}>
          Play one table by hand, then race 15 tables against a nearly-empty shared shoe. Every
          step below calls the real <code>/api/blackjack/sim/*</code> sandbox endpoints —
          completely separate from the live tables in the other tab.
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
            <HudTile label="Tables" value={tables.length} tone="neutral" />
            <HudTile label="Shoe Remaining" value={`${simSnapshot.shoeRemaining ?? '—'} / ${simSnapshot.shoeSize ?? '—'}`} tone="neutral" />
            <HudTile label="Race Dealt" value={raceResult ? raceResult.dealt : '—'} tone="ok" />
            <HudTile label="Race Exhausted" value={raceResult ? raceResult.exhausted : '—'} tone="danger" />
            <HudTile label="Duplicate Card?" value={raceResult ? String(raceResult.duplicateCardDetected) : '—'} tone={raceResult && raceResult.duplicateCardDetected ? 'danger' : 'ok'} />
            <HudTile label="Events Logged" value={events.length} tone="neutral" />
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-primary)', marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 14px', fontSize: '15px' }}>🃏 Sandbox Tables</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
              {tables.map(t => (
                <div key={t.id} style={{ background: 'var(--bg-primary)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <strong>{t.id}</strong>
                    <span style={{ color: 'var(--text-secondary)' }}>{t.status}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Player {t.playerHand.value} · Dealer {t.dealerHand.value}
                    {t.outcome ? ` · ${t.outcome}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '15px' }}>📜 Sandbox Event Log</h4>
            <div style={{ maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column-reverse', gap: '6px' }}>
              {events.map(ev => {
                const isFailure = ev.type === 'SHOE_EXHAUSTED'
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
