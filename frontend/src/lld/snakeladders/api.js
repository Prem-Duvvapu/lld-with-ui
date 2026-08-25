import { apiFetch } from '../../utils/api';

export function createGame(players) {
  return apiFetch('/snakeladders/games', {
    method: 'POST',
    body: JSON.stringify({ players }),
  });
}

export function getGame(id) {
  return apiFetch(`/snakeladders/games/${id}`);
}

export function rollDice(gameId) {
  return apiFetch(`/snakeladders/games/${gameId}/roll`, {
    method: 'POST',
  });
}

// --- ISOLATED SIMULATION TAB ENGINE (separate in-memory game — never touches real matches) ---

export function simReset() {
  return apiFetch('/snakeladders/sim/reset', { method: 'POST' });
}

export function simGetGame() {
  return apiFetch('/snakeladders/sim/game');
}

export function simGetLog() {
  return apiFetch('/snakeladders/sim/log');
}

export function simRoll() {
  return apiFetch('/snakeladders/sim/roll', { method: 'POST' });
}
