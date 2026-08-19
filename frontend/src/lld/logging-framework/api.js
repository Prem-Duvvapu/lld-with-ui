import { apiFetch } from '../../utils/api';

export const configure = (level) => apiFetch('/logging/configure', {
  method: 'POST',
  body: JSON.stringify({ level })
});

export const setLoggerLevel = (loggerName, level) => apiFetch('/logging/logger-level', {
  method: 'POST',
  body: JSON.stringify({ loggerName, level })
});

export const setFormatter = (formatter) => apiFetch('/logging/formatter', {
  method: 'POST',
  body: JSON.stringify({ formatter })
});

export const toggleAppender = (name, enabled) => apiFetch('/logging/appender/toggle', {
  method: 'POST',
  body: JSON.stringify({ name, enabled })
});

export const setAsyncMode = (enabled) => apiFetch('/logging/async', {
  method: 'POST',
  body: JSON.stringify({ enabled })
});

export const sendLog = (loggerName, level, message, context) => apiFetch('/logging/log', {
  method: 'POST',
  body: JSON.stringify({ loggerName, level, message, context })
});

export const getLogs = () => apiFetch('/logging/logs');
export const getConfig = () => apiFetch('/logging/config');
export const getAppenderLogs = (type) => apiFetch(`/logging/appenders/${type}/logs`);
export const triggerBurst = (count = 10) => apiFetch(`/logging/burst?count=${count}`, { method: 'POST' });
export const clearLogs = () => apiFetch('/logging/clear', { method: 'POST' });

// Simulation Sandbox API
export const simReset = () => apiFetch('/logging/sim/reset', { method: 'POST' });
export const simEmitLog = (loggerName, level, message, context) => apiFetch('/logging/sim/log', {
  method: 'POST',
  body: JSON.stringify({ loggerName, level, message, context })
});
export const simGetLogs = () => apiFetch('/logging/sim/logs');
export const simGetTelemetry = () => apiFetch('/logging/sim/telemetry');
export const simGetAppenderLogs = (type) => apiFetch(`/logging/sim/appenders/${type}/logs`);
