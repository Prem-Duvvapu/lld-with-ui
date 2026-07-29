const BASE = '/api/chess';

export async function createGame(playerWhite, playerBlack) {
  const res = await fetch(`${BASE}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerWhite, playerBlack }),
  });
  return res.json();
}

export async function getGame(id) {
  const res = await fetch(`${BASE}/games/${id}`);
  return res.json();
}

export async function makeMove(gameId, fromRow, fromCol, toRow, toCol) {
  const res = await fetch(`${BASE}/games/${gameId}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromRow, fromCol, toRow, toCol }),
  });
  return res.json();
}

export async function getValidMoves(gameId, row, col) {
  const res = await fetch(`${BASE}/games/${gameId}/valid-moves?row=${row}&col=${col}`);
  return res.json();
}