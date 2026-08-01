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