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
