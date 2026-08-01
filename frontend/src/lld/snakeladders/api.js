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
