// designDetails — musicStreaming
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.
//
// Fixed (2026-08-31, RCA-044) — the entities list (and a few principles/oopConcepts lines)
// described a "StreamingService"/"RecommendationEngine"/"DownloadManager" architecture with
// behavior-owning models (User.likeSong(), Playlist.addSong()/shuffle(), Subscription.
// canStreamHighQuality()) that doesn't exist. The real facade is MusicStreamingService; the real
// User/Song/Playlist/Subscription/PlaybackSession are plain Lombok models holding only id
// references (playlistIds, likedSongIds, artistId/albumId, songIds) with zero methods —
// everything routes through MusicStreamingService, the already-accurately-described
// PlaybackService, RecommendationService (one concrete genre-affinity algorithm, not a pluggable
// Strategy list), and SubscriptionStrategy. There is no DownloadManager or DRM layer — download
// eligibility is one gate (SubscriptionStrategy.canDownloadOffline()) inside
// MusicStreamingService.downloadSong(). The designPatterns section already described the real
// PlaybackService/Observer/SubscriptionStrategy wiring correctly and needed no changes.

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
      name: 'MusicStreamingService',
      description: 'Facade the controller delegates to wholesale. Owns catalog lookups, playlist CRUD, likes and subscription changes directly; playback concurrency is delegated to PlaybackService and recommendations to RecommendationService.',
      fields: [
        {
          name: 'repository',
          type: 'MusicStreamingRepository',
          description: 'Song/artist/album/user/playlist storage'
        },
        {
          name: 'playbackService',
          type: 'PlaybackService',
          description: 'Owns per-user locking around starting/stopping/skipping a stream'
        },
        {
          name: 'recommendationService',
          type: 'RecommendationService',
          description: 'Genre-affinity recommendation algorithm'
        },
        {
          name: 'strategyFactory',
          type: 'SubscriptionStrategyFactory',
          description: 'Resolves a SubscriptionPlan to its SubscriptionStrategy — gates downloads, skips and stream count'
        }
      ],
      methods: [
        {
          name: 'search(query)',
          returns: 'Map<String, Object>',
          description: 'Case-insensitive substring match across song title/artist name, artist name, album title, and public playlist names — returns one map keyed "songs"/"artists"/"albums"/"playlists"'
        },
        {
          name: 'createPlaylist(userId, name) / addSongToPlaylist / removeSongFromPlaylist / reorderPlaylist',
          returns: 'Playlist',
          description: 'All playlist mutation lives here, not on the Playlist model'
        },
        {
          name: 'likeSong(userId, songId) / unlikeSong(userId, songId)',
          returns: 'User',
          description: 'Adds/removes a songId from the user\'s likedSongIds'
        },
        {
          name: 'changeSubscription(userId, plan)',
          returns: 'User',
          description: 'Swaps the user\'s Subscription.plan'
        },
        {
          name: 'downloadSong(userId, songId)',
          returns: 'User',
          description: 'Rejects with DownloadNotAllowedException unless strategyFactory.getStrategy(user\'s plan).canDownloadOffline() is true, otherwise adds the songId to downloadedSongIds — the only "DRM" this module has'
        },
        {
          name: 'getRecommendations(userId, limit)',
          returns: 'List<Song>',
          description: 'Thin delegate to recommendationService.recommendFor()'
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
      name: 'RecommendationService',
      description: 'One concrete genre-affinity algorithm — not a pluggable Strategy family. Builds the set of genres the user already listens to (liked songs + recent history), ranks unheard songs in those genres by global play count, and fills any shortfall with global top plays for a brand-new user with no signal yet.',
      fields: [],
      methods: [
        {
          name: 'recommendFor(repository, user, limit)',
          returns: 'List<Song>',
          description: 'Genre-affinity ranking with a top-plays fallback'
        }
      ]
    },
    {
      name: 'SubscriptionStrategy (+ 3 implementations)',
      description: 'What a tier permits — every feature check that would otherwise be `if (plan == PREMIUM || plan == FAMILY)` scattered through the service lives behind this interface instead. FreeSubscriptionStrategy/PremiumSubscriptionStrategy/FamilySubscriptionStrategy each implement it; SubscriptionStrategyFactory resolves a SubscriptionPlan enum value to one instance.',
      fields: [],
      methods: [
        {
          name: 'maxConcurrentStreams() / skipLimitPerHour() / canSkip(skipsUsedThisHour)',
          returns: 'int / int / boolean',
          description: 'What PlaybackService checks before starting a stream or honoring a skip'
        },
        {
          name: 'isAdFree() / canDownloadOffline() / audioQuality()',
          returns: 'boolean / boolean / AudioQuality',
          description: 'What MusicStreamingService checks before downloading a song or returning playback metadata'
        }
      ]
    },
    {
      name: 'User',
      description: 'Plain Lombok model — no business methods. Likes, listening history and downloads are id references, mutated only through MusicStreamingService/PlaybackService.',
      fields: [
        {
          name: 'id / name / email',
          type: 'String',
          description: 'Identity'
        },
        {
          name: 'subscription',
          type: 'Subscription',
          description: 'Current plan and billing dates'
        },
        {
          name: 'playlistIds / likedSongIds / downloadedSongIds',
          type: 'List<String>',
          description: 'References by id, not embedded objects'
        },
        {
          name: 'listeningHistory',
          type: 'List<ListenEvent>',
          description: 'Appended by ListeningHistoryListener on every stream start — the signal RecommendationService reads'
        },
        {
          name: 'skipsUsedThisHour',
          type: 'int',
          description: 'Checked against SubscriptionStrategy.skipLimitPerHour() by PlaybackService.skip()'
        }
      ],
      methods: []
    },
    {
      name: 'Song',
      description: 'Individual track with metadata, denormalized artist/album name (same convention as concert-ticket\'s Event denormalizing venue name) so rendering a result doesn\'t need a second lookup.',
      fields: [
        {
          name: 'id / title / genre / duration / audioUrl / trackNumber',
          type: 'String / String / Genre / int / String / int',
          description: 'Track metadata'
        },
        {
          name: 'artistId / artistName / albumId / albumTitle',
          type: 'String',
          description: 'Denormalized references — no embedded Artist/Album object'
        },
        {
          name: 'playCount',
          type: 'long',
          description: 'Bumped by PlayCountListener on every stream start; RecommendationService\'s ranking and trending-fallback signal'
        }
      ],
      methods: []
    },
    {
      name: 'Playlist',
      description: 'Plain Lombok model — no business methods. All mutation (add/remove/reorder a song) happens in MusicStreamingService, not on this class. There is no shuffle() anywhere in the module.',
      fields: [
        {
          name: 'id / name / ownerId',
          type: 'String',
          description: 'Identity and creator'
        },
        {
          name: 'songIds',
          type: 'List<String>',
          description: 'Ordered track list, by id'
        },
        {
          name: 'isPublic',
          type: 'boolean',
          description: 'Visibility to other users'
        },
        {
          name: 'collaboratorIds',
          type: 'List<String>',
          description: 'Users who can edit this playlist, by id'
        },
        {
          name: 'createdAt',
          type: 'Instant',
          description: 'Creation timestamp'
        }
      ],
      methods: []
    },
    {
      name: 'Subscription',
      description: 'Plain Lombok model holding only which plan and when — every feature check (quality, skips, downloads, concurrent streams) is resolved through SubscriptionStrategy, not stored or computed here.',
      fields: [
        {
          name: 'plan',
          type: 'SubscriptionPlan',
          description: 'FREE, PREMIUM, FAMILY'
        },
        {
          name: 'active',
          type: 'boolean',
          description: 'Whether the subscription is currently active'
        },
        {
          name: 'startDate / renewalDate',
          type: 'LocalDate',
          description: 'Billing dates'
        }
      ],
      methods: []
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
      description: 'MusicStreamingService orchestrates catalog/playlist/subscription operations. PlaybackService owns stream-session concurrency. RecommendationService owns ranking. SubscriptionStrategy owns feature access per tier.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'New subscription tiers implement SubscriptionStrategy and register with SubscriptionStrategyFactory. New audio quality levels add an AudioQuality enum constant. PlaybackService/MusicStreamingService are unchanged either way.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'PlaybackService and MusicStreamingService depend on the SubscriptionStrategy abstraction (via SubscriptionStrategyFactory), never branching on the SubscriptionPlan enum directly. PlaybackService depends on the PlaybackEventListener abstraction, not on ListeningHistoryListener/PlayCountListener by name.'
    },
    {
      name: 'DRY (Don\'t Repeat Yourself)',
      description: 'Feature-access logic (max streams, skip limit, ad-free, download eligibility, audio quality) is centralized once per tier in its SubscriptionStrategy implementation, never duplicated at a call site. Recommendation scoring is centralized once in RecommendationService.'
    },
    {
      name: 'Liskov Substitution (LSP)',
      description: 'Any SubscriptionStrategy (Free/Premium/Family) can substitute another without breaking PlaybackService or MusicStreamingService — both call only the interface.'
    }
  ],
  oopConcepts: [
    {
      name: 'Polymorphism — Subscription Tiers',
      description: 'PlaybackService and MusicStreamingService call maxConcurrentStreams(), canSkip(), canDownloadOffline() on the SubscriptionStrategy interface. FreeSubscriptionStrategy, PremiumSubscriptionStrategy and FamilySubscriptionStrategy each implement feature access differently.',
      alternative: 'Could use boolean flags or a switch on the SubscriptionPlan enum inline. Strategy is chosen because tiers have several interdependent limits (device count, skip limit, quality, downloads) naturally grouped per tier.'
    },
    {
      name: 'Composition over Inheritance',
      description: 'User has-a Subscription and holds playlistIds/likedSongIds/downloadedSongIds by reference, not embedded objects. Playlist has-a songIds/collaboratorIds list. Song denormalizes its artist/album name rather than embedding those objects.',
      alternative: 'Could create a PremiumUser subclass. Composition is chosen because a subscription is a cross-cutting concern — a user changes plans without changing identity, and ids avoid duplicating song/playlist data across every reference.'
    },
    {
      name: 'Encapsulation — Download Eligibility',
      description: 'MusicStreamingService.downloadSong() is the single gate: it checks SubscriptionStrategy.canDownloadOffline() before adding a songId to downloadedSongIds and throws DownloadNotAllowedException otherwise. No other code path can mark a song downloaded.',
      alternative: 'Could let the controller or User itself decide download eligibility. Centralizing the check in one service method is what makes "only downloadable tiers can download" a single, testable gate rather than a rule every call site has to remember.'
    }
  ],
  extensibility: [
    {
      area: 'New Subscription Plan',
      description: 'Add a SubscriptionPlan enum constant and a matching SubscriptionStrategy implementation (e.g. StudentSubscriptionStrategy with a discount, HiFiSubscriptionStrategy with lossless audio), registered with SubscriptionStrategyFactory. Existing feature checks work polymorphically without modifying PlaybackService or MusicStreamingService.',
      difficulty: 'Easy'
    },
    {
      area: 'Podcasts / Audio Books',
      description: 'Add Podcast and Episode entities alongside Song. Playback and playlist models work unchanged since they only reference songs by id. RecommendationService would need a podcast-affinity signal added alongside genre affinity.',
      difficulty: 'Medium'
    },
    {
      area: 'Social Features',
      description: 'Add shared playlists, friend activity feed, listening parties. Reuse existing User, Playlist, and Song models — they already reference each other by id, which is what a social graph needs.',
      difficulty: 'Medium'
    },
    {
      area: 'Recommendation Engine (ML)',
      description: 'RecommendationService is one concrete class today, not pluggable. Extracting a RecommendationStrategy interface (mirroring SubscriptionStrategy\'s shape) would let a collaborative-filtering or ML-based algorithm be swapped in without touching MusicStreamingService.getRecommendations().',
      difficulty: 'Hard'
    }
  ]
};
