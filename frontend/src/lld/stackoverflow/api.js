import { apiFetch } from '../../utils/api';

// ---- Live module ----

export function getQuestions(keyword, tag, userId) {
  const params = new URLSearchParams();
  if (keyword) params.set('keyword', keyword);
  if (tag) params.set('tag', tag);
  if (userId) params.set('userId', userId);
  const qs = params.toString();
  return apiFetch(`/stackoverflow/questions${qs ? '?' + qs : ''}`);
}

export function getQuestion(id) {
  return apiFetch(`/stackoverflow/questions/${id}`);
}

export function postQuestion(title, body, authorId, tags) {
  return apiFetch('/stackoverflow/questions', {
    method: 'POST',
    body: JSON.stringify({ title, body, authorId, tags }),
  });
}

export function postAnswer(questionId, body, authorId) {
  return apiFetch(`/stackoverflow/questions/${questionId}/answers`, {
    method: 'POST',
    body: JSON.stringify({ body, authorId }),
  });
}

export function voteQuestion(questionId, userId, voteType) {
  return apiFetch(`/stackoverflow/questions/${questionId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ userId, voteType }),
  });
}

export function voteAnswer(answerId, userId, voteType) {
  return apiFetch(`/stackoverflow/answers/${answerId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ userId, voteType }),
  });
}

export function acceptAnswer(questionId, answerId, userId) {
  return apiFetch(`/stackoverflow/questions/${questionId}/accept`, {
    method: 'POST',
    body: JSON.stringify({ answerId, userId }),
  });
}

export function closeQuestion(questionId, userId) {
  return apiFetch(`/stackoverflow/questions/${questionId}/close`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export function addComment(targetType, targetId, body, authorId) {
  return apiFetch('/stackoverflow/comments', {
    method: 'POST',
    body: JSON.stringify({ targetType, targetId, body, authorId }),
  });
}

export function getUsers() {
  return apiFetch('/stackoverflow/users');
}

export function getUser(id) {
  return apiFetch(`/stackoverflow/users/${id}`);
}

export function getTags() {
  return apiFetch('/stackoverflow/tags');
}

// ---- Simulation sandbox (/sim/*) — isolated from the live data above ----

export function simReset() {
  return apiFetch('/stackoverflow/sim/reset', { method: 'POST' });
}

export function simState() {
  return apiFetch('/stackoverflow/sim/state');
}

export function simAsk() {
  return apiFetch('/stackoverflow/sim/ask', { method: 'POST' });
}

export function simAnswer(questionId) {
  return apiFetch('/stackoverflow/sim/answer', {
    method: 'POST',
    body: JSON.stringify({ questionId }),
  });
}

export function simVote(answerId, voterId, voteType) {
  return apiFetch('/stackoverflow/sim/vote', {
    method: 'POST',
    body: JSON.stringify({ answerId, voterId, voteType }),
  });
}

export function simAccept(questionId, answerId, requesterId) {
  return apiFetch('/stackoverflow/sim/accept', {
    method: 'POST',
    body: JSON.stringify({ questionId, answerId, requesterId }),
  });
}

export function simClose(questionId, requesterId) {
  return apiFetch('/stackoverflow/sim/close', {
    method: 'POST',
    body: JSON.stringify({ questionId, requesterId }),
  });
}

export function simRace(answerId, voters) {
  return apiFetch('/stackoverflow/sim/race', {
    method: 'POST',
    body: JSON.stringify({ answerId, voters }),
  });
}

export function simEvents() {
  return apiFetch('/stackoverflow/sim/events');
}
