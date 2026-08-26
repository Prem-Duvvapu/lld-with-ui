import { apiFetch } from '../../utils/api';

export function createGame(players) {
  return apiFetch('/ludo/games', {
    method: 'POST',
    body: JSON.stringify({ players }),
  });
}

export function getGame(id) {
  return apiFetch(`/ludo/games/${id}`);
}

export function rollDice(gameId) {
  return apiFetch(`/ludo/games/${gameId}/roll`, { method: 'POST' });
}

export function moveToken(gameId, playerIndex, tokenIndex) {
  return apiFetch(`/ludo/games/${gameId}/move`, {
    method: 'POST',
    body: JSON.stringify({ playerIndex, tokenIndex }),
  });
}

// =========================================================================
// ISOLATED SIMULATION ENGINE (/api/ludo/sim/*) — a separate sandbox instance,
// so replaying the demo can never corrupt a real game.
// =========================================================================

export function simReset() {
  return apiFetch('/ludo/sim/reset', { method: 'POST' });
}

export function simGetGame() {
  return apiFetch('/ludo/sim/game');
}

export function simGetLog() {
  return apiFetch('/ludo/sim/log');
}

export function simRoll() {
  return apiFetch('/ludo/sim/roll', { method: 'POST' });
}

export function simMove(playerIndex, tokenIndex) {
  return apiFetch('/ludo/sim/move', {
    method: 'POST',
    body: JSON.stringify({ playerIndex, tokenIndex }),
  });
}
