import { useState } from 'react';
import { createGame } from './api';
import GameBoard from './components/GameBoard';
import './App.css';

export default function App() {
  const [gameId, setGameId] = useState(null);
  const [players, setPlayers] = useState(['Player 1', 'Player 2']);

  return (
    <div className="app">
      <header>
        <h1>Snake & Ladders</h1>
        <p>Low-Level Design</p>
      </header>
      <main>
        {!gameId ? (
          <div className="setup">
            <h2>New Game</h2>
            {players.map((p, i) => (
              <div key={i} className="form-group">
                <label>Player {i + 1}</label>
                <input value={p} onChange={(e) => {
                  const next = [...players];
                  next[i] = e.target.value;
                  setPlayers(next);
                }} />
              </div>
            ))}
            <button className="btn-primary" onClick={async () => {
              const data = await createGame(players);
              if (!data.error) setGameId(data.id);
            }}>Start Game</button>
          </div>
        ) : (
          <GameBoard gameId={gameId} players={players} onNewGame={() => setGameId(null)} />
        )}
      </main>
    </div>
  );
}
