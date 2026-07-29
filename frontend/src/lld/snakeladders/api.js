const BASE = '/api/snakeladders';

export async function createGame(players) {
  const res = await fetch(`${BASE}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ players }),
  });
  return res.json();
}

export async function getGame(id) {
  const res = await fetch(`${BASE}/games/${id}`);
  return res.json();
}

export async function rollDice(gameId) {
  const res = await fetch(`${BASE}/games/${gameId}/roll`, { method: 'POST' });
  return res.json();
}
