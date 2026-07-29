const BASE = '/api/tictactoe';

export async function createGame(player1, player2) {
  const res = await fetch(`${BASE}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player1, player2 }),
  });
  return res.json();
}

export async function getGame(id) {
  const res = await fetch(`${BASE}/games/${id}`);
  return res.json();
}

export async function makeMove(gameId, row, col, playerName) {
  const res = await fetch(`${BASE}/games/${gameId}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ row, col, playerName }),
  });
  return res.json();
}

export async function resetGame(gameId) {
  const res = await fetch(`${BASE}/games/${gameId}/reset`, {
    method: 'POST',
  });
  return res.json();
}
