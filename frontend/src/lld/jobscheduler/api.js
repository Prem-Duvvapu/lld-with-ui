import { apiFetch } from '../../utils/api';

const BASE = '/jobscheduler';

// --- live ---------------------------------------------------------------

export const createJob = (payload) =>
  apiFetch(`${BASE}/jobs`, { method: 'POST', body: JSON.stringify(payload) });

export const listJobs = () => apiFetch(`${BASE}/jobs`);

export const getJob = (id) => apiFetch(`${BASE}/jobs/${id}`);

export const cancelJob = (id) => apiFetch(`${BASE}/jobs/${id}/cancel`, { method: 'POST' });

export const getHistory = (id) => apiFetch(`${BASE}/jobs/${id}/history`);

export const preview = (scheduleType, scheduleParams, count = 3) =>
  apiFetch(`${BASE}/preview`, {
    method: 'POST',
    body: JSON.stringify({ scheduleType, scheduleParams, count }),
  });

// --- isolated /sim/* sandbox ---------------------------------------------

export const simReset = () => apiFetch(`${BASE}/sim/reset`, { method: 'POST' });

export const simScheduleOneTime = (payload) =>
  apiFetch(`${BASE}/sim/schedule-one-time`, { method: 'POST', body: JSON.stringify(payload) });

export const simScheduleCron = (payload) =>
  apiFetch(`${BASE}/sim/schedule-cron`, { method: 'POST', body: JSON.stringify(payload) });

export const simAdvanceClock = (seconds, step) =>
  apiFetch(`${BASE}/sim/advance-clock`, { method: 'POST', body: JSON.stringify({ seconds, step }) });

export const simTriggerMisfire = (jobId, jumpSeconds, step) =>
  apiFetch(`${BASE}/sim/trigger-misfire`, { method: 'POST', body: JSON.stringify({ jobId, jumpSeconds, step }) });

export const simCancelJob = (jobId, step) =>
  apiFetch(`${BASE}/sim/cancel-job`, { method: 'POST', body: JSON.stringify({ jobId, step }) });

export const simRace = (step) =>
  apiFetch(`${BASE}/sim/race`, { method: 'POST', body: JSON.stringify({ step }) });

export const simGetEvents = () => apiFetch(`${BASE}/sim/events`);

export const simGetSnapshot = () => apiFetch(`${BASE}/sim/snapshot`);
