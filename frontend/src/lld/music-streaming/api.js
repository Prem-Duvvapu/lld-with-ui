import { apiFetch } from '../../utils/api';

// ---- Live Catalog Endpoints ----

export function getSongs() {
  return apiFetch('/music-streaming/songs');
}

export function getArtists() {
  return apiFetch('/music-streaming/artists');
}

export function getAlbums() {
  return apiFetch('/music-streaming/albums');
}

export function search(query) {
  return apiFetch(`/music-streaming/search?query=${encodeURIComponent(query || '')}`);
}

// ---- Live User Endpoints ----

export function getUsers() {
  return apiFetch('/music-streaming/users');
}

export function getUser(userId) {
  return apiFetch(`/music-streaming/users/${userId}`);
}

export function changeSubscription(userId, plan) {
  return apiFetch(`/music-streaming/users/${userId}/subscription`, {
    method: 'POST',
    body: JSON.stringify({ plan }),
  });
}

export function getRecommendations(userId, limit = 5) {
  return apiFetch(`/music-streaming/users/${userId}/recommendations?limit=${limit}`);
}

export function likeSong(userId, songId) {
  return apiFetch(`/music-streaming/users/${userId}/like/${songId}`, { method: 'POST' });
}

export function unlikeSong(userId, songId) {
  return apiFetch(`/music-streaming/users/${userId}/like/${songId}`, { method: 'DELETE' });
}

export function downloadSong(userId, songId) {
  return apiFetch(`/music-streaming/users/${userId}/download/${songId}`, { method: 'POST' });
}

// ---- Live Playlist Endpoints ----

export function getPlaylistsForUser(userId) {
  return apiFetch(`/music-streaming/users/${userId}/playlists`);
}

export function getPlaylist(playlistId) {
  return apiFetch(`/music-streaming/playlists/${playlistId}`);
}

export function createPlaylist(userId, name) {
  return apiFetch(`/music-streaming/users/${userId}/playlists`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function addSongToPlaylist(playlistId, songId) {
  return apiFetch(`/music-streaming/playlists/${playlistId}/songs`, {
    method: 'POST',
    body: JSON.stringify({ songId }),
  });
}

export function removeSongFromPlaylist(playlistId, songId) {
  return apiFetch(`/music-streaming/playlists/${playlistId}/songs/${songId}`, { method: 'DELETE' });
}

export function reorderPlaylist(playlistId, songId, newPosition) {
  return apiFetch(`/music-streaming/playlists/${playlistId}/reorder`, {
    method: 'POST',
    body: JSON.stringify({ songId, newPosition }),
  });
}

// ---- Live Playback Endpoints ----

export function startPlayback(userId, songId, deviceId) {
  return apiFetch('/music-streaming/playback/start', {
    method: 'POST',
    body: JSON.stringify({ userId, songId, deviceId }),
  });
}

export function stopPlayback(sessionId) {
  return apiFetch(`/music-streaming/playback/${sessionId}/stop`, { method: 'POST' });
}

export function skipPlayback(sessionId) {
  return apiFetch(`/music-streaming/playback/${sessionId}/skip`, { method: 'POST' });
}

export function getActiveSessions(userId) {
  return apiFetch(`/music-streaming/users/${userId}/sessions`);
}

// ---- Isolated Simulation Endpoints (/sim/*) ----

export function simReset() {
  return apiFetch('/music-streaming/sim/reset', { method: 'POST' });
}

export function simState() {
  return apiFetch('/music-streaming/sim/state');
}

export function simPlay(userId, songId, deviceId) {
  return apiFetch('/music-streaming/sim/play', {
    method: 'POST',
    body: JSON.stringify({ userId, songId, deviceId }),
  });
}

export function simStop(sessionId) {
  return apiFetch('/music-streaming/sim/stop', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  });
}

export function simSkip(sessionId) {
  return apiFetch('/music-streaming/sim/skip', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  });
}

export function simLike(userId, songId) {
  return apiFetch('/music-streaming/sim/like', {
    method: 'POST',
    body: JSON.stringify({ userId, songId }),
  });
}

export function simDownload(userId, songId) {
  return apiFetch('/music-streaming/sim/download', {
    method: 'POST',
    body: JSON.stringify({ userId, songId }),
  });
}

export function simChangeSubscription(userId, plan) {
  return apiFetch('/music-streaming/sim/subscription', {
    method: 'POST',
    body: JSON.stringify({ userId, plan }),
  });
}

export function simRace(userId, songId, attempts) {
  return apiFetch('/music-streaming/sim/race', {
    method: 'POST',
    body: JSON.stringify({ userId, songId, attempts }),
  });
}

export function simEvents() {
  return apiFetch('/music-streaming/sim/events');
}
