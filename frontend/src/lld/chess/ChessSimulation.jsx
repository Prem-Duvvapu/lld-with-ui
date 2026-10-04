import SimulationControls from '../../components/SimulationControls';
import { useSimulationPlayback } from '../../hooks/useSimulationPlayback';
import { simReset, simGetGame, simMove, simGetEventLog } from './api';
import '../../components/SimulationPanel.css';
import '../../components/GameSimulation.css';

const MOVES = [
  { from: [6, 4], to: [4, 4], title: '1. e4', detail: 'White opens the diagonal for the queen and bishop.' },
  { from: [1, 4], to: [3, 4], title: '1… e5', detail: 'Black responds in the center.' },
  { from: [7, 5], to: [4, 2], title: '2. Bc4', detail: 'The white bishop targets the f7 pawn.' },
  { from: [0, 1], to: [2, 2], title: '2… Nc6', detail: 'Black develops the queenside knight.' },
  { from: [7, 3], to: [3, 7], title: '3. Qh5', detail: 'Queen and bishop now both target f7.' },
  { from: [0, 6], to: [2, 5], title: '3… Nf6??', detail: 'This scripted mistake leaves f7 unprotected against mate.' },
  { from: [3, 7], to: [1, 5], title: '4. Qxf7#', detail: 'The backend validates the capture and determines checkmate.' },
];
const STEPS = [
  { title: 'Create a sandbox game', detail: 'Replay Scholar’s Mate in a separate game, not your live match.' },
  ...MOVES,
  { title: 'Review checkmate', detail: 'Read the final board, winner, and move log from the backend.' },
];
const SYMBOLS = { wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙', bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟' };
const NAMES = { K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight', P: 'pawn' };

async function executeStep(index, previous) {
  let game;
  if (index === 0) game = await simReset();
  else if (index <= MOVES.length) {
    const move = MOVES[index - 1];
    game = await simMove(...move.from, ...move.to, move.title);
  } else game = await simGetGame();
  const events = await simGetEventLog();
  return { game, events, move: MOVES[index - 1] || previous?.move || null };
}

export default function ChessSimulation() {
  const playback = useSimulationPlayback(STEPS.length, executeStep);
  const { game, events = [], move } = playback.result || {};
  return (
    <div className="simulation-panel game-simulation">
      <p className="simulation-panel-note">A seven-move Scholar’s Mate walkthrough. Every move is validated by the isolated chess engine; live matches are untouched.</p>
      <SimulationControls steps={STEPS} playback={playback} />
      {!game && <p className="simulation-panel-note">Start to load the board. Play automatically, or inspect each move with Next step.</p>}
      {game && <>
        <section className="simulation-panel-card" aria-label="Chess sandbox state">
          <h3>{game.status === 'CHECKMATE' ? `Checkmate! ${game.winner} wins` : `${game.players[game.currentPlayerIndex].name}'s turn`}</h3>
          <p>{game.players[0].name} (White) vs {game.players[1].name} (Black) · Status: {game.status} · {game.moveHistory.length} moves</p>
          {move && <p>Last guided move: <strong>{move.title}</strong>. Highlighted squares show its origin and destination.</p>}
          <div className="game-simulation-chess" role="group" aria-label="Chess board, rank 8 at the top">
            {game.board.flatMap((rank, rowIndex) => rank.map((piece, columnIndex) => {
              const square = `${'abcdefgh'[columnIndex]}${8 - rowIndex}`;
              const highlighted = move && [move.from, move.to].some(([moveRow, moveColumn]) => moveRow === rowIndex && moveColumn === columnIndex);
              const pieceName = piece ? `${piece[0] === 'w' ? 'White' : 'Black'} ${NAMES[piece[1]]}` : 'empty';
              return <div key={square} className={`game-simulation-square ${(rowIndex + columnIndex) % 2 ? 'dark' : 'light'} ${highlighted ? 'highlighted' : ''}`} role="img" aria-label={`${square}: ${pieceName}`}>
                <span className="game-simulation-coordinate" aria-hidden="true">{square}</span>
                <span aria-hidden="true">{SYMBOLS[piece] || ''}</span>
              </div>;
            }))}
          </div>
          <p>White pieces are outlined; Black pieces are filled. Square labels identify every location without relying on color.</p>
        </section>
        <details className="simulation-panel-card">
          <summary>Sandbox move log · {events.length} events</summary>
          <ol>{events.map(event => <li key={event.id}><strong>{event.actor}</strong>: {event.description} · {event.status}</li>)}</ol>
        </details>
      </>}
    </div>
  );
}
