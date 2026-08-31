// classDiagrams — musicStreaming
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.
//
// Fixed (2026-08-31, RCA-044) — Song/Album/Artist/Playlist/User/Subscription all carried invented
// methods (play(), addToPlaylist(), releaseAlbum(), shuffle(), likeSong(), activate(), etc.) and
// embedded-object fields (Song.album, Song.artists, Playlist.owner/songs, User.playlists/
// likedSongs, Subscription.user). Every one of these is a plain Lombok model with zero methods —
// all mutation happens in MusicStreamingService/PlaybackService — and they reference each other
// by id (artistId, albumId, songIds, playlistIds, likedSongIds), not by embedded object, the same
// denormalized-id convention concert-ticket's Seat/Booking use.

export default {
  title: 'Music Streaming — Class Diagram',
  classes: [
    {
      name: 'Song',
      fields: [
        '- id: String',
        '- title: String',
        '- artistId: String',
        '- artistName: String',
        '- albumId: String',
        '- albumTitle: String',
        '- genre: Genre',
        '- duration: int',
        '- audioUrl: String',
        '- trackNumber: int',
        '- playCount: long'
      ],
      methods: []
    },
    {
      name: 'Album',
      fields: [
        '- id: String',
        '- title: String',
        '- artistId: String',
        '- artistName: String',
        '- releaseYear: int',
        '- coverArt: String'
      ],
      methods: []
    },
    {
      name: 'Artist',
      fields: [
        '- id: String',
        '- name: String',
        '- bio: String',
        '- monthlyListeners: int'
      ],
      methods: []
    },
    {
      name: 'Playlist',
      fields: [
        '- id: String',
        '- name: String',
        '- ownerId: String',
        '- songIds: List<String>',
        '- isPublic: boolean',
        '- collaboratorIds: List<String>',
        '- createdAt: Instant'
      ],
      methods: []
    },
    {
      name: 'User',
      fields: [
        '- id: String',
        '- name: String',
        '- email: String',
        '- subscription: Subscription',
        '- playlistIds: List<String>',
        '- likedSongIds: List<String>',
        '- listeningHistory: List<ListenEvent>',
        '- downloadedSongIds: List<String>',
        '- skipsUsedThisHour: int'
      ],
      methods: []
    },
    {
      name: 'Subscription',
      fields: [
        '- plan: SubscriptionPlan',
        '- active: boolean',
        '- startDate: LocalDate',
        '- renewalDate: LocalDate'
      ],
      methods: []
    },
    {
      name: 'RecommendationService',
      fields: [],
      methods: [
        '+ recommendFor(repository, user, limit): List<Song>'
      ]
    },
    {
      name: 'SubscriptionPlan',
      stereotype: 'enum',
      fields: [
        'FREE',
        'PREMIUM',
        'FAMILY'
      ],
      methods: []
    },
    {
      name: 'SubscriptionStrategy',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ maxConcurrentStreams(): int',
        '+ skipLimitPerHour(): int',
        '+ canSkip(skipsUsedThisHour): boolean',
        '+ isAdFree(): boolean',
        '+ canDownloadOffline(): boolean',
        '+ audioQuality(): AudioQuality'
      ]
    },
    {
      name: 'FreeSubscriptionStrategy',
      fields: [],
      methods: [
        '+ maxConcurrentStreams(): int  // 1',
        '+ skipLimitPerHour(): int  // 6'
      ]
    },
    {
      name: 'PremiumSubscriptionStrategy',
      fields: [],
      methods: [
        '+ maxConcurrentStreams(): int  // 2',
        '+ skipLimitPerHour(): int  // -1 (unlimited)'
      ]
    },
    {
      name: 'FamilySubscriptionStrategy',
      fields: [],
      methods: [
        '+ maxConcurrentStreams(): int  // 6',
        '+ skipLimitPerHour(): int  // -1 (unlimited)'
      ]
    },
    {
      name: 'SubscriptionStrategyFactory',
      fields: [
        '- strategies: EnumMap<SubscriptionPlan, SubscriptionStrategy>'
      ],
      methods: [
        '+ getStrategy(plan): SubscriptionStrategy'
      ]
    },
    {
      name: 'PlaybackService',
      fields: [
        '- userLocks: ConcurrentMap<String, ReentrantLock>'
      ],
      methods: [
        '+ startStream(userId, songId, deviceId): PlaybackSession',
        '+ stopStream(sessionId): PlaybackSession',
        '+ skip(sessionId): PlaybackSession'
      ]
    },
    {
      name: 'PlaybackSession',
      fields: [
        '- id: String',
        '- userId: String',
        '- songId: String',
        '- deviceId: String',
        '- active: boolean',
        '- adInjected: boolean'
      ],
      methods: []
    },
    {
      name: 'PlaybackEventListener',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ onStreamStarted(user, song): void'
      ]
    },
    {
      name: 'ListeningHistoryListener',
      fields: [],
      methods: [
        '+ onStreamStarted(user, song): void'
      ]
    },
    {
      name: 'PlayCountListener',
      fields: [],
      methods: [
        '+ onStreamStarted(user, song): void'
      ]
    },
    {
      name: 'MusicStreamingService',
      stereotype: 'facade',
      fields: [
        '- repository: MusicStreamingRepository',
        '- playbackService: PlaybackService',
        '- recommendationService: RecommendationService',
        '- strategyFactory: SubscriptionStrategyFactory'
      ],
      methods: [
        '+ search(query): Map<String, Object>',
        '+ createPlaylist(userId, name): Playlist',
        '+ addSongToPlaylist(playlistId, songId): Playlist',
        '+ likeSong(userId, songId): User',
        '+ changeSubscription(userId, plan): User',
        '+ downloadSong(userId, songId): User',
        '+ getRecommendations(userId, limit): List<Song>'
      ]
    }
  ],
  relationships: [
    { from: 'MusicStreamingService', to: 'PlaybackService', label: 'starts/stops/skips streams via' },
    { from: 'MusicStreamingService', to: 'RecommendationService', label: 'delegates ranking to' },
    { from: 'MusicStreamingService', to: 'SubscriptionStrategyFactory', label: 'gates downloads via' },
    {
      from: 'Album',
      to: 'Song',
      label: 'contains'
    },
    {
      from: 'Album',
      to: 'Artist',
      label: 'by'
    },
    {
      from: 'Song',
      to: 'Artist',
      label: 'performed by'
    },
    {
      from: 'Playlist',
      to: 'Song',
      label: 'contains'
    },
    {
      from: 'Playlist',
      to: 'User',
      label: 'owned by'
    },
    {
      from: 'User',
      to: 'Subscription',
      label: 'has'
    },
    {
      from: 'Subscription',
      to: 'SubscriptionPlan',
      label: 'has plan'
    },
    {
      from: 'FreeSubscriptionStrategy',
      to: 'SubscriptionStrategy',
      label: 'implements'
    },
    {
      from: 'PremiumSubscriptionStrategy',
      to: 'SubscriptionStrategy',
      label: 'implements'
    },
    {
      from: 'FamilySubscriptionStrategy',
      to: 'SubscriptionStrategy',
      label: 'implements'
    },
    {
      from: 'SubscriptionStrategyFactory',
      to: 'SubscriptionStrategy',
      label: 'resolves'
    },
    {
      from: 'PlaybackService',
      to: 'SubscriptionStrategy',
      label: 'enforces via'
    },
    {
      from: 'PlaybackService',
      to: 'PlaybackSession',
      label: 'creates'
    },
    {
      from: 'PlaybackService',
      to: 'PlaybackEventListener',
      label: 'notifies'
    },
    {
      from: 'ListeningHistoryListener',
      to: 'PlaybackEventListener',
      label: 'implements'
    },
    {
      from: 'PlayCountListener',
      to: 'PlaybackEventListener',
      label: 'implements'
    },
    {
      from: 'PlaybackSession',
      to: 'User',
      label: 'belongs to'
    },
    {
      from: 'PlaybackSession',
      to: 'Song',
      label: 'streams'
    }
  ]
};
