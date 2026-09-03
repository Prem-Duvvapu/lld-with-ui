import { apiFetch } from '../../utils/api';

const BASE = '/meetingscheduler';

// ---- Live endpoints ----
export const getRooms = () => apiFetch(`${BASE}/rooms`);
export const getRoom = (roomId) => apiFetch(`${BASE}/rooms/${roomId}`);
export const getAvailability = (roomId, date) => apiFetch(`${BASE}/rooms/${roomId}/availability?date=${date}`);
export const bookMeeting = (roomId, payload) =>
  apiFetch(`${BASE}/rooms/${roomId}/book`, { method: 'POST', body: JSON.stringify(payload) });
export const getMeetings = (personId) => apiFetch(`${BASE}/meetings${personId ? `?personId=${personId}` : ''}`);
export const getMeeting = (meetingId) => apiFetch(`${BASE}/meetings/${meetingId}`);
export const cancelMeeting = (meetingId) => apiFetch(`${BASE}/meetings/${meetingId}`, { method: 'DELETE' });

// ---- Isolated simulation sandbox ----
export const simReset = () => apiFetch(`${BASE}/sim/reset`, { method: 'POST' });
export const simSeedRoom = (payload) => apiFetch(`${BASE}/sim/rooms`, { method: 'POST', body: JSON.stringify(payload) });
export const simGetRooms = () => apiFetch(`${BASE}/sim/rooms`);
export const simGetMeetings = () => apiFetch(`${BASE}/sim/meetings`);
export const simBookMeeting = (roomId, payload) =>
  apiFetch(`${BASE}/sim/rooms/${roomId}/book`, { method: 'POST', body: JSON.stringify(payload) });
export const simCancelMeeting = (meetingId) => apiFetch(`${BASE}/sim/meetings/${meetingId}`, { method: 'DELETE' });
