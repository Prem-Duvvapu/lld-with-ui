import { apiFetch } from '../../utils/api';

export function createGame(rows = 9, cols = 9, mines = 10) {
  return apiFetch('/minesweeper/games', {
    method: 'POST',
    body: JSON.stringify({ rows, cols, mines })
  });
}

export function getGame(gameId) {
  return apiFetch(`/minesweeper/games/${gameId}`);
}

export function revealCell(gameId, row, col) {
  return apiFetch(`/minesweeper/games/${gameId}/reveal`, {
    method: 'POST',
    body: JSON.stringify({ row, col })
  });
}

export function flagCell(gameId, row, col) {
  return apiFetch(`/minesweeper/games/${gameId}/flag`, {
    method: 'POST',
    body: JSON.stringify({ row, col })
  });
}

// --- ISOLATED SIMULATION TAB ENGINE (separate in-memory game — never touches real matches) ---

export function simReset() {
  return apiFetch('/minesweeper/sim/reset', { method: 'POST' });
}

export function simGetGame() {
  return apiFetch('/minesweeper/sim/game');
}

export function simGetLog() {
  return apiFetch('/minesweeper/sim/log');
}

export function simReveal(row, col) {
  return apiFetch('/minesweeper/sim/reveal', {
    method: 'POST',
    body: JSON.stringify({ row, col })
  });
}

export function simFlag(row, col) {
  return apiFetch('/minesweeper/sim/flag', {
    method: 'POST',
    body: JSON.stringify({ row, col })
  });
}
