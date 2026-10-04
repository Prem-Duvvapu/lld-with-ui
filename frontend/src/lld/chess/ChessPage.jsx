import ChessSimulation from './ChessSimulation';
import { useState, useEffect, useCallback } from 'react';
import LldPage from '../../components/LldPage';
import { createGame, getGame, makeMove, getValidMoves } from './api';

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
          {tab === 'simulation' && <ChessSimulation />}
        </>
      )}
    </LldPage>
  );
}
