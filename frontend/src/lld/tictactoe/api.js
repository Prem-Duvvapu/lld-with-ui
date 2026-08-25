import { apiFetch } from '../../utils/api';

export function createGame(player1, player2) {
  return apiFetch('/tictactoe/games', {
    method: 'POST',
    body: JSON.stringify({ player1, player2 }),
  });
}

export function getGame(id) {
  return apiFetch(`/tictactoe/games/${id}`);
}

export function makeMove(gameId, row, col, playerName) {
  return apiFetch(`/tictactoe/games/${gameId}/move`, {
    method: 'POST',
    body: JSON.stringify({ row, col, playerName }),
  });
}

export function undoMove(gameId) {
  return apiFetch(`/tictactoe/games/${gameId}/undo`, {
    method: 'POST',
  });
}

export function resetGame(gameId) {
  return apiFetch(`/tictactoe/games/${gameId}/reset`, {
    method: 'POST',
  });
}

// --- ISOLATED SIMULATION TAB ENGINE (separate in-memory game — never touches real matches) ---

export function simReset() {
  return apiFetch('/tictactoe/sim/reset', { method: 'POST' });
}

export function simGetGame() {
  return apiFetch('/tictactoe/sim/game');
}

export function simGetLog() {
  return apiFetch('/tictactoe/sim/log');
}

export function simMove(row, col, description) {
  return apiFetch('/tictactoe/sim/move', {
    method: 'POST',
    body: JSON.stringify({ row, col, description }),
  });
}

export function simUndo() {
  return apiFetch('/tictactoe/sim/undo', { method: 'POST' });
}
