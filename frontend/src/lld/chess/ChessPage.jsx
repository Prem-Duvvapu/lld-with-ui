import { useState, useEffect, useRef, useCallback } from 'react';
import LldPage from '../../components/LldPage';
import { createGame, getGame, makeMove, getValidMoves, simReset, simMove, simGetEventLog } from './api';

// This page used to be a fully standalone document — its own `*` reset and an unscoped
// `body { background: #1a1a2e }` rule that leaked outside this component's own subtree for as
// long as the page was mounted (the same bug shape issue #53 fixed for snakeladders/minesweeper:
// a page rendering its own header/nav/back-link and manually mounting ClassDiagram/SequenceDiagram/
// DesignDetails instead of the shared LldPage shell). It now runs inside LldPage like every other
// module, which gives it the same 1200px-wide, theme-aware layout, breadcrumb and tab bar as the
// rest of the site.
const s = `
.setup { max-width: 320px; margin: 0 auto; }
.setup h2 { margin-bottom: 16px; color: #e0e0e0; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; margin-bottom: 4px; font-weight: 600; font-size: 14px; color: #aaa; }
.form-group input { width: 100%; padding: 10px; border: 2px solid #444; border-radius: 6px; font-size: 14px; background: #1e1e30; color: #e0e0e0; }
.form-group input:focus { outline: none; border-color: #8b5cf6; }
.btn-primary { width: 100%; padding: 12px; background: #8b5cf6; color: #fff; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; }
.btn-primary:hover { background: #7c3aed; }
.game-header { text-align: center; margin-bottom: 12px; }
.game-header h2 { font-size: 18px; color: #e0e0e0; }
.turn-indicator { font-size: 15px; font-weight: 600; margin: 6px 0; padding: 6px 12px; border-radius: 6px; display: inline-block; }
.turn-white { color: #fff; background: #333; }
.turn-black { color: #333; background: #ccc; }
.chess-board { display: grid; grid-template-columns: repeat(8, 1fr); max-width: 400px; margin: 0 auto 16px; border: 3px solid #555; border-radius: 4px; overflow: hidden; }
.chess-cell { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 28px; cursor: pointer; transition: all 0.15s; user-select: none; }
.chess-cell.light { background: #f0d9b5; }
.chess-cell.dark { background: #b58863; }
.chess-cell.selected { box-shadow: inset 0 0 0 3px #ffd700; }
.chess-cell.valid-move::after { content: ''; width: 12px; height: 12px; border-radius: 50%; background: rgba(0,0,0,0.25); position: absolute; }
.chess-cell.last-move { box-shadow: inset 0 0 0 2px #ff9800; }
.game-status { text-align: center; padding: 8px; border-radius: 6px; margin-bottom: 12px; font-weight: 700; font-size: 14px; }
.status-check { background: #fff3cd; color: #856404; }
.status-checkmate { background: #f8d7da; color: #721c24; }
.status-stalemate { background: #cce5ff; color: #004085; }
.status-active { background: #d4edda; color: #155724; }
.game-actions { display: flex; gap: 8px; justify-content: center; margin-top: 12px; }
.game-actions button { padding: 8px 16px; border: 1px solid #555; border-radius: 6px; background: #333; color: #ccc; cursor: pointer; font-weight: 600; }
.game-actions button:hover { background: #444; }
.game-id { text-align: center; font-size: 12px; color: #666; margin-top: 8px; }
.alert { text-align: center; padding: 32px; color: #888; font-size: 16px; }
.error { margin-top: 12px; padding: 10px; background: #5a1a1a; color: #ff6b6b; border-radius: 6px; font-size: 13px; text-align: center; }
.step-indicator { display: flex; gap: 4px; justify-content: center; margin-bottom: 12px; }
.step-dot { width: 10px; height: 10px; border-radius: 50%; background: #444; transition: all 0.3s; }
.step-dot.active { background: #8b5cf6; box-shadow: 0 0 8px rgba(139,92,246,0.5); }
.step-dot.done { background: #3fb950; }
.scene { background: #1e1e30; border-radius: 12px; padding: 20px; border: 1px solid #444; margin-bottom: 16px; }
.flow-chess-board { display: grid; grid-template-columns: repeat(8, 42px); gap: 0; justify-content: center; margin: 12px auto; border: 2px solid #555; border-radius: 3px; overflow: hidden; }
.flow-cell { width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; font-size: 20px; cursor: default; transition: all 0.2s; }
.flow-cell.light { background: #f0d9b5; }
.flow-cell.dark { background: #b58863; }
.flow-player-info { text-align: center; margin-bottom: 8px; font-size: 13px; color: #aaa; }
.popup { background: #2a2a3e; border: 1px solid #8b5cf6; border-radius: 12px; padding: 20px 28px; text-align: center; margin: 16px auto; max-width: 300px; }
.popup-icon { font-size: 36px; margin-bottom: 6px; }
.popup-text { font-size: 16px; font-weight: 700; color: #e0e0e0; }
.moves-list { font-size: 12px; color: #888; text-align: center; margin-top: 8px; max-height: 80px; overflow-y: auto; }
`;

const UNICODE = {
  'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
  'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟',
};

function Board({ board, selected, validMoves, lastMove, onCellClick, interactive }) {
  return (
    <div className="chess-board">
      {board.map((row, r) => row.map((cell, c) => {
        const isLight = (r + c) % 2 === 0;
        const isSelected = selected && selected[0] === r && selected[1] === c;
        const isValid = validMoves?.some(([vr, vc]) => vr === r && vc === c);
        const isLast = lastMove && ((lastMove.fromRow === r && lastMove.fromCol === c) || (lastMove.toRow === r && lastMove.toCol === c));
        let cls = `chess-cell ${isLight ? 'light' : 'dark'}`;
        if (isSelected) cls += ' selected';
        if (isValid && !cell) cls += ' valid-move';
        if (isLast) cls += ' last-move';
        return (
          <div
            key={`${r}-${c}`}
            className={cls}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={`Square row ${r + 1}, column ${c + 1}${cell ? `, ${UNICODE[cell] ? cell : ''}` : ', empty'}`}
            onClick={() => interactive && onCellClick(r, c)}
            onKeyDown={(e) => { if (interactive && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onCellClick(r, c); } }}
          >
            {cell ? UNICODE[cell] || cell : ''}
          </div>
        );
      }))}
    </div>
  );
}

function GamePanel({ gameId, onNewGame }) {
  const [game, setGame] = useState(null);
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const data = await getGame(gameId);
    if (!data.error) { setGame(data); setSelected(null); setValidMoves([]); }
  }, [gameId]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCellClick = async (row, col) => {
    if (!game || game.status === 'CHECKMATE' || game.status === 'DRAW' || game.status === 'STALEMATE') return;
    const color = game.currentPlayerIndex === 0 ? 'w' : 'b';
    const piece = game.board?.[row]?.[col];
    if (selected) {
      if (selected[0] === row && selected[1] === col) { setSelected(null); setValidMoves([]); return; }
      if (piece && piece[0] === color) { setSelected([row, col]);
        const moves = await getValidMoves(gameId, row, col); if (!moves.error) setValidMoves(moves); return; }
      const data = await makeMove(gameId, selected[0], selected[1], row, col);
      if (data.error) { setError(data.error); setSelected(null); setValidMoves([]); }
      else { setGame(data); setSelected(null); setValidMoves([]); setError(''); }
    } else {
      if (piece && piece[0] === color) {
        setSelected([row, col]);
        const moves = await getValidMoves(gameId, row, col);
        if (!moves.error) setValidMoves(moves);
      }
    }
  };

  if (!game) return <div className="alert">Loading...</div>;

  const status = game.status;
  const lastMove = game.moveHistory?.length > 0 ? game.moveHistory[game.moveHistory.length - 1] : null;

  return (
    <div>
      <div className="game-header">
        <h2>{game.players?.[0]?.name} (White) vs {game.players?.[1]?.name} (Black)</h2>
        <div className={`turn-indicator ${game.currentPlayerIndex === 0 ? 'turn-white' : 'turn-black'}`}>
          {status === 'CHECKMATE' ? `${game.winner} Wins!` : status === 'DRAW' ? 'Draw' : status === 'STALEMATE' ? 'Stalemate' : `${game.players?.[game.currentPlayerIndex]?.name}'s turn`}
        </div>
      </div>
      <div className={`game-status status-${status?.toLowerCase()}`}>
        {status === 'CHECK' ? '⚠ Check!' : status === 'CHECKMATE' ? `👑 Checkmate! ${game.winner} wins!` : status === 'STALEMATE' ? '🤝 Stalemate — Draw' : status === 'ACTIVE' ? 'Game Active' : status}
      </div>
      <Board board={game.board} selected={selected} validMoves={validMoves} lastMove={lastMove} onCellClick={handleCellClick} interactive={true} />
      {error && <div className="error">{error}</div>}
      <div className="game-actions">
        <button onClick={onNewGame}>New Game</button>
      </div>
      <div className="game-id">Game: {game.id}</div>
      <div className="moves-list">Moves: {game.moveHistory?.length || 0}</div>
    </div>
  );
}

// Scripted Scholar's Mate — 4 moves per side, the classic fastest-checkmate demo. Each entry
// drives the isolated /api/chess/sim/move endpoint, which operates on a sandbox game entirely
// separate from any game a visitor creates on the "Game" tab.
const SCRIPTED_MOVES = [
  { from: [6, 4], to: [4, 4], label: '1. e4' },
  { from: [1, 4], to: [3, 4], label: '1... e5' },
  { from: [7, 5], to: [4, 2], label: '2. Bc4' },
  { from: [0, 1], to: [2, 2], label: '2... Nc6' },
  { from: [7, 3], to: [3, 7], label: '3. Qh5' },
  { from: [0, 6], to: [2, 5], label: '3... Nf6??' },
  { from: [3, 7], to: [1, 5], label: '4. Qxf7#' },
];

function AnimatedFlow() {
  const [step, setStep] = useState(0); // 0 = not started, 1 = reset done, 2..8 = moves 1..7 played
  const [game, setGame] = useState(null);
  const [log, setLog] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);
  const totalSteps = SCRIPTED_MOVES.length + 1; // reset + 7 scripted moves

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  const reset = () => { setStep(0); setGame(null); setLog([]); setError(''); };

  const startAction = async () => {
    setLoading(true); setError('');
    try {
      const g = await simReset();
      if (!mountedRef.current) return;
      if (g.error) { setError(g.error); return; }
      setGame(g);
      const events = await simGetEventLog();
      if (!events.error) setLog(events);
      setStep(1);
    } catch { if (mountedRef.current) setError('Failed to reset the sandbox game'); }
    finally { if (mountedRef.current) setLoading(false); }
  };

  const nextMoveAction = async () => {
    const move = SCRIPTED_MOVES[step - 1];
    if (!move) return;
    setLoading(true); setError('');
    try {
      const [fromRow, fromCol] = move.from;
      const [toRow, toCol] = move.to;
      const g = await simMove(fromRow, fromCol, toRow, toCol, move.label);
      if (!mountedRef.current) return;
      if (g.error) { setError(g.error); return; }
      setGame(g);
      const events = await simGetEventLog();
      if (!events.error) setLog(events);
      setStep(step + 1);
    } catch { if (mountedRef.current) setError('Move failed'); }
    finally { if (mountedRef.current) setLoading(false); }
  };

  const isDone = step > SCRIPTED_MOVES.length;
  const isMate = game?.status === 'CHECKMATE';

  return (
    <div>
      <div className="step-indicator">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} />
        ))}
        <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>
          {step === 0 ? 'Not started' : step <= SCRIPTED_MOVES.length ? `Step ${step} / ${totalSteps - 1}` : 'Complete'}
        </span>
      </div>
      {error && <div className="error">{error}<button onClick={reset} style={{ marginLeft: 12, padding: '4px 12px', background: '#444', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#ccc' }}>↺ Reset</button></div>}
      {game && (
        <div className="scene">
          <div className="flow-player-info">{game.players?.[0]?.name} (♔) vs {game.players?.[1]?.name} (♚) — sandbox game, isolated from /api/chess/sim/*</div>
          <div className="flow-chess-board">
            {game.board.map((row, r) => row.map((cell, c) => {
              const isLight = (r + c) % 2 === 0;
              return <div key={`${r}-${c}`} className={`flow-cell ${isLight ? 'light' : 'dark'}`}>{cell ? UNICODE[cell] || cell : ''}</div>;
            }))}
          </div>
          {log.length > 0 && (
            <div className="moves-list">
              {log.map((ev) => (
                <div key={ev.id}>[{ev.actor}] {ev.description} — status: {ev.status}</div>
              ))}
            </div>
          )}
        </div>
      )}
      {step === 0 && (
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button onClick={startAction} disabled={loading} style={{ padding: '12px 32px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            ▶ Reset Sandbox &amp; Start {loading ? '...' : ''}
          </button>
        </div>
      )}
      {step >= 1 && !isDone && (
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button onClick={nextMoveAction} disabled={loading} style={{ padding: '8px 20px', background: '#3fb950', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            ♟️ Play {SCRIPTED_MOVES[step - 1]?.label} {loading ? '...' : ''}
          </button>
        </div>
      )}
      {isDone && isMate && (
        <div className="popup">
          <div className="popup-icon">👑</div>
          <div className="popup-text">Checkmate! {game?.winner} wins!</div>
          <div style={{ marginTop: 10 }}>
            <button onClick={reset} style={{ padding: '8px 20px', background: '#3fb950', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
              🔄 New Simulation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChessPage() {
  const [gameId, setGameId] = useState(null);
  const [playerWhite, setPlayerWhite] = useState('Magnus');
  const [playerBlack, setPlayerBlack] = useState('Hikaru');

  return (
    <LldPage
      module="chess"
      title="Chess"
      icon="♚"
      tabs={[{ id: 'game', label: '🎮 Game' }, 'simulation', 'diagram', 'sequence', 'design']}
    >
      {(tab) => (
        <>
          <style>{s}</style>
          {tab === 'game' && (
            !gameId ? (
              <div className="setup">
                <h2>New Game</h2>
                <div className="form-group">
                  <label>White Player</label>
                  <input value={playerWhite} onChange={(e) => setPlayerWhite(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Black Player</label>
                  <input value={playerBlack} onChange={(e) => setPlayerBlack(e.target.value)} />
                </div>
                <button className="btn-primary" onClick={async () => {
                  const data = await createGame(playerWhite, playerBlack);
                  if (!data.error) setGameId(data.id);
                }}>Start Game</button>
              </div>
            ) : (
              <GamePanel gameId={gameId} onNewGame={() => setGameId(null)} />
            )
          )}
          {tab === 'simulation' && <AnimatedFlow />}
        </>
      )}
    </LldPage>
  );
}
