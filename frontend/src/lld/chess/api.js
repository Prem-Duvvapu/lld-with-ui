import { apiFetch } from '../../utils/api';

export function createGame(playerWhite, playerBlack) {
  return apiFetch('/chess/games', {
    method: 'POST',
    body: JSON.stringify({ playerWhite, playerBlack }),
  });
}

export function getGame(id) {
  return apiFetch(`/chess/games/${id}`);
}

export function makeMove(gameId, fromRow, fromCol, toRow, toCol) {
  return apiFetch(`/chess/games/${gameId}/move`, {
    method: 'POST',
    body: JSON.stringify({ fromRow, fromCol, toRow, toCol }),
  });
}

export function getValidMoves(gameId, row, col) {
  return apiFetch(`/chess/games/${gameId}/valid-moves?row=${row}&col=${col}`);
}