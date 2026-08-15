const BASE_URL = '/api/linkedin';

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'API request failed');
  }
  return res.json();
}

// Users & Profile
export async function getUsers() {
  const res = await fetch(`${BASE_URL}/users`);
  return handleResponse(res);
}

export async function getUser(userId) {
  const res = await fetch(`${BASE_URL}/users/${userId}`);
  return handleResponse(res);
}

export async function registerUser(name, email, password) {
  const res = await fetch(`${BASE_URL}/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  return handleResponse(res);
}

export async function login(email, password) {
  const res = await fetch(`${BASE_URL}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res);
}

export async function updateProfile(userId, data) {
  const res = await fetch(`${BASE_URL}/users/${userId}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function addSkill(userId, skill) {
  const res = await fetch(`${BASE_URL}/users/${userId}/skills`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skill }),
  });
  return handleResponse(res);
}

export async function addExperience(userId, expData) {
  const res = await fetch(`${BASE_URL}/users/${userId}/experience`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expData),
  });
  return handleResponse(res);
}

// Connections
export async function sendConnectionRequest(senderId, receiverId) {
  const res = await fetch(`${BASE_URL}/connections/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senderId, receiverId }),
  });
  return handleResponse(res);
}

export async function acceptConnection(connectionId, targetUserId) {
  const res = await fetch(`${BASE_URL}/connections/${connectionId}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetUserId }),
  });
  return handleResponse(res);
}

export async function rejectConnection(connectionId, targetUserId) {
  const res = await fetch(`${BASE_URL}/connections/${connectionId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetUserId }),
  });
  return handleResponse(res);
}

export async function getConnections(userId) {
  const res = await fetch(`${BASE_URL}/connections/${userId}`);
  return handleResponse(res);
}

export async function getPendingRequests(userId) {
  const res = await fetch(`${BASE_URL}/connections/${userId}/pending`);
  return handleResponse(res);
}

// Messaging
export async function sendMessage(senderId, receiverId, content) {
  const res = await fetch(`${BASE_URL}/messages/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senderId, receiverId, content }),
  });
  return handleResponse(res);
}

export async function getConversation(userA, userB) {
  const res = await fetch(`${BASE_URL}/messages?userA=${userA}&userB=${userB}`);
  return handleResponse(res);
}

// Jobs
export async function getJobs() {
  const res = await fetch(`${BASE_URL}/jobs`);
  return handleResponse(res);
}

export async function postJob(jobData) {
  const res = await fetch(`${BASE_URL}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(jobData),
  });
  return handleResponse(res);
}

export async function applyJob(jobId, applicantId) {
  const res = await fetch(`${BASE_URL}/jobs/${jobId}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicantId }),
  });
  return handleResponse(res);
}

// Search & Notifications
export async function searchUsers(query, requestingUserId) {
  const q = encodeURIComponent(query || '');
  const r = requestingUserId ? `&requestingUserId=${requestingUserId}` : '';
  const res = await fetch(`${BASE_URL}/search/users?query=${q}${r}`);
  return handleResponse(res);
}

export async function searchJobs(query, location, applicantId) {
  const q = encodeURIComponent(query || '');
  const l = encodeURIComponent(location || '');
  const a = applicantId ? `&applicantId=${applicantId}` : '';
  const res = await fetch(`${BASE_URL}/search/jobs?query=${q}&location=${l}${a}`);
  return handleResponse(res);
}

export async function getNotifications(userId) {
  const res = await fetch(`${BASE_URL}/notifications/${userId}`);
  return handleResponse(res);
}

// Simulation Endpoints
export async function simReset() {
  const res = await fetch(`${BASE_URL}/sim/reset`, { method: 'POST' });
  return handleResponse(res);
}

export async function simConnect(senderId, receiverId) {
  const res = await fetch(`${BASE_URL}/sim/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senderId, receiverId }),
  });
  return handleResponse(res);
}

export async function simAccept(connectionId) {
  const res = await fetch(`${BASE_URL}/sim/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ connectionId }),
  });
  return handleResponse(res);
}

export async function simMessage(senderId, receiverId, content) {
  const res = await fetch(`${BASE_URL}/sim/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senderId, receiverId, content }),
  });
  return handleResponse(res);
}

export async function simApply(applicantId, jobId) {
  const res = await fetch(`${BASE_URL}/sim/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicantId, jobId }),
  });
  return handleResponse(res);
}

export async function simGetSnapshots() {
  const res = await fetch(`${BASE_URL}/sim/snapshots`);
  return handleResponse(res);
}

export async function simGetEvents() {
  const res = await fetch(`${BASE_URL}/sim/events`);
  return handleResponse(res);
}
