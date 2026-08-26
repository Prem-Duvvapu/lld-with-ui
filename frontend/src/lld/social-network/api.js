import { apiFetch } from '../../utils/api';

export function createUser(name, email, bio) {
  return apiFetch('/social/users', {
    method: 'POST',
    body: JSON.stringify({ name, email, bio }),
  });
}

export function getAllUsers() {
  return apiFetch('/social/users');
}

export function getUser(id) {
  return apiFetch(`/social/users/${id}`);
}

export function sendFriendRequest(fromUserId, toUserId) {
  return apiFetch('/social/friends/request', {
    method: 'POST',
    body: JSON.stringify({ fromUserId, toUserId }),
  });
}

export function respondToRequest(requestId, accept) {
  return apiFetch(`/social/friends/respond/${requestId}?accept=${accept}`, {
    method: 'PUT',
  });
}

export function getFriends(userId) {
  return apiFetch(`/social/friends/${userId}`);
}

export function getPendingRequests(userId) {
  return apiFetch(`/social/requests/${userId}`);
}

export function createPost(userId, content) {
  return apiFetch('/social/posts', {
    method: 'POST',
    body: JSON.stringify({ userId, content }),
  });
}

export function getFeed(userId) {
  return apiFetch(`/social/feed/${userId}`);
}

export function getAllPosts() {
  return apiFetch('/social/posts');
}

export function getFeedEvents() {
  return apiFetch('/social/feed-events');
}

export function likePost(postId, userId) {
  return apiFetch(`/social/posts/${postId}/like`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export function addComment(postId, userId, content) {
  return apiFetch(`/social/posts/${postId}/comment`, {
    method: 'POST',
    body: JSON.stringify({ userId, content }),
  });
}

// ---------------------------------------------------------------- sim engine
// Isolated /api/social/sim/* sandbox — completely separate repository/notifier
// pair from the live module above, so the demo tab can never corrupt real data.

export function simReset() {
  return apiFetch('/social/sim/reset', { method: 'POST' });
}

export function simCreateUser(name, email, bio, step) {
  return apiFetch('/social/sim/users', {
    method: 'POST',
    body: JSON.stringify({ name, email, bio, step }),
  });
}

export function simCreatePost(userId, content, step) {
  return apiFetch('/social/sim/posts', {
    method: 'POST',
    body: JSON.stringify({ userId, content, step }),
  });
}

export function simSendFriendRequest(fromUserId, toUserId, step) {
  return apiFetch('/social/sim/friends/request', {
    method: 'POST',
    body: JSON.stringify({ fromUserId, toUserId, step }),
  });
}

export function simRespond(requestId, accept, step) {
  return apiFetch(`/social/sim/friends/respond/${requestId}`, {
    method: 'POST',
    body: JSON.stringify({ accept, step }),
  });
}

export function simLikePost(postId, userId, step) {
  return apiFetch(`/social/sim/posts/${postId}/like`, {
    method: 'POST',
    body: JSON.stringify({ userId, step }),
  });
}

export function simAddComment(postId, userId, content, step) {
  return apiFetch(`/social/sim/posts/${postId}/comment`, {
    method: 'POST',
    body: JSON.stringify({ userId, content, step }),
  });
}

export function simRace(userId1, userId2, attempts, step) {
  return apiFetch('/social/sim/race', {
    method: 'POST',
    body: JSON.stringify({ userId1, userId2, attempts, step }),
  });
}

export function simGetEvents() {
  return apiFetch('/social/sim/events');
}

export function simGetSnapshot() {
  return apiFetch('/social/sim/snapshot');
}
