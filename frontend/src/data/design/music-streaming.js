// designDetails — musicStreaming
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Music Streaming — Design Details',
  requirements: [
    'Music catalog — songs with title, artist, album, genre, duration, and audio file URL',
    'User management — users can sign up, manage profile, and choose subscription plan (Free, Premium, Family)',
    'Playlist management — users create, edit, delete playlists, add/remove songs, and reorder tracks',
    'Music playback — stream songs with play, pause, skip, previous, seek, and shuffle/repeat controls',
    'Search functionality — search songs, artists, albums, and playlists with autocomplete and filtering',
    'Recommendations — personalized song recommendations based on listening history, liked songs, and genre preferences',
    'Subscription plans — Free (ads, skips limit, lower quality), Premium (no ads, unlimited skips, high quality), Family (multi-user)',
    'Offline downloads — premium users can download songs for offline listening with DRM protection'
  ],
  entities: [
    {
      name: 'StreamingService',
      description: 'Core orchestrator managing music catalog, playback, playlist management, search, and subscription handling.',
      fields: [
        {
          name: 'catalog',
          type: 'MusicCatalog',
          description: 'All songs, albums, and artists indexed for search'
        },
        {
          name: 'subscriptionManager',
          type: 'SubscriptionManager',
          description: 'Handles subscription plans and billing'
        },
        {
          name: 'recommendationEngine',
          type: 'RecommendationEngine',
          description: 'Generates personalized recommendations'
        },
        {
          name: 'downloadManager',
          type: 'DownloadManager',
          description: 'Manages offline downloads with DRM'
        }
      ],
      methods: [
        {
          name: 'search(query, type, filters)',
          returns: 'SearchResults',
          description: 'Searches songs, artists, albums, playlists'
        },
        {
          name: 'getRecommendations(userId)',
          returns: 'List<Song>',
          description: 'Returns personalized song recommendations'
        },
        {
          name: 'createPlaylist(userId, name)',
          returns: 'Playlist',
          description: 'Creates a new empty playlist'
        },
        {
          name: 'getStreamUrl(songId, userId)',
          returns: 'String',
          description: 'Returns signed audio stream URL (quality based on plan)'
        }
      ]
    },
    {
      name: 'PlaybackService',
      description: 'Owns the one genuinely compound, thread-unsafe operation in the module: starting a stream while enforcing the plan\'s concurrent-device cap. "Count my account\'s active sessions, then start a new one if under the limit" is a check-then-act race — two devices on a FREE account (limit 1) calling startStream at the same instant can both read activeCount == 0 before either has written its session. A ReentrantLock keyed per userId (not one global lock) makes the check-and-increment atomic per account while unrelated accounts still stream fully in parallel.',
      fields: [
        {
          name: 'userLocks',
          type: 'ConcurrentMap<String, ReentrantLock>',
          description: 'One lock per userId, created lazily via computeIfAbsent'
        }
      ],
      methods: [
        {
          name: 'startStream(userId, songId, deviceId)',
          returns: 'PlaybackSession',
          description: 'Locks on userId, checks active-session count against strategy.maxConcurrentStreams(), creates the session, notifies Observers'
        },
        {
          name: 'stopStream(sessionId)',
          returns: 'PlaybackSession',
          description: 'Ends a session, freeing a concurrent-stream slot for that account'
        },
        {
          name: 'skip(sessionId)',
          returns: 'PlaybackSession',
          description: 'Enforces strategy.canSkip(skipsUsedThisHour) before incrementing the counter'
        }
      ]
    },
    {
      name: 'User',
      description: 'Streaming service user with profile, subscription, playlists, listening history, and preferences.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique user identifier'
        },
        {
          name: 'name',
          type: 'String',
          description: 'Display name'
        },
        {
          name: 'subscription',
          type: 'Subscription',
          description: 'Current subscription plan and status'
        },
        {
          name: 'playlists',
          type: 'List<Playlist>',
          description: 'User-created playlists'
        },
        {
          name: 'likedSongs',
          type: 'List<Song>',
          description: 'Songs the user has liked'
        },
        {
          name: 'listeningHistory',
          type: 'List<ListenEvent>',
          description: 'Recently played songs for recommendations'
        },
        {
          name: 'downloadedSongs',
          type: 'List<Song>',
          description: 'Songs available offline (premium only)'
        }
      ],
      methods: [
        {
          name: 'likeSong(song)',
          returns: 'void',
          description: 'Adds song to liked songs list'
        },
        {
          name: 'unlikeSong(song)',
          returns: 'void',
          description: 'Removes song from liked songs'
        },
        {
          name: 'recordListen(song)',
          returns: 'void',
          description: 'Records a listen event for recommendations'
        },
        {
          name: 'downloadSong(song)',
          returns: 'boolean',
          description: 'Downloads song for offline playback (premium only)'
        }
      ]
    },
    {
      name: 'Song',
      description: 'Individual track with metadata, audio file, and streaming/DRM information.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique song identifier'
        },
        {
          name: 'title',
          type: 'String',
          description: 'Song title'
        },
        {
          name: 'artist',
          type: 'Artist',
          description: 'Performing artist'
        },
        {
          name: 'album',
          type: 'Album',
          description: 'Album this song belongs to'
        },
        {
          name: 'genre',
          type: 'Genre',
          description: 'Music genre (POP, ROCK, JAZZ, CLASSICAL, HIP_HOP)'
        },
        {
          name: 'duration',
          type: 'int',
          description: 'Duration in seconds'
        },
        {
          name: 'audioUrl',
          type: 'String',
          description: 'Streaming URL for audio file'
        },
        {
          name: 'trackNumber',
          type: 'int',
          description: 'Track position in the album'
        }
      ],
      methods: []
    },
    {
      name: 'Playlist',
      description: 'Ordered collection of songs created by a user. Supports public/private visibility and collaborative editing.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique playlist identifier'
        },
        {
          name: 'name',
          type: 'String',
          description: 'Playlist name'
        },
        {
          name: 'owner',
          type: 'User',
          description: 'User who created the playlist'
        },
        {
          name: 'songs',
          type: 'List<Song>',
          description: 'Ordered list of songs'
        },
        {
          name: 'isPublic',
          type: 'boolean',
          description: 'Whether the playlist is visible to other users'
        },
        {
          name: 'collaborators',
          type: 'List<User>',
          description: 'Users who can edit this playlist'
        },
        {
          name: 'createdAt',
          type: 'LocalDateTime',
          description: 'Creation timestamp'
        }
      ],
      methods: [
        {
          name: 'addSong(song, position)',
          returns: 'void',
          description: 'Adds a song at specified position (or end)'
        },
        {
          name: 'removeSong(songId)',
          returns: 'void',
          description: 'Removes a song from the playlist'
        },
        {
          name: 'reorder(songId, newPosition)',
          returns: 'void',
          description: 'Moves a song to a new position'
        },
        {
          name: 'shuffle()',
          returns: 'void',
          description: 'Randomly reorders all songs'
        }
      ]
    },
    {
      name: 'Subscription',
      description: 'Subscription plan with features, billing details, and access controls for content quality and offline use.',
      fields: [
        {
          name: 'plan',
          type: 'SubscriptionPlan',
          description: 'FREE, PREMIUM, FAMILY'
        },
        {
          name: 'active',
          type: 'boolean',
          description: 'Whether subscription is currently active'
        },
        {
          name: 'startDate',
          type: 'LocalDate',
          description: 'Subscription start date'
        },
        {
          name: 'renewalDate',
          type: 'LocalDate',
          description: 'Next billing date'
        },
        {
          name: 'maxDevices',
          type: 'int',
          description: 'Maximum simultaneous streams'
        }
      ],
      methods: [
        {
          name: 'canStreamHighQuality()',
          returns: 'boolean',
          description: 'Returns true for premium plans'
        },
        {
          name: 'canDownloadOffline()',
          returns: 'boolean',
          description: 'Returns true for premium plans'
        },
        {
          name: 'getAdFree()',
          returns: 'boolean',
          description: 'Returns true for premium plans'
        }
      ]
    },
    {
      name: 'RecommendationEngine',
      description: 'Generates personalized song recommendations using collaborative filtering, genre affinity, and listening history analysis.',
      fields: [
        {
          name: 'strategies',
          type: 'List<RecommendationStrategy>',
          description: 'Multiple recommendation algorithms combined'
        }
      ],
      methods: [
        {
          name: 'getRecommendations(user, limit)',
          returns: 'List<Song>',
          description: 'Returns personalized song recommendations'
        },
        {
          name: 'getSimilarSongs(song, limit)',
          returns: 'List<Song>',
          description: 'Finds songs similar to a given song'
        },
        {
          name: 'getTrendingSongs(genre, limit)',
          returns: 'List<Song>',
          description: 'Returns trending songs globally or by genre'
        }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Strategy',
      used: true,
      explanation: 'SubscriptionStrategy interface — FreeSubscriptionStrategy (1 stream, ads, 6 skips/hour, no downloads), PremiumSubscriptionStrategy (2 streams, ad-free, unlimited skips, downloads, lossless audio), FamilySubscriptionStrategy (6 streams, ad-free, downloads, high-quality audio). PlaybackService and MusicStreamingService call only the interface — maxConcurrentStreams(), canSkip(), isAdFree(), canDownloadOffline(), audioQuality() — never branch on the SubscriptionPlan enum directly.'
    },
    {
      name: 'Factory',
      used: true,
      explanation: 'SubscriptionStrategyFactory resolves a SubscriptionPlan to its concrete SubscriptionStrategy via an EnumMap built once in the constructor — the same shape as splitwise.strategy.SplitStrategyFactory. A new tier (e.g. Student) is a new implementation registered in the factory; nothing calling getStrategy() changes.'
    },
    {
      name: 'Observer',
      used: true,
      explanation: 'PlaybackEventListener is notified by PlaybackService whenever a stream starts. ListeningHistoryListener appends the play to the user\'s listening history; PlayCountListener bumps the song\'s global play count for trending/recommendation ranking. PlaybackService holds no reference to either — Spring injects every registered listener, so a new side effect (analytics, notifications) plugs in without touching the playback code path.'
    },
    {
      name: 'Singleton',
      used: true,
      explanation: 'MusicStreamingService, PlaybackService, RecommendationService and SubscriptionStrategyFactory are Spring-managed singleton beans, giving every request the same catalog, subscription rules and playback-lock state.'
    },
    {
      name: 'Proxy',
      used: false,
      explanation: 'A StreamProxy could enforce subscription-based quality limits at the network layer instead of returning an AudioQuality value from the strategy. Not needed here since the strategy already governs quality; would matter if audio actually streamed through a CDN edge.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'StreamingService orchestrates. Song holds track metadata. Playlist manages song order. User handles profile and history. Subscription defines access. RecommendationEngine suggests songs.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'New subscription plans implement SubscriptionPlan interface. New recommendation strategies implement RecommendationStrategy. New audio quality levels can be added. Core streaming unchanged.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'StreamingService depends on SubscriptionPlan and RecommendationStrategy abstractions. User depends on Song and Playlist abstractions. High-level services don\'t depend on low-level implementations.'
    },
    {
      name: 'DRY (Don\'t Repeat Yourself)',
      description: 'Feature access logic (canStream, canDownload) is centralized in Subscription plans. Audio streaming quality logic is in one place. Recommendation scoring is in RecommendationEngine.'
    },
    {
      name: 'Liskov Substitution (LSP)',
      description: 'Any SubscriptionPlan (Free, Premium, Family) can substitute another without breaking StreamingService. Any RecommendationStrategy is interchangeable.'
    }
  ],
  oopConcepts: [
    {
      name: 'Polymorphism — Subscription Plans',
      description: 'StreamingService calls canStreamHighQuality(), canDownloadOffline() on SubscriptionPlan interface. FreePlan, PremiumPlan, FamilyPlan each implement feature access differently.',
      alternative: 'Could use boolean flags on User. Strategy pattern is chosen because plans have complex interdependencies (device limits, audio quality, ads) that are naturally encapsulated per plan.'
    },
    {
      name: 'Composition over Inheritance',
      description: 'User has-a Subscription, List of Playlist, List of Song (liked). Playlist has-a List of Song, List of User (collaborators). Song has-a Artist and Album. Domain is built by composing entities.',
      alternative: 'Could create PremiumUser extending User. Composition is chosen because subscription is a cross-cutting concern — users can change plans without changing identity.'
    },
    {
      name: 'Encapsulation — DRM / Offline Content',
      description: 'DownloadManager encapsulates DRM encryption and license management. Downloaded songs are encrypted and tied to the user\'s device. External code cannot access raw audio files.',
      alternative: 'Could store plain audio files with simple access control. Encapsulated DRM is chosen because content licensing requires encryption and device binding.'
    }
  ],
  extensibility: [
    {
      area: 'New Subscription Plan',
      description: 'Implement SubscriptionPlan interface (e.g., StudentPlan with discount, HiFiPlan with lossless audio). Existing feature checks work polymorphically without modifying StreamingService.',
      difficulty: 'Easy'
    },
    {
      area: 'Podcasts / Audio Books',
      description: 'Add Podcast and Episode entities extending Song-like structure. Podcast catalog integrates with search. Playback and playlist models work unchanged. Recommendation engine extended with podcast affinity.',
      difficulty: 'Medium'
    },
    {
      area: 'Social Features',
      description: 'Add shared playlists, friend activity feed, listening parties. Reuse existing User, Playlist, and Song models. New social graph built on existing entities.',
      difficulty: 'Medium'
    },
    {
      area: 'Recommendation Engine (ML)',
      description: 'Implement collaborative filtering or neural network-based recommendation strategy. User-song affinity matrix computed from listening history. Existing RecommendationStrategy interface accommodates new algorithms.',
      difficulty: 'Hard'
    }
  ]
};
