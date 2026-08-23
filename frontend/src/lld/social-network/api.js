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
