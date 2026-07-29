const BASE_URL = '/api/traffic';

export async function getStatus() {
  const res = await fetch(`${BASE_URL}/status`);
  return res.json();
}

export async function transition() {
  const res = await fetch(`${BASE_URL}/transition`, { method: 'POST' });
  return res.json();
}

export async function emergencyOverride(lightId) {
  const res = await fetch(`${BASE_URL}/emergency?lightId=${lightId}`, { method: 'POST' });
  return res.json();
}

export async function setTimer(lightId, seconds) {
  const res = await fetch(`${BASE_URL}/timer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lightId, seconds }),
  });
  return res.json();
}
