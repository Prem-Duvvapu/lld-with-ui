import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createGame, getGame, makeMove, resetGame } from './api';
import ClassDiagram from '../../components/ClassDiagram';
import DesignDetails from '../../components/DesignDetails';

const styles = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f0f2f5; color: #333; }
.app { max-width: 500px; margin: 0 auto; padding: 20px; }
header { text-align: center; margin-bottom: 24px; }
header h1 { font-size: 28px; color: #333; }
header p { color: #666; font-size: 14px; }
main { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.setup { max-width: 300px; margin: 0 auto; }
.setup h2 { margin-bottom: 16px; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; margin-bottom: 4px; font-weight: 600; font-size: 14px; }
.form-group input { width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px; }
.form-group input:focus { outline: none; border-color: #333; }
.btn-primary { width: 100%; padding: 12px; background: #333; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; }
.btn-primary:hover { background: #555; }
.game-header { text-align: center; margin-bottom: 16px; }
.game-header h2 { font-size: 20px; margin-bottom: 4px; }
.turn-indicator { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
.turn-x { color: #2196f3; }
.turn-o { color: #f44336; }
.board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; max-width: 320px; margin: 0 auto 16px; }
.cell { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 48px; font-weight: 700; background: #f8f9fa; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.cell:hover { background: #e8e8e8; }
.cell.x { color: #2196f3; }
.cell.o { color: #f44336; }
.cell.disabled { cursor: not-allowed; opacity: 0.8; }
.game-over { text-align: center; padding: 16px; background: #e8f5e9; border-radius: 8px; margin-bottom: 16px; }
.game-over h3 { font-size: 22px; color: #2e7d32; margin-bottom: 4px; }
.game-over.draw { background: #fff3e0; }
.game-over.draw h3 { color: #e65100; }
.game-actions { display: flex; gap: 8px; }
.game-actions button { flex: 1; padding: 10px; border: 2px solid #333; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; background: white; }
.game-actions button:hover { background: #f5f5f5; }
.game-actions .btn-primary { border: none; }
.game-id { text-align: center; font-size: 12px; color: #999; margin-top: 8px; }
.alert { text-align: center; padding: 32px; color: #666; font-size: 16px; }
.error { margin-top: 16px; padding: 12px; background: #fff0f0; color: #d32f2f; border-radius: 8px; font-size: 14px; }
.back-home { display: inline-block; margin-bottom: 16px; padding: 8px 16px; border: 1px solid #333; border-radius: 6px; color: #333; text-decoration: none; font-size: 14px; font-weight: 600; transition: all 0.2s; }
.back-home:hover { background: #333; color: white; }
.step-indicator { display: flex; gap: 4px; justify-content: center; margin-bottom: 12px; }
.step-dot { width: 10px; height: 10px; border-radius: 50%; background: #ddd; transition: all 0.3s; }
.step-dot.active { background: #2196f3; box-shadow: 0 0 8px rgba(33,150,243,0.5); }
.step-dot.done { background: #3fb950; }
nav { display: flex; gap: 8px; margin-bottom: 24px; justify-content: center; }
nav button { padding: 8px 20px; border: 2px solid #333; border-radius: 8px; background: white; color: #333; cursor: pointer; font-weight: 600; font-size: 13px; }
nav button.active { background: #333; color: white; }
.ttt-flow-scene {
  background: white; border-radius: 12px; padding: 20px;
  border: 1px solid #e0e0e0; margin-bottom: 16px; position: relative;
}
.ttt-flow-players {
  display: flex; justify-content: center; gap: 24px; margin-bottom: 16px;
}
.ttt-flow-player-card {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 16px; border-radius: 10px;
  border: 2px solid #e0e0e0; background: #fafafa;
  transition: all 0.3s ease;
}
.ttt-flow-player-card.active-x { border-color: #2196f3; background: #e3f2fd; }
.ttt-flow-player-card.active-o { border-color: #f44336; background: #fce4ec; }
.ttt-flow-player-symbol {
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; font-weight: 800; color: white;
}
.ttt-flow-player-symbol.x { background: #2196f3; }
.ttt-flow-player-symbol.o { background: #f44336; }
.ttt-flow-player-name { font-size: 13px; font-weight: 600; color: #333; }
.ttt-flow-turn-badge { font-size: 11px; color: #888; margin-top: 2px; }

.ttt-flow-board {
  display: grid; grid-template-columns: repeat(3, 72px);
  gap: 6px; justify-content: center; margin: 16px auto;
}
.ttt-flow-cell {
  width: 72px; height: 72px; display: flex; align-items: center;
  justify-content: center; font-size: 28px; font-weight: 700;
  border-radius: 10px; cursor: default; transition: all 0.3s;
  background: #f5f5f5; border: 2px solid #e0e0e0;
}
.ttt-flow-cell.x { background: #e3f2fd; border-color: #2196f3; color: #2196f3; }
.ttt-flow-cell.o { background: #fce4ec; border-color: #f44336; color: #f44336; }
.ttt-flow-cell.filled { animation: cellPop 0.3s ease-out; }
@keyframes cellPop {
  0% { transform: scale(0.3); opacity: 0; }
  70% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}
.ttt-flow-move-info {
  text-align: center; font-size: 12px; color: #888; margin: 8px 0;
  padding: 8px; background: #fafafa; border-radius: 8px;
}
.ttt-flow-btn-wrap {
  display: flex; justify-content: center; gap: 8px; margin-top: 12px;
}
.ttt-flow-popup {
  background: white; border-radius: 12px; padding: 20px 28px;
  text-align: center; box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  border: 2px solid #e0e0e0; margin: 16px auto; max-width: 320px;
}
.ttt-flow-result-icon { font-size: 40px; margin-bottom: 8px; }
.ttt-flow-result-text { font-size: 18px; font-weight: 700; }
.ttt-flow-result-text.win { color: #4caf50; }
.ttt-flow-result-text.draw { color: #ff9800; }
`;

function Game({ gameId, player1, player2, onNewGame }) {
  const [game, setGame] = useState(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const data = await getGame(gameId);
    if (!data.error) setGame(data);
  }, [gameId]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleMove = async (row, col) => {
    if (!game || game.state !== 'IN_PROGRESS') return;
    const currentPlayerName = game.currentTurn?.name;
    const data = await makeMove(gameId, row, col, currentPlayerName);
    if (data.error) setError(data.error);
    else { setGame(data); setError(''); }
  };

  const handleReset = async () => {
    const data = await resetGame(gameId);
    if (!data.error) setGame(data);
  };

  if (!game) return <div className="alert">Loading...</div>;

  const board = game.board || [];
  const isOver = game.state !== 'IN_PROGRESS';
  const isDraw = game.state === 'DRAW';

  return (
    <div>
      <div className="game-header">
        <h2>{player1} (X) vs {player2} (O)</h2>
        {!isOver && (
          <div className={`turn-indicator ${game.currentTurn?.name === player1 ? 'turn-x' : 'turn-o'}`}>
            {game.currentTurn?.name}'s turn ({game.currentTurn?.symbol})
          </div>
        )}
      </div>
      <div className="board">
        {[0,1,2].map((r) => [0,1,2].map((c) => (
          <div key={`${r}-${c}`} className={`cell ${board[r]?.[c] === 'X' ? 'x' : board[r]?.[c] === 'O' ? 'o' : ''} ${isOver ? 'disabled' : ''}`} onClick={() => handleMove(r, c)}>
            {board[r]?.[c]}
          </div>
        )))}
      </div>
      {isOver && (
        <div className={`game-over ${isDraw ? 'draw' : ''}`}>
          <h3>{isDraw ? "It's a Draw!" : `${game.winner?.name} Wins!`}</h3>
        </div>
      )}
      {error && <div className="error">{error}</div>}
      <div className="game-actions">
        <button onClick={handleReset}>Reset</button>
        <button className="btn-primary" onClick={onNewGame}>New Game</button>
      </div>
      <div className="game-id">Game: {gameId}</div>
    </div>
  );
}

function AnimatedFlow() {
  const [step, setStep] = useState(0);
  const [game, setGame] = useState(null);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);
  const steps = ['Create', 'Turn 1', 'Turn 2', 'Turn 3', 'Done'];

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const flatten = (b) => {
    if (!b) return Array(9).fill(null);
    return Array.isArray(b[0]) ? b.flat() : b;
  };

  const reset = () => { setStep(0); setGame(null); setBoard(Array(9).fill(null)); setError(''); };

  const createGameAction = async () => {
    setLoading(true);
    setError('');
    try {
      const g = await createGame('Xavier (AI)', 'Olivia (AI)');
      if (!mountedRef.current) return;
      if (g.error) { setError(g.error); return; }
      setGame(g);
      setBoard(flatten(g.board));
      setStep(2);
    } catch {
      if (mountedRef.current) setError('Failed to create game');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const makeMoveAction = async () => {
    setLoading(true);
    setError('');
    try {
      const b = game.board || [[null, null, null], [null, null, null], [null, null, null]];
      let found = false;
      let g = game;
      for (let r = 0; r < 3 && !found; r++) {
        for (let c = 0; c < 3 && !found; c++) {
          if (b[r][c] === null) {
            const player = g.currentTurn?.name || g.currentPlayer?.name;
            const updated = await makeMove(g.id, r, c, player);
            if (!mountedRef.current) return;
            if (updated.error) { setError(updated.error); return; }
            g = updated;
            setGame(updated);
            setBoard(flatten(updated.board));
            found = true;
          }
        }
      }
      if (!mountedRef.current) return;
      if (g.state === 'FINISHED' || g.state === 'DRAW') {
        setStep(5);
      } else {
        setStep(s => Math.min(s + 1, 4));
      }
    } catch {
      if (mountedRef.current) setError('Failed to make move');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const totalMoves = board.filter(c => c !== null).length;
  const movesRemaining = 9 - totalMoves;
  const winner = game?.winner?.name;
  const isDraw = game?.state === 'DRAW';

  return (
    <div>
      <div className="step-indicator" style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 12 }}>
        {steps.map((s, i) => (
          <div key={s} className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} title={s} />
        ))}
        <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>
          {step >= 2 && step <= 4 ? `Move ${totalMoves + 1}` : step === 0 ? 'Start' : step === 1 ? 'Create Game' : 'Done'}
        </span>
      </div>

      {error && <div style={{ color: '#d32f2f', fontSize: 14, marginBottom: 12, textAlign: 'center' }}>{error}<button style={{ marginLeft: 12, padding: '4px 12px', background: '#eee', border: 'none', borderRadius: 6, cursor: 'pointer' }} onClick={reset}>↺ Reset</button></div>}

      {step === 0 && (
        <div className="ttt-flow-btn-wrap">
          <button onClick={() => setStep(1)} style={{ padding: '12px 32px', background: '#2196f3', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            ▶ Start Simulation
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="ttt-flow-btn-wrap">
          <button onClick={createGameAction} disabled={loading} style={{ padding: '8px 20px', background: '#2196f3', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            🎮 Create Game {loading ? '...' : ''}
          </button>
        </div>
      )}

      {step >= 2 && step <= 4 && game && !error && (
        <div className="ttt-flow-scene">
          <div className="ttt-flow-players">
            <div className={`ttt-flow-player-card ${game.currentTurn?.name === 'Xavier (AI)' ? 'active-x' : ''}`}>
              <div className="ttt-flow-player-symbol x">X</div>
              <div>
                <div className="ttt-flow-player-name">Xavier (AI)</div>
                {game.currentTurn?.name === 'Xavier (AI)' && <div className="ttt-flow-turn-badge">● Your turn</div>}
              </div>
            </div>
            <div className={`ttt-flow-player-card ${game.currentTurn?.name === 'Olivia (AI)' ? 'active-o' : ''}`}>
              <div className="ttt-flow-player-symbol o">O</div>
              <div>
                <div className="ttt-flow-player-name">Olivia (AI)</div>
                {game.currentTurn?.name === 'Olivia (AI)' && <div className="ttt-flow-turn-badge">● Your turn</div>}
              </div>
            </div>
          </div>

          <div className="ttt-flow-board">
            {board.map((cell, i) => (
              <div key={i} className={`ttt-flow-cell ${cell === 'X' ? 'x' : cell === 'O' ? 'o' : ''} ${cell ? 'filled' : ''}`}>
                {cell}
              </div>
            ))}
          </div>

          {game.state === 'IN_PROGRESS' && (
            <div className="ttt-flow-move-info">
              {game.currentTurn?.name}'s turn ({game.currentTurn?.symbol}) — {movesRemaining} move{movesRemaining !== 1 ? 's' : ''} remaining
            </div>
          )}

          {game.state === 'IN_PROGRESS' && (
            <div className="ttt-flow-btn-wrap">
              <button onClick={makeMoveAction} disabled={loading} style={{ padding: '8px 20px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                🎯 Make Move {loading ? '...' : ''}
              </button>
            </div>
          )}
        </div>
      )}

      {step === 5 && (
        <div className="ttt-flow-scene">
          <div className="ttt-flow-players">
            <div className={`ttt-flow-player-card ${game?.currentTurn?.name === 'Xavier (AI)' ? 'active-x' : ''}`}>
              <div className="ttt-flow-player-symbol x">X</div>
              <div>
                <div className="ttt-flow-player-name">Xavier (AI)</div>
              </div>
            </div>
            <div className={`ttt-flow-player-card ${game?.currentTurn?.name === 'Olivia (AI)' ? 'active-o' : ''}`}>
              <div className="ttt-flow-player-symbol o">O</div>
              <div>
                <div className="ttt-flow-player-name">Olivia (AI)</div>
              </div>
            </div>
          </div>

          <div className="ttt-flow-board">
            {board.map((cell, i) => (
              <div key={i} className={`ttt-flow-cell ${cell === 'X' ? 'x' : cell === 'O' ? 'o' : ''} ${cell ? 'filled' : ''}`}>
                {cell}
              </div>
            ))}
          </div>

          <div className="ttt-flow-popup">
            <div className="ttt-flow-result-icon">{winner ? '🏆' : '🤝'}</div>
            <div className={`ttt-flow-result-text ${winner ? 'win' : 'draw'}`}>
              {winner ? `${winner} wins!` : isDraw ? "It's a Draw!" : 'Game Over'}
            </div>
            <div className="ttt-flow-btn-wrap">
              <button onClick={reset} style={{ padding: '8px 20px', background: '#2196f3', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                🔄 New Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TicTacToePage() {
  const [page, setPage] = useState('game');
  const [gameId, setGameId] = useState(null);
  const [player1, setPlayer1] = useState('Player 1');
  const [player2, setPlayer2] = useState('Player 2');

  return (
    <div className="app">
      <style>{styles}</style>
      <Link to="/" className="back-home">← Back to Home</Link>
      <header>
        <h1>Tic Tac Toe</h1>
        <p>Low-Level Design</p>
      </header>
      <nav>
        <button className={page === 'game' ? 'active' : ''} onClick={() => setPage('game')}>Game</button>
        <button className={page === 'simulation' ? 'active' : ''} onClick={() => setPage('simulation')}>Simulation</button>
        <button className={page === 'diagram' ? 'active' : ''} onClick={() => setPage('diagram')}>Class Diagram</button>
        <button className={page === 'design' ? 'active' : ''} onClick={() => setPage('design')}>Design Details</button>
      </nav>
      <main>
        {page === 'game' && (
          <>
            {!gameId ? (
              <div className="setup">
                <h2>New Game</h2>
                <div className="form-group">
                  <label>Player 1 (X)</label>
                  <input value={player1} onChange={(e) => setPlayer1(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Player 2 (O)</label>
                  <input value={player2} onChange={(e) => setPlayer2(e.target.value)} />
                </div>
                <button className="btn-primary" onClick={async () => {
                  const data = await createGame(player1, player2);
                  if (!data.error) setGameId(data.id);
                }}>Start Game</button>
              </div>
            ) : (
              <Game gameId={gameId} player1={player1} player2={player2} onNewGame={() => setGameId(null)} />
            )}
          </>
        )}
        {page === 'simulation' && <AnimatedFlow />}
        {page === 'diagram' && <ClassDiagram module="tictactoe" />}
        {page === 'design' && <DesignDetails module="tictactoe" />}
      </main>
    </div>
  );
}
