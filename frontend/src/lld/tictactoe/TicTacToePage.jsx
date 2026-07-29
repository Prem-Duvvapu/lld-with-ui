import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createGame, getGame, makeMove, resetGame } from './api';
import ClassDiagram from '../../components/ClassDiagram';

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

export default function TicTacToePage() {
  const [gameId, setGameId] = useState(null);
  const [player1, setPlayer1] = useState('Player 1');
  const [player2, setPlayer2] = useState('Player 2');
  const [showDiagram, setShowDiagram] = useState(false);

  return (
    <div className="app">
      <style>{styles}</style>
      <Link to="/" className="back-home">← Back to Home</Link>
      <header>
        <h1>Tic Tac Toe</h1>
        <p>Low-Level Design</p>
        <button onClick={() => setShowDiagram(!showDiagram)} style={{ marginTop: 8, padding: '6px 14px', border: '1px solid #333', borderRadius: 6, background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          {showDiagram ? 'Back to Game' : '📐 Class Diagram'}
        </button>
      </header>
      {showDiagram ? (
        <main><ClassDiagram module="tictactoe" /></main>
      ) : (
      <main>
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
      </main>
      )}
    </div>
  );
}
