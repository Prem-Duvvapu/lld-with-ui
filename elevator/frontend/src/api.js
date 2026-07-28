const API = 'http://localhost:8088/api/elevator';

export async function getElevators() {
  const res = await fetch(`${API}/elevators`);
  return res.json();
}

export async function requestElevator(fromFloor, toFloor) {
  const res = await fetch(`${API}/request`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromFloor, toFloor })
  });
  return res.json();
}

export async function getRequests() {
  const res = await fetch(`${API}/requests`);
  return res.json();
}

export async function tick() {
  const res = await fetch(`${API}/tick`, { method: 'POST' });
  return res.json();
}