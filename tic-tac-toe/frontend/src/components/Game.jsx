import { useState, useEffect, useCallback } from 'react';
import { getGame, makeMove, resetGame } from '../api';

export default function Game({ gameId, player1, player2, onNewGame }) {
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
          <div key={`${r}-${c}`}
               className={`cell ${board[r]?.[c] === 'X' ? 'x' : board[r]?.[c] === 'O' ? 'o' : ''} ${isOver ? 'disabled' : ''}`}
               onClick={() => handleMove(r, c)}>
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
