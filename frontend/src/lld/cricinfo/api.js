import { apiFetch } from '../../utils/api';

// Teams
export const getTeams = () => apiFetch('/cricinfo/teams');
export const getTeam = (id) => apiFetch(`/cricinfo/teams/${id}`);
export const registerTeam = (team) =>
  apiFetch('/cricinfo/teams', { method: 'POST', body: JSON.stringify(team) });

// Matches
export const getMatches = () => apiFetch('/cricinfo/matches');
export const getMatch = (id) => apiFetch(`/cricinfo/matches/${id}`);
export const createMatch = (data) =>
  apiFetch('/cricinfo/matches', { method: 'POST', body: JSON.stringify(data) });
export const performToss = (id, winnerTeamId, choice) =>
  apiFetch(`/cricinfo/matches/${id}/toss`, {
    method: 'PUT',
    body: JSON.stringify({ winnerTeamId, choice }),
  });
export const startMatch = (id) => apiFetch(`/cricinfo/matches/${id}/start`, { method: 'PUT' });
export const recordBall = (id, ball) =>
  apiFetch(`/cricinfo/matches/${id}/balls`, { method: 'POST', body: JSON.stringify(ball) });
export const startNextInnings = (id) => apiFetch(`/cricinfo/matches/${id}/next-innings`, { method: 'PUT' });
export const abandonMatch = (id, reason) =>
  apiFetch(`/cricinfo/matches/${id}/abandon`, { method: 'PUT', body: JSON.stringify({ reason }) });

// Projections
export const getScorecard = (id) => apiFetch(`/cricinfo/matches/${id}/scorecard`);
export const getCommentary = (id) => apiFetch(`/cricinfo/matches/${id}/commentary`);
export const getEvents = (id) => apiFetch(`/cricinfo/matches/${id}/events`);

// Observer toggling
export const getObservers = () => apiFetch('/cricinfo/observers');
export const toggleObserver = (name, enabled) =>
  apiFetch(`/cricinfo/observers/${name}`, { method: 'PUT', body: JSON.stringify({ enabled }) });

// Simulation Sandbox Endpoints (/sim/*)
export const simReset = () => apiFetch('/cricinfo/sim/reset', { method: 'POST' });
export const simGetMatch = () => apiFetch('/cricinfo/sim/match');
export const simGetScorecard = () => apiFetch('/cricinfo/sim/scorecard');
export const simGetCommentary = () => apiFetch('/cricinfo/sim/commentary');
export const simGetEvents = () => apiFetch('/cricinfo/sim/events');
export const simBowlBall = (payload) =>
  apiFetch('/cricinfo/sim/bowl', { method: 'POST', body: JSON.stringify(payload) });
export const simGetTelemetry = () => apiFetch('/cricinfo/sim/telemetry');
export const simGetObservers = () => apiFetch('/cricinfo/sim/observers');
export const simToggleObserver = (name, enabled) =>
  apiFetch(`/cricinfo/sim/observers/${name}`, { method: 'PUT', body: JSON.stringify({ enabled }) });
