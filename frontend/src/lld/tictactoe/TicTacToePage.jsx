import React, { useState } from 'react';
import LldPage from '../../components/LldPage';
import SimulationControls from '../../components/SimulationControls';
import { useSimulationPlayback } from '../../hooks/useSimulationPlayback';
import { createGame, makeMove, undoMove, resetGame, simReset, simMove, simUndo } from './api';

// ── Simulation steps ─────────────────────────────────────────────────────────

const SIM_STEPS = [
  { title: '1. Create Match',   desc: 'Reset the isolated /api/tictactoe/sim sandbox and create an Alice-vs-Bob match.' },
  { title: '2. Alice plays X',  desc: 'POST /api/tictactoe/sim/move — Alice places X at [0,0] (top-left corner).' },
  { title: '3. Bob plays O',    desc: 'POST /api/tictactoe/sim/move — Bob plays O at [1,1] (center cell).' },
  { title: '4. Alice plays X',  desc: 'Alice occupies [0,1] building a threat across the top row.' },
  { title: '5. Bob plays O',    desc: 'Bob blocks at [2,2] — diagonal corner strategy.' },
  { title: '6. Alice wins!',    desc: 'Alice completes [0,0]→[0,1]→[0,2]. Win line detected. Game ends.' },
  { title: '7. Undo move',      desc: 'POST /api/tictactoe/sim/undo — removes Alice\'s last move, game resumes.' },
  { title: '8. Reset board',    desc: 'POST /api/tictactoe/sim/reset — sandbox board cleared, ready for next match.' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function WinnerBanner({ winner }) {
  if (!winner) return null;
  return (
    <div style={{
      background: 'rgba(34,197,94,0.12)',
      border: '1px solid #22c55e',
      borderRadius: 'var(--radius-md)',
      padding: '10px 18px',
      color: '#22c55e',
      fontWeight: 800,
      fontSize: 'var(--font-base)',
      textAlign: 'center',
    }}>
      🎉 Winner: {winner.name} ({winner.symbol})
    </div>
  );
}

function DrawBanner() {
  return (
    <div style={{
      background: 'rgba(234,179,8,0.12)',
      border: '1px solid #eab308',
      borderRadius: 'var(--radius-md)',
      padding: '10px 18px',
      color: '#eab308',
      fontWeight: 800,
      fontSize: 'var(--font-base)',
      textAlign: 'center',
    }}>
      🤝 It's a Draw!
    </div>
  );
}

function GameGrid({ board, game, onCellClick }) {
  const isWinningCell = (r, c) => {
    if (!game?.winningLine) return false;
    const [sr, sc, er, ec] = game.winningLine;
    if (sr === er) return r === sr && c >= Math.min(sc, ec) && c <= Math.max(sc, ec);
    if (sc === ec) return c === sc && r >= Math.min(sr, er) && r <= Math.max(sr, er);
    if (sr === 0 && sc === 0) return r === c;
    if (sr === 0 && sc === 2) return r + c === 2;
    return false;
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 88px)', gap: '10px' }}>
      {board.map((row, rIdx) =>
        row.map((val, cIdx) => {
          const win = isWinningCell(rIdx, cIdx);
          return (
            <div
              key={`${rIdx}-${cIdx}`}
              onClick={() => onCellClick(rIdx, cIdx)}
              style={{
                width: 88, height: 88,
                borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 38, fontWeight: 900,
                cursor: game?.status === 'IN_PROGRESS' && !val ? 'pointer' : 'default',
                background: win
                  ? 'rgba(34,197,94,0.18)'
                  : val === 'X' ? 'rgba(99,102,241,0.12)' : val === 'O' ? 'rgba(239,68,68,0.12)' : 'var(--bg-primary)',
                border: win
                  ? '2px solid #22c55e'
                  : val === 'X' ? '2px solid #6366f1' : val === 'O' ? '2px solid #ef4444' : '1px solid var(--border-primary)',
                color: val === 'X' ? '#6366f1' : val === 'O' ? '#ef4444' : 'transparent',
                boxShadow: win ? '0 0 16px rgba(34,197,94,0.35)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {val || '·'}
            </div>
          );
        })
      )}
    </div>
  );
}

// ── Interactive 2-D Simulation ───────────────────────────────────────────────

function TicTacToeSimulation() {
  const [logs, setLogs] = useState([]);
  const actions = [
    () => simReset(),
    () => simMove(0, 0, 'Alice opens the corner'),
    () => simMove(1, 1, 'Bob takes the center'),
    () => simMove(0, 1, 'Alice builds the top row'),
    () => simMove(2, 2, 'Bob blocks the diagonal corner'),
    () => simMove(0, 2, 'Alice completes the top row'),
    () => simUndo(),
    () => simReset(),
  ];
  const playback = useSimulationPlayback(SIM_STEPS.length, async (index) => {
    const message = `[${new Date().toLocaleTimeString()}] Sending: ${SIM_STEPS[index].title}`;
    setLogs(previous => index === 0 ? [message] : [message, ...previous.slice(0, 6)]);
    return actions[index]();
  });
  const simGame = playback.result;
  const step = playback.completed;

  const board = simGame?.board || Array.from({ length: 3 }, () => Array(3).fill(''));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Step pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {SIM_STEPS.map((s, i) => (
          <div
            key={i}
            style={{
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--font-xs)',
              fontWeight: 700,
              background: i < step ? 'rgba(99,102,241,0.15)' : i === step ? '#6366f1' : 'var(--bg-primary)',
              color: i === step ? '#fff' : i < step ? '#6366f1' : 'var(--text-muted)',
              border: i < step || i === step ? '1px solid #6366f1' : '1px solid var(--border-primary)',
            }}
          >
            {i + 1}. {s.title.replace(/^\d+\. /, '')}
          </div>
        ))}
      </div>

      <SimulationControls steps={SIM_STEPS} playback={playback} />

      {/* Board + HUD */}
      <div className="responsive-two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        {/* Game Board Preview */}
        <div style={{
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: 'var(--radius-lg)',
          padding: 28,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: 320, gap: 20,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 88px)', gap: 10 }}>
            {board.map((row, rIdx) =>
              row.map((val, cIdx) => {
                const winLine = simGame?.winningLine;
                let win = false;
                if (winLine) {
                  const [sr, sc, er, ec] = winLine;
                  if (sr === er) win = rIdx === sr && cIdx >= Math.min(sc, ec) && cIdx <= Math.max(sc, ec);
                  else if (sc === ec) win = cIdx === sc && rIdx >= Math.min(sr, er) && rIdx <= Math.max(sr, er);
                  else if (sr === 0 && sc === 0) win = rIdx === cIdx;
                  else if (sr === 0 && sc === 2) win = rIdx + cIdx === 2;
                }
                return (
                  <div key={`${rIdx}-${cIdx}`} style={{
                    width: 88, height: 88,
                    borderRadius: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 38, fontWeight: 900,
                    background: win ? 'rgba(34,197,94,0.25)' : val === 'X' ? 'rgba(99,102,241,0.18)' : val === 'O' ? 'rgba(239,68,68,0.18)' : '#1e293b',
                    border: win ? '2px solid #22c55e' : val === 'X' ? '1px solid #6366f1' : val === 'O' ? '1px solid #ef4444' : '1px solid #334155',
                    color: val === 'X' ? '#818cf8' : val === 'O' ? '#f87171' : '#475569',
                    boxShadow: win ? '0 0 20px rgba(34,197,94,0.5)' : 'none',
                    transition: 'all 0.25s ease',
                  }}>
                    {val || '·'}
                  </div>
                );
              })
            )}
          </div>
          {simGame?.status === 'WON' && (
            <div style={{ background: '#22c55e', color: '#fff', padding: '5px 16px', borderRadius: 'var(--radius-full)', fontWeight: 800, fontSize: 13 }}>
              ⚡ WINNING LINE DETECTED
            </div>
          )}
        </div>

        {/* Right: HUD + Log */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderTop: '3px solid #6366f1', borderRadius: 'var(--radius-lg)', padding: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 'var(--font-sm)', marginBottom: 12, borderBottom: '1px solid var(--border-primary)', paddingBottom: 8 }}>📡 Match HUD</div>
            {[
              ['Move Count', `${simGame?.moveCount ?? 0} / 9`],
              ['Current Turn', simGame?.currentTurn?.name ?? '—'],
              ['Game Status', simGame?.status ?? 'NOT STARTED'],
              ['Lock', 'ReentrantLock ✅'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-xs)', marginBottom: 6 }}>
                <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                <span style={{ fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: 'var(--radius-lg)', padding: 14, fontFamily: 'monospace', fontSize: 11, color: '#38bdf8', maxHeight: 170, overflowY: 'auto' }}>
            <div style={{ color: '#94a3b8', fontWeight: 700, marginBottom: 6, borderBottom: '1px solid #1e293b', paddingBottom: 4 }}>📟 API Log Stream</div>
            {logs.length === 0
              ? <div style={{ color: '#475569' }}>Logs will appear here...</div>
              : logs.map((l, i) => <div key={i} style={{ marginBottom: 3 }}>{l}</div>)
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function TicTacToePage() {
  const [game, setGame] = useState(null);
  const [player1, setPlayer1] = useState('Alice');
  const [player2, setPlayer2] = useState('Bob');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const board = game?.board || Array.from({ length: 3 }, () => Array(3).fill(''));

  const handleStart = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await createGame(player1, player2);
      setGame(data);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to start game');
    } finally {
      setLoading(false);
    }
  };

  const handleCellClick = async (row, col) => {
    if (!game || game.status !== 'IN_PROGRESS') return;
    setErrorMsg('');
    try {
      const updated = await makeMove(game.id, row, col, game.currentTurn.name);
      setGame(updated);
    } catch (err) {
      setErrorMsg(err.message || 'Invalid move');
    }
  };

  const handleUndo = async () => {
    if (!game) return;
    try {
      const updated = await undoMove(game.id);
      setGame(updated);
    } catch (err) {
      setErrorMsg(err.message || 'Cannot undo');
    }
  };

  const handleReset = async () => {
    if (!game) return;
    try {
      const updated = await resetGame(game.id);
      setGame(updated);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to reset');
    }
  };

  return (
    <LldPage
      module="tictactoe"
      title="Tic Tac Toe Game Engine"
      icon="❌"
      tabs={['board', { id: 'history', label: '📜 Move History' }, 'simulation', 'diagram', 'sequence', 'details']}
    >
      {(tab) => (
        <>
          {/* ── TAB 1: GAME BOARD ─────────────────────────────────────────── */}
          {tab === 'board' && (
            <div className="responsive-two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
              {/* Left: Board */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderTop: '4px solid #6366f1', borderRadius: 'var(--radius-lg)', padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                <h3 style={{ fontWeight: 800, fontSize: 'var(--font-lg)', margin: 0 }}>
                  {game ? `Match #${game.id}` : 'Start New Match'}
                </h3>

                {!game ? (
                  <form onSubmit={handleStart} style={{ width: '100%', maxWidth: 300, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>Player 1 (X)</label>
                      <input value={player1} onChange={e => setPlayer1(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)', background: 'var(--bg-primary)', color: 'var(--text-primary)', marginTop: 4 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>Player 2 (O)</label>
                      <input value={player2} onChange={e => setPlayer2(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)', background: 'var(--bg-primary)', color: 'var(--text-primary)', marginTop: 4 }} />
                    </div>
                    <button type="submit" disabled={loading} style={{ padding: '10px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 700, cursor: 'pointer', fontSize: 'var(--font-sm)' }}>
                      {loading ? 'Starting…' : '▶ Start Match'}
                    </button>
                  </form>
                ) : (
                  <>
                    {/* Status */}
                    {game.status === 'IN_PROGRESS' && (
                      <div style={{ fontWeight: 700, fontSize: 'var(--font-base)' }}>
                        Turn: <span style={{ color: game.currentTurn?.symbol === 'X' ? '#6366f1' : '#ef4444' }}>
                          {game.currentTurn?.name} ({game.currentTurn?.symbol})
                        </span>
                      </div>
                    )}
                    {game.status === 'WON' && <WinnerBanner winner={game.winner} />}
                    {game.status === 'DRAW' && <DrawBanner />}
                    {errorMsg && <div style={{ color: '#ef4444', fontSize: 'var(--font-xs)' }}>⚠ {errorMsg}</div>}

                    {/* Grid */}
                    <GameGrid board={board} game={game} onCellClick={handleCellClick} />

                    {/* Controls */}
                    <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 290 }}>
                      <button onClick={handleUndo} style={{ flex: 1, padding: '8px', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-primary)', cursor: 'pointer', fontWeight: 600, fontSize: 'var(--font-xs)' }}>↩ Undo</button>
                      <button onClick={handleReset} style={{ flex: 1, padding: '8px', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-primary)', cursor: 'pointer', fontWeight: 600, fontSize: 'var(--font-xs)' }}>🔄 Reset</button>
                      <button onClick={() => { setGame(null); setErrorMsg(''); }} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: 'var(--radius-sm)', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 'var(--font-xs)' }}>New</button>
                    </div>
                  </>
                )}
              </div>

              {/* Right: Info panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 'var(--font-sm)', marginBottom: 14, borderBottom: '1px solid var(--border-primary)', paddingBottom: 10 }}>📊 Match Info</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 'var(--font-xs)' }}>
                    {[
                      ['Player X', player1 || '—', '#6366f1'],
                      ['Player O', player2 || '—', '#ef4444'],
                      ['Moves Made', game?.moveCount ?? 0, 'var(--text-primary)'],
                      ['Status', game?.status ?? 'NOT STARTED', 'var(--text-primary)'],
                    ].map(([k, v, c]) => (
                      <div key={k} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                        <span style={{ fontWeight: 700, color: c }}>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderLeft: '4px solid #3b82f6', borderRadius: 'var(--radius-lg)', padding: 16, fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>How to Play:</strong><br />
                  Click any empty cell to place your symbol. Get 3 in a row — horizontally, vertically, or diagonally — to win. Use ↩ Undo to take back your last move.
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: MOVE HISTORY ───────────────────────────────────────── */}
          {tab === 'history' && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderTop: '4px solid #3b82f6', borderRadius: 'var(--radius-lg)', padding: 20 }}>
              <h3 style={{ fontWeight: 700, fontSize: 'var(--font-base)', marginBottom: 16, borderBottom: '1px solid var(--border-primary)', paddingBottom: 10 }}>
                📜 Move History Log
              </h3>
              {!game?.moveHistory?.length ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No moves recorded yet. Start a game from the Game Board tab.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {game.moveHistory.map((m, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', border: '1px solid var(--border-primary)', borderLeft: `3px solid ${m.symbol === 'X' ? '#6366f1' : '#ef4444'}`, borderRadius: 'var(--radius-sm)', background: 'var(--bg-primary)', fontSize: 'var(--font-xs)' }}>
                      <span>
                        <strong style={{ color: m.symbol === 'X' ? '#6366f1' : '#ef4444' }}>Move #{m.moveNumber}</strong>
                        {' — '}{m.playerName} placed <strong>{m.symbol}</strong>
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>Row {m.row}, Col {m.col}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: SIMULATION ─────────────────────────────────────────── */}
          {tab === 'simulation' && <TicTacToeSimulation />}
        </>
      )}
    </LldPage>
  );
}
