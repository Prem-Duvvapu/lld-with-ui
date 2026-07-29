const BASE = '/api/logging';

export const configure = async (level) => {
  const res = await fetch(`${BASE}/configure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level })
  });
  return res.json();
};

export const addAppender = async (name) => {
  const res = await fetch(`${BASE}/appender`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  return res.json();
};

export const sendLog = async (loggerName, level, message) => {
  const res = await fetch(`${BASE}/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loggerName, level, message })
  });
  if (res.status === 204) return null;
  return res.json();
};

export const getLogs = async () => {
  const res = await fetch(`${BASE}/logs`);
  return res.json();
};

export const getConfig = async () => {
  const res = await fetch(`${BASE}/config`);
  return res.json();
};

export const clearLogs = async () => {
  await fetch(`${BASE}/clear`, { method: 'POST' });
};
