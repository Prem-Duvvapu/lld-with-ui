const BASE = 'http://localhost:8083/api/stackoverflow';

export async function getQuestions(keyword, tag, userId) {
  const params = new URLSearchParams();
  if (keyword) params.set('keyword', keyword);
  if (tag) params.set('tag', tag);
  if (userId) params.set('userId', userId);
  const qs = params.toString();
  const res = await fetch(`${BASE}/questions${qs ? '?' + qs : ''}`);
  return res.json();
}

export async function getQuestion(id) {
  const res = await fetch(`${BASE}/questions/${id}`);
  return res.json();
}

export async function postQuestion(title, body, authorId, tags) {
  const res = await fetch(`${BASE}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body, authorId, tags }),
  });
  return res.json();
}

export async function postAnswer(questionId, body, authorId) {
  const res = await fetch(`${BASE}/questions/${questionId}/answers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body, authorId }),
  });
  return res.json();
}

export async function voteQuestion(questionId, userId, voteType) {
  const res = await fetch(`${BASE}/questions/${questionId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, voteType }),
  });
  return res.json();
}

export async function voteAnswer(answerId, userId, voteType) {
  const res = await fetch(`${BASE}/answers/${answerId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, voteType }),
  });
  return res.json();
}

export async function acceptAnswer(questionId, answerId, userId) {
  const res = await fetch(`${BASE}/questions/${questionId}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answerId, userId }),
  });
  return res.json();
}

export async function addComment(targetType, targetId, body, authorId) {
  const res = await fetch(`${BASE}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetType, targetId, body, authorId }),
  });
  return res.json();
}

export async function getUsers() {
  const res = await fetch(`${BASE}/users`);
  return res.json();
}

export async function getUser(id) {
  const res = await fetch(`${BASE}/users/${id}`);
  return res.json();
}

export async function getTags() {
  const res = await fetch(`${BASE}/tags`);
  return res.json();
}
