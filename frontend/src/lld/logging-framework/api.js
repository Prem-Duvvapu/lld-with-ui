import { apiFetch } from '../../utils/api';

export const configure = (level) => apiFetch('/logging/configure', {
  method: 'POST',
  body: JSON.stringify({ level })
});

export const addAppender = (name) => apiFetch('/logging/appender', {
  method: 'POST',
  body: JSON.stringify({ name })
});

export const sendLog = (loggerName, level, message) => apiFetch('/logging/log', {
  method: 'POST',
  body: JSON.stringify({ loggerName, level, message })
});

export const getLogs = () => apiFetch('/logging/logs');
export const getConfig = () => apiFetch('/logging/config');
export const clearLogs = () => apiFetch('/logging/clear', { method: 'POST' });
