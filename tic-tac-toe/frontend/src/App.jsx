import { useState } from 'react';
import { createGame } from './api';
import Game from './components/Game';
import './App.css';

export default function App() {
  const [gameId, setGameId] = useState(null);
  const [player1, setPlayer1] = useState('Player 1');
  const [player2, setPlayer2] = useState('Player 2');

  return (
    <div className="app">
      <header>
        <h1>Tic Tac Toe</h1>
        <p>Low-Level Design</p>
      </header>
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
          <Game gameId={gameId} player1={player1} player2={player2}
                onNewGame={() => setGameId(null)} />
        )}
      </main>
    </div>
  );
}
