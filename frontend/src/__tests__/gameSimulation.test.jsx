// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import LudoSimulation from '../lld/ludo/LudoSimulation';
import ChessSimulation from '../lld/chess/ChessSimulation';
import SnakeLaddersSimulation from '../lld/snakeladders/SnakeLaddersSimulation';
import * as ludo from '../lld/ludo/api';
import * as chess from '../lld/chess/api';
import * as ladders from '../lld/snakeladders/api';

vi.mock('../lld/ludo/api');
vi.mock('../lld/chess/api');
vi.mock('../lld/snakeladders/api');

function StaticBoard() { return <div>Static board</div>; }

beforeEach(() => {
  vi.resetAllMocks();
  let ludoGame;
  let ludoRolls = 0;
  ludo.simReset.mockImplementation(async () => {
    ludoRolls = 0;
    ludoGame = { id: 42, currentPlayerIndex: 0, diceValue: 0, status: 'PLAYING', players: ['Alice', 'Bob', 'Charlie', 'Diana'].map((name, index) => ({ name, color: ['RED', 'GREEN', 'BLUE', 'YELLOW'][index] })), tokens: Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => ({ status: 'HOME', position: -1 }))) };
    return structuredClone(ludoGame);
  });
  ludo.simGetGame.mockImplementation(async () => structuredClone(ludoGame));
  ludo.simGetLog.mockResolvedValue([{ id: 1, actor: 'Server', description: 'Server event' }]);
  ludo.simGetValidTokens.mockImplementation(async () => ludoGame.diceValue ? [2] : []);
  ludo.simRoll.mockImplementation(async () => {
    if (++ludoRolls === 1) ludoGame.currentPlayerIndex = 1;
    else ludoGame.diceValue = 6;
    return structuredClone(ludoGame);
  });
  ludo.simMove.mockImplementation(async (playerIndex, tokenIndex) => {
    ludoGame.tokens[playerIndex][tokenIndex] = { status: 'ACTIVE', position: 0 };
    ludoGame.diceValue = 0;
    return structuredClone(ludoGame);
  });

  let chessGame;
  chess.simReset.mockImplementation(async () => {
    chessGame = { board: Array.from({ length: 8 }, () => Array(8).fill(null)), players: [{ name: 'Magnus' }, { name: 'Hikaru' }], currentPlayerIndex: 0, moveHistory: [], status: 'ACTIVE', winner: null };
    chessGame.board[6][4] = 'wP';
    return structuredClone(chessGame);
  });
  chess.simMove.mockImplementation(async (fromRow, fromColumn, toRow, toColumn, description) => {
    chessGame.board[toRow][toColumn] = chessGame.board[fromRow][fromColumn];
    chessGame.board[fromRow][fromColumn] = null;
    chessGame.moveHistory.push(description);
    chessGame.currentPlayerIndex = (chessGame.currentPlayerIndex + 1) % 2;
    if (chessGame.moveHistory.length === 7) { chessGame.status = 'CHECKMATE'; chessGame.winner = 'Magnus'; }
    return structuredClone(chessGame);
  });
  chess.simGetGame.mockImplementation(async () => structuredClone(chessGame));
  chess.simGetEventLog.mockResolvedValue([{ id: 1, actor: 'Magnus', description: 'Server move', status: 'ACTIVE' }]);

  let laddersGame;
  ladders.simReset.mockImplementation(async () => {
    laddersGame = { players: [{ name: 'Alice', position: 0 }, { name: 'Bob', position: 0 }], currentPlayerIndex: 0, state: 'IN_PROGRESS', lastDiceValue: 0, lastMessage: 'Game started', snakes: { 94: 17 }, ladders: { 3: 46 } };
    return structuredClone(laddersGame);
  });
  ladders.simRoll.mockImplementation(async () => {
    laddersGame.lastDiceValue = 3;
    laddersGame.lastMessage = 'Server resolved this roll';
    laddersGame.players[laddersGame.currentPlayerIndex].position = 46;
    laddersGame.currentPlayerIndex = (laddersGame.currentPlayerIndex + 1) % 2;
    return structuredClone(laddersGame);
  });
  ladders.simGetGame.mockImplementation(async () => structuredClone(laddersGame));
  ladders.simGetLog.mockResolvedValue([{ id: 1, actor: 'Alice', description: 'Actual server actor' }]);
});

async function advance(total) {
  for (let index = 0; index < total; index++) {
    fireEvent.click(screen.getByRole('button', { name: index === 0 ? 'Start simulation' : 'Next step' }));
    await waitFor(() => expect(screen.getByRole('progressbar').value).toBe(index + 1));
  }
}

describe('Ludo guided playback', () => {
  it('waits for explicit start, handles a passed turn, and chooses the server-approved token', async () => {
    render(<LudoSimulation Board={StaticBoard} />);
    expect(ludo.simReset).not.toHaveBeenCalled();
    await advance(9);
    expect(ludo.simRoll).toHaveBeenCalledTimes(3);
    expect(ludo.simMove.mock.calls).toEqual([[1, 2], [1, 2]]);
    expect(screen.getByText('ACTIVE · track 0')).toBeTruthy();
    expect(ludo.createGame).not.toHaveBeenCalled();
    expect(ludo.moveToken).not.toHaveBeenCalled();
    expect(ludo.rollDice).not.toHaveBeenCalled();
  });

  it('allows only legal token buttons after the guide and keeps progress complete', async () => {
    render(<LudoSimulation Board={StaticBoard} />);
    await advance(9);
    fireEvent.click(screen.getByRole('button', { name: 'Roll sandbox dice' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Move token 3' })).toBeTruthy());
    expect(screen.queryByRole('button', { name: 'Move token 1' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Roll sandbox dice' }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Move token 3' }));
    await waitFor(() => expect(ludo.simMove).toHaveBeenCalledTimes(3));
    expect(screen.getByRole('progressbar').value).toBe(9);
  });

  it('requires reset after a committed action loses its event-log response', async () => {
    render(<LudoSimulation Board={StaticBoard} />);
    await advance(2);
    ludo.simGetLog.mockRejectedValueOnce(new Error('Event log unavailable'));
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Event log unavailable'));
    expect(screen.getByRole('progressbar').value).toBe(2);
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(ludo.simRoll).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Reset sandbox' }));
    await waitFor(() => expect(screen.getByRole('progressbar').value).toBe(1));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('stops safely if the server returns no legal choice for a pending roll', async () => {
    render(<LudoSimulation Board={StaticBoard} />);
    await advance(4);
    ludo.simGetValidTokens.mockResolvedValueOnce([]);
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    await waitFor(() => expect(screen.getByRole('progressbar').value).toBe(5));
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('No legal token'));
    expect(ludo.simMove).not.toHaveBeenCalled();
  });
});

describe('Chess guided playback', () => {
  it('plays exactly seven moves, reads the final state, and exposes labelled squares', async () => {
    render(<ChessSimulation />);
    expect(chess.simReset).not.toHaveBeenCalled();
    await advance(1);
    expect(screen.getByRole('img', { name: 'e2: White pawn' })).toBeTruthy();
    for (let index = 1; index < 9; index++) {
      fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
      await waitFor(() => expect(screen.getByRole('progressbar').value).toBe(index + 1));
    }
    expect(chess.simMove.mock.calls.map(call => call.slice(0, 4))).toEqual([[6, 4, 4, 4], [1, 4, 3, 4], [7, 5, 4, 2], [0, 1, 2, 2], [7, 3, 3, 7], [0, 6, 2, 5], [3, 7, 1, 5]]);
    expect(chess.simGetGame).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Checkmate! Magnus wins')).toBeTruthy();
    expect(screen.getAllByRole('img')).toHaveLength(64);
    expect(chess.makeMove).not.toHaveBeenCalled();
  });

  it('keeps the last committed board and preserves errors without retrying moves', async () => {
    render(<ChessSimulation />);
    await advance(1);
    chess.simMove.mockRejectedValueOnce(new Error('Move rejected by chess engine'));
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Move rejected by chess engine'));
    expect(screen.getByRole('img', { name: 'e2: White pawn' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(chess.simMove).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Reset sandbox' }));
    await waitFor(() => expect(chess.simReset).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });
});

describe('Snakes and Ladders guided playback', () => {
  it('displays cell zero and backend board connections, then supports guarded free play', async () => {
    render(<SnakeLaddersSimulation />);
    expect(ladders.simReset).not.toHaveBeenCalled();
    await advance(1);
    expect(screen.getAllByText('Cell 0 · waiting to enter')).toHaveLength(2);
    expect(screen.getByText('Snakes: 94 → 17')).toBeTruthy();
    expect(screen.getByText('Ladders: 3 → 46')).toBeTruthy();
    for (let index = 1; index < 8; index++) {
      fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
      await waitFor(() => expect(screen.getByRole('progressbar').value).toBe(index + 1));
    }
    expect(ladders.simRoll).toHaveBeenCalledTimes(6);
    expect(ladders.simGetGame).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Server resolved this roll')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Roll sandbox dice' }));
    await waitFor(() => expect(ladders.simRoll).toHaveBeenCalledTimes(7));
    expect(screen.getByRole('progressbar').value).toBe(8);
    expect(ladders.rollDice).not.toHaveBeenCalled();
  });

  it('does not roll a finished game and uses the actual winning actor', async () => {
    ladders.simRoll.mockResolvedValue({ players: [{ name: 'Alice', position: 100 }, { name: 'Bob', position: 0 }], currentPlayerIndex: 0, state: 'FINISHED', winner: { name: 'Alice' }, lastDiceValue: 1, lastMessage: 'Alice wins on the exact count', snakes: {}, ladders: {} });
    ladders.simGetGame.mockImplementation(async () => ladders.simRoll.mock.results[0].value);
    render(<SnakeLaddersSimulation />);
    await advance(8);
    expect(ladders.simRoll).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Alice wins')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Roll sandbox dice' })).toBeNull();
    const log = screen.getByText('Sandbox event log · 1 events').parentElement;
    expect(within(log).getByText('Alice')).toBeTruthy();
  });

  it('blocks duplicate roll requests and requires reset after a transport error', async () => {
    let rejectRoll;
    ladders.simRoll.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectRoll = reject; }));
    render(<SnakeLaddersSimulation />);
    await advance(1);
    const next = screen.getByRole('button', { name: 'Next step' });
    fireEvent.click(next);
    fireEvent.click(next);
    expect(ladders.simRoll).toHaveBeenCalledTimes(1);
    rejectRoll(new Error('Network disconnected'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Network disconnected'));
    expect(next.disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Reset sandbox' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(screen.getAllByText('Cell 0 · waiting to enter')).toHaveLength(2);
  });
});
