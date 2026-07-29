const API = '/api/minesweeper';

export async function createGame(rows = 9, cols = 9, mines = 10) {
  const res = await fetch(`${API}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows, cols, mines })
  });
  return res.json();
}

export async function getGame(gameId) {
  const res = await fetch(`${API}/games/${gameId}`);
  return res.json();
}

export async function revealCell(gameId, row, col) {
  const res = await fetch(`${API}/games/${gameId}/reveal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ row, col })
  });
  return res.json();
}

export async function flagCell(gameId, row, col) {
  const res = await fetch(`${API}/games/${gameId}/flag`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ row, col })
  });
  return res.json();
}
