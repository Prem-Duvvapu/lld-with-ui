const BASE = '/api/traffic';

export const getStatus = async () => {
  const res = await fetch(`${BASE}/status`);
  return res.json();
};

export const transition = async () => {
  const res = await fetch(`${BASE}/transition`, { method: 'POST' });
  return res.json();
};

export const emergency = async (lightId) => {
  const res = await fetch(`${BASE}/emergency?lightId=${lightId}`, { method: 'POST' });
  return res.json();
};
