// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RateLimiterPage from '../lld/rate-limiter/RateLimiterPage';
import ThreadPoolPage from '../lld/thread-pool/ThreadPoolPage';
import TicTacToePage from '../lld/tictactoe/TicTacToePage';
import * as rate from '../lld/rate-limiter/api';
import * as pool from '../lld/thread-pool/api';
import * as game from '../lld/tictactoe/api';

vi.mock('../components/LldPage', () => ({ default: ({ children }) => children('simulation') }));
vi.mock('../lld/rate-limiter/api');
vi.mock('../lld/thread-pool/api');
vi.mock('../lld/tictactoe/api');

beforeEach(() => {
  vi.resetAllMocks();
  for (const api of [rate, pool, game]) {
    for (const method of Object.values(api)) if (vi.isMockFunction(method)) method.mockResolvedValue({});
  }
});

async function advance(completed) {
  fireEvent.click(screen.getByRole('button', { name: completed === 1 ? 'Start simulation' : 'Next step' }));
  await waitFor(() => expect(screen.getByRole('progressbar').getAttribute('value')).toBe(String(completed)));
}

describe('Shared controls drive isolated backend simulations', () => {
  it('executes the rate-limiter summary instead of stopping one step early', async () => {
    render(<RateLimiterPage />);
    for (let completed = 1; completed <= 8; completed++) await advance(completed);
    expect(rate.simReset).toHaveBeenCalledTimes(1);
    expect(rate.simSendRequest).toHaveBeenCalledTimes(5);
    expect(rate.simAdvanceClock).toHaveBeenCalledWith(2, 6);
    expect(rate.simGetSnapshot).toHaveBeenCalledTimes(1);
    expect(rate.attemptRequest).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Next step' }).disabled).toBe(true);
  });

  it('executes the thread-pool summary and resets for another run', async () => {
    render(<ThreadPoolPage />);
    for (let completed = 1; completed <= 9; completed++) await advance(completed);
    expect(pool.simSubmit).toHaveBeenCalledTimes(5);
    expect(pool.simRelease).toHaveBeenCalledWith(7);
    expect(pool.simShutdown).toHaveBeenCalledWith(8);
    expect(pool.simGetSnapshot).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Reset sandbox' }));
    await waitFor(() => expect(screen.getByRole('progressbar').getAttribute('value')).toBe('1'));
    expect(pool.simReset).toHaveBeenCalledTimes(2);
  });

  it('initializes Tic Tac Toe before moves, then completes undo and reset', async () => {
    render(<TicTacToePage />);
    for (let completed = 1; completed <= 8; completed++) await advance(completed);
    expect(game.simReset).toHaveBeenCalledTimes(2);
    expect(game.simMove.mock.calls.map(call => call.slice(0, 2))).toEqual([[0, 0], [1, 1], [0, 1], [2, 2], [0, 2]]);
    expect(game.simUndo).toHaveBeenCalledTimes(1);
    expect(game.createGame).not.toHaveBeenCalled();
    expect(game.makeMove).not.toHaveBeenCalled();
  });
});
