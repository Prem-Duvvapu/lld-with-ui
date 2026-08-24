// classDiagrams — musicStreaming
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Music Streaming — Class Diagram',
  classes: [
    {
      name: 'Song',
      fields: [
        '- id: String',
        '- title: String',
        '- duration: int',
        '- album: Album',
        '- artists: List<Artist>',
        '- genre: String',
        '- playCount: int'
      ],
      methods: [
        '+ play(): void',
        '+ addToPlaylist(playlist): void'
      ]
    },
    {
      name: 'Album',
      fields: [
        '- id: String',
        '- title: String',
        '- artist: Artist',
        '- releaseYear: int',
        '- songs: List<Song>',
        '- coverArt: String'
      ],
      methods: [
        '+ addSong(song): void',
        '+ getDuration(): int'
      ]
    },
    {
      name: 'Artist',
      fields: [
        '- id: String',
        '- name: String',
        '- bio: String',
        '- albums: List<Album>',
        '- monthlyListeners: int'
      ],
      methods: [
        '+ releaseAlbum(title, songs): Album',
        '+ getTopSongs(n): List<Song>'
      ]
    },
    {
      name: 'Playlist',
      fields: [
        '- id: String',
        '- name: String',
        '- owner: User',
        '- songs: List<Song>',
        '- isPublic: boolean'
      ],
      methods: [
        '+ addSong(song): void',
        '+ removeSong(song): void',
        '+ shuffle(): void'
      ]
    },
    {
      name: 'User',
      fields: [
        '- id: String',
        '- name: String',
        '- email: String',
        '- subscription: Subscription',
        '- playlists: List<Playlist>',
        '- likedSongs: List<Song>'
      ],
      methods: [
        '+ createPlaylist(name): Playlist',
        '+ likeSong(song): void',
        '+ getRecommendedSongs(): List<Song>'
      ]
    },
    {
      name: 'Subscription',
      fields: [
        '- id: String',
        '- user: User',
        '- plan: SubscriptionPlan',
        '- startDate: LocalDate',
        '- renewalDate: LocalDate',
        '- isActive: boolean'
      ],
      methods: [
        '+ activate(): void',
        '+ cancel(): void',
        '+ upgrade(newPlan): void'
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
    }
  ],
  relationships: [
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
