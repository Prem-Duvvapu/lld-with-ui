import { apiFetch } from '../../utils/api';

export const configure = (level, options = {}) => apiFetch('/logging/configure', {
  ...options,
  method: 'POST',
  body: JSON.stringify({ level })
});

export const setLoggerLevel = (loggerName, level, options = {}) => apiFetch('/logging/logger-level', {
  ...options,
  method: 'POST',
  body: JSON.stringify({ loggerName, level })
});

export const setFormatter = (formatter, options = {}) => apiFetch('/logging/formatter', {
  ...options,
  method: 'POST',
  body: JSON.stringify({ formatter })
});

export const toggleAppender = (name, enabled, options = {}) => apiFetch('/logging/appender/toggle', {
  ...options,
  method: 'POST',
  body: JSON.stringify({ name, enabled })
});

export const setAsyncMode = (enabled, options = {}) => apiFetch('/logging/async', {
  ...options,
  method: 'POST',
  body: JSON.stringify({ enabled })
});

export const sendLog = (loggerName, level, message, context, options = {}) => apiFetch('/logging/log', {
  ...options,
  method: 'POST',
  body: JSON.stringify({ loggerName, level, message, context })
});

export const getLogs = (options = {}) => apiFetch('/logging/logs', options);
export const getConfig = (options = {}) => apiFetch('/logging/config', options);
export const getAppenderLogs = (type, options = {}) => apiFetch(`/logging/appenders/${type}/logs`, options);
export const triggerBurst = (count = 10, options = {}) => apiFetch(`/logging/burst?count=${count}`, { ...options, method: 'POST' });
export const clearLogs = (options = {}) => apiFetch('/logging/clear', { ...options, method: 'POST' });

// Simulation Sandbox API
export const simReset = () => apiFetch('/logging/sim/reset', { method: 'POST' });
export const simEmitLog = (loggerName, level, message, context) => apiFetch('/logging/sim/log', {
  method: 'POST',
  body: JSON.stringify({ loggerName, level, message, context })
});
export const simGetLogs = () => apiFetch('/logging/sim/logs');
export const simGetTelemetry = () => apiFetch('/logging/sim/telemetry');
export const simGetAppenderLogs = (type) => apiFetch(`/logging/sim/appenders/${type}/logs`);
