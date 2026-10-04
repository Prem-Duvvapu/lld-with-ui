import SimulationControls from '../../components/SimulationControls';
import { useSimulationPlayback } from '../../hooks/useSimulationPlayback';
import { simReset, simRoll, simGetGame, simGetLog } from './api';
import '../../components/SimulationPanel.css';
import '../../components/GameSimulation.css';

const STEPS = [
  { title: 'Create a sandbox game', detail: 'Players begin at cell 0, just outside the board. Live games are untouched.' },
  ...Array.from({ length: 6 }, (_, index) => ({ title: `Roll ${index + 1}`, detail: 'The server rolls the die and resolves snakes, ladders, overshoots, and the next turn. Winning is not guaranteed in this guide.' })),
  { title: 'Review the board', detail: 'Read the final positions and event log, then keep playing in the sandbox if the game is still running.' },
];
const COLORS = ['#b91c1c', '#1d4ed8', '#7e22ce', '#047857'];

function coordinates(cell) {
  const row = Math.floor((cell - 1) / 10);
  const column = (cell - 1) % 10;
  return { x: (row % 2 ? 9 - column : column) * 50 + 25, y: (9 - row) * 50 + 25 };
}

async function snapshot(game) {
  return { game, events: await simGetLog() };
}

async function executeStep(index, previous) {
  if (index === 0) return snapshot(await simReset());
  if (index <= 6 && previous.game.state !== 'FINISHED') return snapshot(await simRoll());
  return snapshot(await simGetGame());
}

export default function SnakeLaddersSimulation() {
  const playback = useSimulationPlayback(STEPS.length, executeStep);
  const { game, events = [] } = playback.result || {};
  return (
    <div className="simulation-panel game-simulation">
      <p className="simulation-panel-note">Six random rolls, not a scripted win. The board and movement rules come from the isolated Snakes &amp; Ladders backend.</p>
      <SimulationControls steps={STEPS} playback={playback} />
      {!game && <p className="simulation-panel-note">Start to load the real sandbox board. No game is created automatically.</p>}
      {game && <>
        <section className="simulation-panel-card" aria-label="Snakes and Ladders sandbox state">
          <h3>{game.state === 'FINISHED' ? `${game.winner.name} wins` : `${game.players[game.currentPlayerIndex].name}'s turn`}</h3>
          <p>Last roll: {game.lastDiceValue || 'Not rolled'} · Status: {game.state}</p>
          <p>{game.lastMessage}</p>
          <svg className="game-simulation-ladders" viewBox="0 0 500 500" aria-hidden="true">
            {Array.from({ length: 100 }, (_, index) => {
              const cell = index + 1;
              const { x, y } = coordinates(cell);
              return <g key={cell}><rect x={x - 25} y={y - 25} width="50" height="50" className={cell % 2 ? 'odd' : 'even'} /><text x={x - 20} y={y - 11}>{cell}</text></g>;
            })}
            {[['snake', game.snakes], ['ladder', game.ladders]].flatMap(([kind, connections]) => Object.entries(connections).map(([start, end]) => {
              const from = coordinates(Number(start));
              const to = coordinates(end);
              return <g key={`${kind}-${start}`} className={`game-simulation-${kind}`}><path d={`M ${from.x} ${from.y} Q 250 ${(from.y + to.y) / 2} ${to.x} ${to.y}`} /><circle cx={from.x} cy={from.y} r="5" /><circle cx={to.x} cy={to.y} r="3" /></g>;
            }))}
            {game.players.map((player, playerIndex) => {
              if (player.position === 0) return null;
              const { x, y } = coordinates(player.position);
              const offset = (playerIndex - (game.players.length - 1) / 2) * 16;
              return <g key={playerIndex}><circle cx={x + offset} cy={y + 10} r="10" fill={COLORS[playerIndex % COLORS.length]} stroke="white" strokeWidth="2" /><text x={x + offset} y={y + 14} textAnchor="middle" className="game-simulation-token-label">{playerIndex + 1}</text></g>;
            })}
          </svg>
          <p>Red curves: snakes descend. Green dashed curves: ladders climb. Numbered tokens match the players below; cell 0 is off the board.</p>
          <dl>{game.players.map((player, playerIndex) => <div key={playerIndex}><dt>Token {playerIndex + 1} · {player.name}</dt><dd>Cell {player.position}{player.position === 0 ? ' · waiting to enter' : ''}</dd></div>)}</dl>
          <details><summary>Board connections</summary><p>Snakes: {Object.entries(game.snakes).map(([from, to]) => `${from} → ${to}`).join(', ')}</p><p>Ladders: {Object.entries(game.ladders).map(([from, to]) => `${from} → ${to}`).join(', ')}</p></details>
        </section>
        {playback.done && game.state !== 'FINISHED' && <fieldset className="game-simulation-actions" disabled={playback.busy || Boolean(playback.error)}>
          <legend>Continue sandbox play</legend>
          <p>Keep rolling until someone wins. The backend decides every move.</p>
          <button type="button" onClick={() => playback.runAction(async () => snapshot(await simRoll()))}>Roll sandbox dice</button>
        </fieldset>}
        <details className="simulation-panel-card">
          <summary>Sandbox event log · {events.length} events</summary>
          <ol>{events.map(event => <li key={event.id}><strong>{event.actor}</strong>: {event.description}</li>)}</ol>
        </details>
      </>}
    </div>
  );
}
