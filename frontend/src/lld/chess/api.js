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

export function makeMove(gameId, fromRow, fromCol, toRow, toCol, promotion) {
  return apiFetch(`/chess/games/${gameId}/move`, {
    method: 'POST',
    body: JSON.stringify({ fromRow, fromCol, toRow, toCol, promotion: promotion || undefined }),
  });
}

export function getValidMoves(gameId, row, col) {
  return apiFetch(`/chess/games/${gameId}/valid-moves?row=${row}&col=${col}`);
}

export function resign(gameId, color) {
  return apiFetch(`/chess/games/${gameId}/resign`, {
    method: 'POST',
    body: JSON.stringify({ color }),
  });
}

// Isolated /sim/* demo engine — separate state from any live game above.
export function simReset() {
  return apiFetch('/chess/sim/reset', { method: 'POST' });
}

export function simGetGame() {
  return apiFetch('/chess/sim/game');
}

export function simGetEventLog() {
  return apiFetch('/chess/sim/log');
}

export function simMove(fromRow, fromCol, toRow, toCol, description) {
  return apiFetch('/chess/sim/move', {
    method: 'POST',
    body: JSON.stringify({ fromRow, fromCol, toRow, toCol, description }),
  });
}
