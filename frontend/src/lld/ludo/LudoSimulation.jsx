import SimulationControls from '../../components/SimulationControls';
import { useSimulationPlayback } from '../../hooks/useSimulationPlayback';
import { simReset, simGetGame, simGetLog, simGetValidTokens, simRoll, simMove } from './api';
import '../../components/SimulationPanel.css';
import '../../components/GameSimulation.css';

const STEPS = [
  { title: 'Create a sandbox game', detail: 'Four players start with every token at home. Live games are untouched.' },
  { title: 'Inspect the starting board', detail: 'The backend provides the board, turn, and legal token choices.' },
  ...[1, 2, 3].flatMap(turn => [
    { title: `Roll ${turn}`, detail: 'The server rolls a random die. If no token can move, it passes the turn automatically.' },
    { title: `Resolve roll ${turn}`, detail: 'Move the first server-approved token, or inspect the automatically passed turn. A capture or six is not guaranteed.' },
  ]),
  { title: 'Review the game', detail: 'Inspect the final snapshot and event log, then continue playing in the sandbox.' },
];

async function snapshot(game) {
  const [events, validTokens] = await Promise.all([simGetLog(), simGetValidTokens()]);
  return { game, events, validTokens };
}

async function executeStep(index, previous) {
  if (index === 0) return snapshot(await simReset());
  if (index >= 2 && index <= 7 && previous.game.status !== 'FINISHED') {
    if (index % 2 === 0) return snapshot(await simRoll());
    if (previous.game.diceValue > 0) {
      if (!previous.validTokens.length) throw new Error('No legal token was returned for the pending roll.');
      return snapshot(await simMove(previous.game.currentPlayerIndex, previous.validTokens[0]));
    }
  }
  return snapshot(await simGetGame());
}

export default function LudoSimulation({ Board }) {
  const playback = useSimulationPlayback(STEPS.length, executeStep);
  const { game, events = [], validTokens = [] } = playback.result || {};
  const currentPlayer = game?.players[game.currentPlayerIndex];
  return (
    <div className="simulation-panel game-simulation">
      <p className="simulation-panel-note">Random dice, real rules. This guide uses only the isolated Ludo sandbox; it does not promise a capture or a win.</p>
      <SimulationControls steps={STEPS} playback={playback} />
      {!game && <p className="simulation-panel-note">Start the guide to create a game. No requests run until you start.</p>}
      {game && <>
        <section className="simulation-panel-card" aria-label="Ludo sandbox state">
          <h3>{game.status === 'FINISHED' ? `${game.winner} wins` : `${currentPlayer.name}'s turn`}</h3>
          <p>{game.diceValue > 0 ? `Pending roll: ${game.diceValue}. Choose a legal token before rolling again.` : 'No pending roll. The next action is a dice roll.'}</p>
          <div aria-hidden="true"><Board game={game} selectable={false} diceLabel={game.status === 'FINISHED' ? 'Win' : game.diceValue || '—'} /></div>
          <div className="simulation-panel-grid">
            {game.players.map((player, playerIndex) => <div key={playerIndex}>
              <h4>{player.name} · {player.color}</h4>
              <dl>{game.tokens[playerIndex].map((token, tokenIndex) => <div key={tokenIndex}>
                <dt>Token {tokenIndex + 1}</dt><dd>{token.status}{token.status === 'ACTIVE' ? ` · track ${token.position}` : ''}</dd>
              </div>)}</dl>
            </div>)}
          </div>
        </section>
        {playback.done && game.status !== 'FINISHED' && <fieldset className="game-simulation-actions" disabled={playback.busy || Boolean(playback.error)}>
          <legend>Continue sandbox play</legend>
          <p>Choose from the backend's legal moves. Your guided progress stays complete.</p>
          <button type="button" disabled={game.diceValue > 0} onClick={() => playback.runAction(async () => snapshot(await simRoll()))}>Roll sandbox dice</button>
          {validTokens.map(tokenIndex => <button type="button" key={tokenIndex} onClick={() => playback.runAction(async current => snapshot(await simMove(current.game.currentPlayerIndex, tokenIndex)))}>Move token {tokenIndex + 1}</button>)}
        </fieldset>}
        <details className="simulation-panel-card">
          <summary>Sandbox event log · {events.length} events</summary>
          <ol>{events.map(event => <li key={event.id}><strong>{event.actor}</strong>: {event.description}</li>)}</ol>
        </details>
      </>}
    </div>
  );
}
