import { apiFetch } from '../../utils/api';

const BASE_URL = '/api/linkedin';

// Users & Profile
export function getUsers() {
  return apiFetch(`${BASE_URL}/users`);
}

export function getUser(userId) {
  return apiFetch(`${BASE_URL}/users/${userId}`);
}

export function registerUser(name, email, password) {
  return apiFetch(`${BASE_URL}/users/register`, {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export function login(email, password) {
  return apiFetch(`${BASE_URL}/users/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function updateProfile(userId, data) {
  return apiFetch(`${BASE_URL}/users/${userId}/profile`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function addSkill(userId, skill) {
  return apiFetch(`${BASE_URL}/users/${userId}/skills`, {
    method: 'POST',
    body: JSON.stringify({ skill }),
  });
}

export function addExperience(userId, expData) {
  return apiFetch(`${BASE_URL}/users/${userId}/experience`, {
    method: 'POST',
    body: JSON.stringify(expData),
  });
}

// Connections
export function sendConnectionRequest(senderId, receiverId) {
  return apiFetch(`${BASE_URL}/connections/request`, {
    method: 'POST',
    body: JSON.stringify({ senderId, receiverId }),
  });
}

export function acceptConnection(connectionId, targetUserId) {
  return apiFetch(`${BASE_URL}/connections/${connectionId}/accept`, {
    method: 'POST',
    body: JSON.stringify({ targetUserId }),
  });
}

export function rejectConnection(connectionId, targetUserId) {
  return apiFetch(`${BASE_URL}/connections/${connectionId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ targetUserId }),
  });
}

export function getConnections(userId) {
  return apiFetch(`${BASE_URL}/connections/${userId}`);
}

export function getPendingRequests(userId) {
  return apiFetch(`${BASE_URL}/connections/${userId}/pending`);
}

// Messaging
export function sendMessage(senderId, receiverId, content) {
  return apiFetch(`${BASE_URL}/messages/send`, {
    method: 'POST',
    body: JSON.stringify({ senderId, receiverId, content }),
  });
}

export function getConversation(userA, userB) {
  return apiFetch(`${BASE_URL}/messages?userA=${userA}&userB=${userB}`);
}

// Jobs
export function getJobs() {
  return apiFetch(`${BASE_URL}/jobs`);
}

export function postJob(jobData) {
  return apiFetch(`${BASE_URL}/jobs`, {
    method: 'POST',
    body: JSON.stringify(jobData),
  });
}

export function applyJob(jobId, applicantId) {
  return apiFetch(`${BASE_URL}/jobs/${jobId}/apply`, {
    method: 'POST',
    body: JSON.stringify({ applicantId }),
  });
}

// Search & Notifications
export function searchUsers(query, requestingUserId) {
  const q = encodeURIComponent(query || '');
  const r = requestingUserId ? `&requestingUserId=${requestingUserId}` : '';
  return apiFetch(`${BASE_URL}/search/users?query=${q}${r}`);
}

export function searchJobs(query, location, applicantId) {
  const q = encodeURIComponent(query || '');
  const l = encodeURIComponent(location || '');
  const a = applicantId ? `&applicantId=${applicantId}` : '';
  return apiFetch(`${BASE_URL}/search/jobs?query=${q}&location=${l}${a}`);
}

export function getNotifications(userId) {
  return apiFetch(`${BASE_URL}/notifications/${userId}`);
}

// Simulation Endpoints
export function simReset() {
  return apiFetch(`${BASE_URL}/sim/reset`, { method: 'POST' });
}

export function simConnect(senderId, receiverId) {
  return apiFetch(`${BASE_URL}/sim/connect`, {
    method: 'POST',
    body: JSON.stringify({ senderId, receiverId }),
  });
}

export function simAccept(connectionId) {
  return apiFetch(`${BASE_URL}/sim/accept`, {
    method: 'POST',
    body: JSON.stringify({ connectionId }),
  });
}

export function simMessage(senderId, receiverId, content) {
  return apiFetch(`${BASE_URL}/sim/message`, {
    method: 'POST',
    body: JSON.stringify({ senderId, receiverId, content }),
  });
}

export function simApply(applicantId, jobId) {
  return apiFetch(`${BASE_URL}/sim/apply`, {
    method: 'POST',
    body: JSON.stringify({ applicantId, jobId }),
  });
}

export function simGetSnapshots() {
  return apiFetch(`${BASE_URL}/sim/snapshots`);
}

export function simGetEvents() {
  return apiFetch(`${BASE_URL}/sim/events`);
}
