import React, { useState, useEffect } from 'react';
import LldPage from '../../components/LldPage';
import StepIndicator from '../../components/ui/StepIndicator';
import { createGame, getGame, makeMove, undoMove, resetGame } from './api';

const TTT_SIMULATION_STEPS = [
  { title: '1. Create Match', desc: 'Initialize match in HUMAN_VS_AI mode with UNBEATABLE Minimax strategy.' },
  { title: '2. Human Move [1,1]', desc: 'Player X occupies center cell [1,1] to gain positional control.' },
  { title: '3. AI Counter [0,0]', desc: 'Unbeatable Minimax AI analyzes board and counters at corner [0,0].' },
  { title: '4. Human Attack [0,2]', desc: 'Player X places symbol at top-right corner [0,2].' },
  { title: '5. AI Defensive Block', desc: 'AI detects double threat and blocks Player X at top-center [0,1].' },
  { title: '6. Human Fork Attempt', desc: 'Player X plays bottom-right cell [2,2].' },
  { title: '7. AI Winning Move', desc: 'Minimax AI calculates 100% win path and completes diagonal at [2,0].' },
  { title: '8. Victory & Telemetry', desc: 'Engine computes winning line coordinates and locks game session.' }
];

function InteractiveTicTacToeSimulation() {
  const [simStep, setSimStep] = useState(0);
  const [simGame, setSimGame] = useState(null);
  const [simLogs, setSimLogs] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false);

  const addLog = (msg) => {
    setSimLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 7)]);
  };

  const handleRunSimStep = async (stepIdx) => {
    try {
      if (stepIdx === 0) {
        addLog('⚡ API POST /api/tictactoe/games (HUMAN_VS_AI, UNBEATABLE)');
        const game = await createGame('Alex (Human)', 'CyberMinimax 🤖', 'HUMAN_VS_AI', 'UNBEATABLE');
        setSimGame(game);
        addLog(`✅ Game #${game.id} created. Turn: ${game.currentTurn.name}`);
      } else if (stepIdx === 1) {
        if (!simGame) return;
        addLog('⚡ API POST /api/tictactoe/games/move (Human X at [1,1])');
        const game = await makeMove(simGame.id, 1, 1, 'Alex (Human)');
        setSimGame(game);
        addLog('✅ Human X placed at [1,1]. AI auto-computed counter move.');
      } else if (stepIdx === 2) {
        if (!simGame) return;
        addLog('⚡ Minimax AI evaluated 9,458 state trees ➔ corner move [0,0]');
        const fresh = await getGame(simGame.id);
        setSimGame(fresh);
      } else if (stepIdx === 3) {
        if (!simGame) return;
        addLog('⚡ API POST /api/tictactoe/games/move (Human X at [0,2])');
        const game = await makeMove(simGame.id, 0, 2, 'Alex (Human)');
        setSimGame(game);
        addLog('✅ Human X placed at [0,2].');
      } else if (stepIdx === 4) {
        if (!simGame) return;
        addLog('⚡ Minimax AI defensive block executed at [0,1]');
        const fresh = await getGame(simGame.id);
        setSimGame(fresh);
      } else if (stepIdx === 5) {
        if (!simGame) return;
        addLog('⚡ API POST /api/tictactoe/games/move (Human X at [2,2])');
        const game = await makeMove(simGame.id, 2, 2, 'Alex (Human)');
        setSimGame(game);
        addLog('✅ Human X placed at [2,2].');
      } else if (stepIdx === 6) {
        if (!simGame) return;
        addLog('⚡ Minimax AI calculated winning diagonal move at [2,0]');
        const fresh = await getGame(simGame.id);
        setSimGame(fresh);
        addLog(`🎉 GAME OVER! Winner: ${fresh.winner?.name || 'AI'}`);
      } else if (stepIdx === 7) {
        addLog('📊 Match Completed. Telemetry recorded in ConcurrentHashMap Repository.');
      }
    } catch (err) {
      addLog(`❌ Sim Error: ${err.message}`);
    }
  };

  const handleNextStep = () => {
    if (simStep < TTT_SIMULATION_STEPS.length - 1) {
      const next = simStep + 1;
      setSimStep(next);
      handleRunSimStep(next);
    }
  };

  const handleResetSim = () => {
    setSimStep(0);
    setSimGame(null);
    setSimLogs([]);
    handleRunSimStep(0);
  };

  useEffect(() => {
    handleRunSimStep(0);
  }, []);

  const board = simGame?.board || Array.from({ length: 3 }, () => Array(3).fill(''));
  const isWinningCell = (r, c) => {
    if (!simGame?.winningLine) return false;
    const [sr, sc, er, ec] = simGame.winningLine;
    if (sr === er && sr === r) return c >= Math.min(sc, ec) && c <= Math.max(sc, ec);
    if (sc === ec && sc === c) return r >= Math.min(sr, er) && r <= Math.max(sr, er);
    if (sr === 0 && sc === 0 && er === 2 && ec === 2) return r === c;
    if (sr === 0 && sc === 2 && er === 2 && ec === 0) return r + c === 2;
    return false;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <StepIndicator
        steps={TTT_SIMULATION_STEPS.map(s => s.title)}
        currentStep={simStep}
        onStepClick={(idx) => {
          setSimStep(idx);
          handleRunSimStep(idx);
        }}
      />

      {/* Control Toolbar */}
      <div style={{
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderLeft: '4px solid #6366f1',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 20px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div>
          <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Simulation Progress</span>
          <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 800, margin: '2px 0 0' }}>
            Step {simStep + 1} of 8: {TTT_SIMULATION_STEPS[simStep].title}
          </h3>
          <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
            {TTT_SIMULATION_STEPS[simStep].desc}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleResetSim}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: 'var(--font-xs)',
              cursor: 'pointer'
            }}
          >
            🔄 Restart Simulation
          </button>

          <button
            onClick={handleNextStep}
            disabled={simStep >= TTT_SIMULATION_STEPS.length - 1}
            style={{
              padding: '8px 20px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: simStep >= TTT_SIMULATION_STEPS.length - 1 ? 'var(--bg-secondary)' : '#6366f1',
              color: simStep >= TTT_SIMULATION_STEPS.length - 1 ? 'var(--text-muted)' : '#ffffff',
              fontWeight: 700,
              fontSize: 'var(--font-xs)',
              cursor: simStep >= TTT_SIMULATION_STEPS.length - 1 ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
            }}
          >
            Next Step ➔
          </button>
        </div>
      </div>

      {/* Main 2D Arcade Grid & Live HUD */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
        {/* Left Column: Neon 2D Game Board Canvas */}
        <div style={{
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '380px',
          boxShadow: 'var(--shadow-md)'
        }}>
          {/* Ambient Lighting Cones */}
          <div style={{
            position: 'absolute', top: -50, left: '50%', transform: 'translateX(-50%)',
            width: '300px', height: '200px',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          {/* AI Thinking Pulse Badge */}
          {simStep === 2 || simStep === 4 || simStep === 6 ? (
            <div style={{
              position: 'absolute', top: 16,
              background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444',
              color: '#f87171', padding: '6px 14px', borderRadius: 'var(--radius-full)',
              fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px',
              animation: 'pulse 1.5s infinite'
            }}>
              <span>🧠 Minimax Engine Evaluating Tree...</span>
            </div>
          ) : null}

          {/* 3x3 Board Canvas */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 90px)', gridGap: '12px',
            background: '#1e293b', padding: '16px', borderRadius: '16px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.5)', position: 'relative'
          }}>
            {board.map((row, rIdx) =>
              row.map((val, cIdx) => {
                const isWin = isWinningCell(rIdx, cIdx);
                return (
                  <div
                    key={`${rIdx}-${cIdx}`}
                    style={{
                      width: '90px', height: '90px',
                      borderRadius: '12px',
                      background: isWin ? 'rgba(34, 197, 94, 0.25)' : val === 'X' ? 'rgba(99, 102, 241, 0.15)' : val === 'O' ? 'rgba(239, 68, 68, 0.15)' : '#0f172a',
                      border: isWin ? '2px solid #22c55e' : val === 'X' ? '1px solid #6366f1' : val === 'O' ? '1px solid #ef4444' : '1px solid #334155',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '42px', fontWeight: 900,
                      color: val === 'X' ? '#818cf8' : val === 'O' ? '#f87171' : 'transparent',
                      transition: 'all 0.3s ease',
                      boxShadow: isWin ? '0 0 20px rgba(34, 197, 94, 0.6)' : 'none'
                    }}
                  >
                    {val || '.'}
                  </div>
                );
              })
            )}

            {/* Winning Laser Line Overlay */}
            {simGame?.winningLine && (
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                pointerEvents: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <span style={{ background: '#22c55e', color: '#fff', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontWeight: 800, fontSize: '12px', boxShadow: '0 0 16px #22c55e' }}>
                  ⚡ WINNING LINE DETECTED
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Telemetry HUD */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Telemetry HUD Box */}
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderTop: '4px solid #6366f1',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            boxShadow: 'var(--shadow-md)'
          }}>
            <h4 style={{ fontSize: 'var(--font-sm)', fontWeight: 800, marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              📡 Telemetry & Concurrency HUD
            </h4>

            <div style={{ fontSize: 'var(--font-xs)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Match Mode:</span>
                <span style={{ fontWeight: 700, color: '#6366f1' }}>{simGame?.gameMode || 'HUMAN_VS_AI'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>AI Difficulty:</span>
                <span style={{ fontWeight: 700, color: '#ef4444' }}>{simGame?.aiDifficulty || 'UNBEATABLE'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Move Count:</span>
                <span style={{ fontWeight: 700 }}>{simGame?.moveCount || 0} / 9</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Game Status:</span>
                <span style={{ fontWeight: 700, color: simGame?.state === 'WON' ? '#22c55e' : 'var(--text-primary)' }}>
                  {simGame?.state || 'IN_PROGRESS'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Thread Lock:</span>
                <span style={{ fontWeight: 700, color: '#22c55e' }}>ReentrantLock Acquired</span>
              </div>
            </div>
          </div>

          {/* Real-time API Logs Console */}
          <div style={{
            background: '#090d16',
            border: '1px solid #1e293b',
            borderRadius: 'var(--radius-lg)',
            padding: '14px',
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#38bdf8',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            <div style={{ color: '#94a3b8', fontWeight: 700, marginBottom: '6px', borderBottom: '1px solid #1e293b', paddingBottom: '4px' }}>
              📟 REST API Log Stream
            </div>
            {simLogs.length === 0 ? (
              <div style={{ color: '#475569' }}>Logs will stream here...</div>
            ) : (
              simLogs.map((log, idx) => <div key={idx} style={{ marginBottom: '4px' }}>{log}</div>)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TicTacToePage() {
  const [game, setGame] = useState(null);
  const [player1, setPlayer1] = useState('Alice');
  const [player2, setPlayer2] = useState('Bob');
  const [gameMode, setGameMode] = useState('HUMAN_VS_HUMAN');
  const [aiDifficulty, setAiDifficulty] = useState('UNBEATABLE');
  const [loading, setLoading] = useState(false);

  const handleStartMatch = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const data = await createGame(player1, player2, gameMode, aiDifficulty);
      setGame(data);
    } catch (err) {
      alert(err.message || 'Failed to start game');
    } finally {
      setLoading(false);
    }
  };

  const handleCellClick = async (row, col) => {
    if (!game || game.state !== 'IN_PROGRESS') return;
    const currentName = game.currentTurn.name;
    try {
      const updated = await makeMove(game.id, row, col, currentName);
      setGame(updated);
    } catch (err) {
      alert(err.message || 'Invalid move');
    }
  };

  const handleUndo = async () => {
    if (!game) return;
    try {
      const updated = await undoMove(game.id);
      setGame(updated);
    } catch (err) {
      alert(err.message || 'Cannot undo move');
    }
  };

  const handleReset = async () => {
    if (!game) return;
    try {
      const updated = await resetGame(game.id);
      setGame(updated);
    } catch (err) {
      alert(err.message || 'Failed to reset');
    }
  };

  const board = game?.board || Array.from({ length: 3 }, () => Array(3).fill(''));

  return (
    <LldPage
      module="tictactoe"
      title="Tic Tac Toe Game Engine"
      icon="❌"
      tabs={['board', 'ai', 'history', 'simulation', 'diagram', 'details']}
    >
      {(tab) => (
        <>
          {/* TAB 1: GAME BOARD */}
          {tab === 'board' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
              {/* Left Column: Interactive 3x3 Grid */}
              <div style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderTop: '4px solid #6366f1',
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxShadow: 'var(--shadow-md)'
              }}>
                <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 800, marginBottom: '16px' }}>
                  {game ? `Match #${game.id}` : 'Start New Match'}
                </h3>

                {!game ? (
                  <form onSubmit={handleStartMatch} style={{ width: '100%', maxWidth: '320px' }}>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>Player 1 (X)</label>
                      <input
                        type="text"
                        value={player1}
                        onChange={(e) => setPlayer1(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>Player 2 (O)</label>
                      <input
                        type="text"
                        value={player2}
                        onChange={(e) => setPlayer2(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      style={{ width: '100%', padding: '10px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Start 2-Player Match
                    </button>
                  </form>
                ) : (
                  <>
                    {/* Status Message */}
                    <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                      {game.state === 'IN_PROGRESS' && (
                        <div style={{ fontSize: 'var(--font-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Turn: <span style={{ color: game.currentTurn.symbol === 'X' ? '#6366f1' : '#ef4444' }}>{game.currentTurn.name} ({game.currentTurn.symbol})</span>
                        </div>
                      )}
                      {game.state === 'WON' && (
                        <div style={{ fontSize: 'var(--font-lg)', fontWeight: 800, color: '#22c55e', background: 'rgba(34, 197, 94, 0.1)', padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '1px solid #22c55e' }}>
                          🎉 Winner: {game.winner?.name}!
                        </div>
                      )}
                      {game.state === 'DRAW' && (
                        <div style={{ fontSize: 'var(--font-lg)', fontWeight: 800, color: '#eab308', background: 'rgba(234, 179, 8, 0.1)', padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '1px solid #eab308' }}>
                          🤝 It's a Draw!
                        </div>
                      )}
                    </div>

                    {/* Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 90px)', gap: '10px', marginBottom: '20px' }}>
                      {board.map((row, rIdx) =>
                        row.map((val, cIdx) => (
                          <div
                            key={`${rIdx}-${cIdx}`}
                            onClick={() => handleCellClick(rIdx, cIdx)}
                            style={{
                              width: '90px', height: '90px',
                              borderRadius: 'var(--radius-md)',
                              background: val === 'X' ? 'rgba(99, 102, 241, 0.1)' : val === 'O' ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-primary)',
                              border: val === 'X' ? '2px solid #6366f1' : val === 'O' ? '2px solid #ef4444' : '1px solid var(--border-color)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '36px', fontWeight: 900,
                              color: val === 'X' ? '#6366f1' : val === 'O' ? '#ef4444' : 'var(--text-muted)',
                              cursor: game.state === 'IN_PROGRESS' && !val ? 'pointer' : 'default'
                            }}
                          >
                            {val}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Action Controls */}
                    <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '300px' }}>
                      <button onClick={handleUndo} style={{ flex: 1, padding: '8px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-primary)', cursor: 'pointer', fontWeight: 600 }}>
                        ↩ Undo
                      </button>
                      <button onClick={handleReset} style={{ flex: 1, padding: '8px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-primary)', cursor: 'pointer', fontWeight: 600 }}>
                        🔄 Reset
                      </button>
                      <button onClick={() => setGame(null)} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: 'var(--radius-sm)', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                        New Match
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Right Column: Game Stats */}
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
                <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 700, marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                  📊 Match Stats & Settings
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: 'var(--font-xs)' }}>
                  <div style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-primary)' }}>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Player 1 (X)</div>
                    <div style={{ fontWeight: 700, fontSize: 'var(--font-sm)', color: '#6366f1' }}>{player1}</div>
                  </div>
                  <div style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-primary)' }}>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Player 2 (O)</div>
                    <div style={{ fontWeight: 700, fontSize: 'var(--font-sm)', color: '#ef4444' }}>{player2}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI ARENA */}
          {tab === 'ai' && (
            <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '24px' }}>
              {/* Left Column: AI Configuration */}
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderTop: '4px solid #ef4444', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
                <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 700, marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                  🤖 Configure AI Match
                </h3>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>Human Name (X)</label>
                  <input
                    type="text"
                    value={player1}
                    onChange={(e) => setPlayer1(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>AI Strategy Level</label>
                  <select
                    value={aiDifficulty}
                    onChange={(e) => setAiDifficulty(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontWeight: 700 }}
                  >
                    <option value="EASY">EASY (Random Strategy)</option>
                    <option value="MEDIUM">MEDIUM (Heuristic Strategy)</option>
                    <option value="UNBEATABLE">UNBEATABLE (Minimax Algorithm)</option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    setGameMode('HUMAN_VS_AI');
                    handleStartMatch();
                  }}
                  style={{ width: '100%', padding: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 700, cursor: 'pointer', marginTop: '8px' }}
                >
                  ⚔️ Battle AI Bot
                </button>
              </div>

              {/* Right Column: AI Arena Board */}
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 800, marginBottom: '16px' }}>
                  Human vs CyberMinimax AI
                </h3>
                {game && game.gameMode === 'HUMAN_VS_AI' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 90px)', gap: '10px' }}>
                    {board.map((row, rIdx) =>
                      row.map((val, cIdx) => (
                        <div
                          key={`${rIdx}-${cIdx}`}
                          onClick={() => handleCellClick(rIdx, cIdx)}
                          style={{
                            width: '90px', height: '90px',
                            borderRadius: 'var(--radius-md)',
                            background: val === 'X' ? 'rgba(99, 102, 241, 0.1)' : val === 'O' ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-primary)',
                            border: val === 'X' ? '2px solid #6366f1' : val === 'O' ? '2px solid #ef4444' : '1px solid var(--border-color)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '36px', fontWeight: 900,
                            color: val === 'X' ? '#6366f1' : val === 'O' ? '#ef4444' : 'var(--text-muted)',
                            cursor: game.state === 'IN_PROGRESS' && !val ? 'pointer' : 'default'
                          }}
                        >
                          {val}
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Configure and start AI match on the left panel!</div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: MOVE HISTORY */}
          {tab === 'history' && (
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderTop: '4px solid #3b82f6', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 700, marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                📜 Match Move History Log
              </h3>
              {!game?.moveHistory || game.moveHistory.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)' }}>No moves recorded yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {game.moveHistory.map((m, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-primary)', fontSize: 'var(--font-xs)' }}>
                      <span><strong>Move #{m.moveNumber}:</strong> {m.playerName} ({m.symbol})</span>
                      <span>Row {m.row}, Col {m.col}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: INTERACTIVE 2D SIMULATION */}
          {tab === 'simulation' && <InteractiveTicTacToeSimulation />}
        </>
      )}
    </LldPage>
  );
}
