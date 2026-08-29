// Sequence diagram content for music-streaming (Spotify).
// Grounded directly in MusicStreamingService, PlaybackService (single active device session stealing),
// and RecommendationService / Playlist Management.
export default {
  title: 'Music Streaming (Spotify) — Single-Device Playback Session & Track Streaming',
  description:
    'How MusicStreamingService enforces single-device concurrent playback per user account. PlaybackService pauses or revokes playback on an existing active device when a new device starts streaming, tracks listen metrics, and buffers audio chunks.',
  flows: [
    {
      id: 'session-stealing-flow',
      label: 'New device playback takes over active stream (Single-Device Policy)',
      description:
        'Alice is listening to music on her Web Browser (session-1). She opens the Mobile App (session-2) and plays "Bohemian Rhapsody". PlaybackService acquires userPlaybackLock("alice"), notifies session-1 to pause, registers session-2 as active, and starts the audio buffer stream.',
      participants: [
        { id: 'mobileApp', name: 'Mobile App\n(Alice: device-2)', kind: 'actor' },
        { id: 'controller', name: 'MusicStreaming\nController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'MusicStreaming\nService', kind: 'component', stereotype: 'facade' },
        { id: 'playService', name: 'PlaybackService', kind: 'component' },
        { id: 'userLock', name: 'userLock("alice")', kind: 'lock', stereotype: 'ReentrantLock' },
        { id: 'webApp', name: 'Web Browser\n(Alice: device-1)', kind: 'actor' },
        { id: 'repo', name: 'MusicStreamingRepository', kind: 'store' },
      ],
      steps: [
        { from: 'mobileApp', to: 'controller', text: 'POST /api/music/play {userId: "alice", trackId: "TRK-901", deviceId: "device-2"}' },
        { from: 'controller', to: 'service', text: 'startPlayback("alice", "TRK-901", "device-2")', activate: 'service' },
        { from: 'service', to: 'playService', text: 'transferPlayback("alice", "TRK-901", "device-2")', activate: 'playService' },
        { from: 'playService', to: 'userLock', text: 'lock.lock() — ACQUIRED', activate: 'userLock' },
        { from: 'playService', to: 'repo', text: 'getActiveSession("alice") → Session {deviceId: "device-1", status: PLAYING}' },
        { from: 'playService', to: 'repo', text: 'updateSession("device-1", status=PAUSED_REMOTE)' },
        { from: 'playService', to: 'webApp', text: 'pushWebSocketEvent: "Playback paused — playing on Mobile"' },
        { from: 'playService', to: 'repo', text: 'createActiveSession("alice", "device-2", "TRK-901")' },
        { from: 'playService', to: 'userLock', text: 'lock.unlock()', deactivate: 'userLock' },
        { from: 'playService', to: 'service', text: 'PlaybackSession {device: "device-2", track: "Bohemian Rhapsody", PLAYING}', type: 'return', deactivate: 'playService' },
        { from: 'service', to: 'controller', text: 'return session', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'mobileApp', text: '200 OK — Streaming "Bohemian Rhapsody" to Mobile', type: 'return' },
      ],
    },
  ],
};
