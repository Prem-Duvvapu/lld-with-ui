const BASE = '/api/logging';
export const configure = (level) => fetch(`${BASE}/configure`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ level }) }).then(r => r.json());
export const addAppender = (name) => fetch(`${BASE}/appender`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ name }) }).then(r => r.json());
export const sendLog = (loggerName, level, message) => fetch(`${BASE}/log`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ loggerName, level, message }) }).then(r => r.json());
export const getLogs = () => fetch(`${BASE}/logs`).then(r => r.json());
export const getConfig = () => fetch(`${BASE}/config`).then(r => r.json());