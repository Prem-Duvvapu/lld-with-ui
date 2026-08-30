// designDetails — socialNetwork
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.
// Grounded directly in the real backend: com.lld.socialnetwork.{model,repository,service,
// observer,exception,controller} — every entity, method and pattern below exists in code,
// not just in this write-up (see AGENTS.md's "SocialNetwork Module" section for file paths).

export default {
  title: 'Social Network — Design Details',
  requirements: [
    'User profiles — id, name, email, bio; create and look up users',
    'Bidirectional friendships — send, accept, and reject friend requests; a friendship exists only after an ACCEPTED request',
    'Duplicate-safe friend requests — sending a second request while one is already PENDING between the same pair, or requesting someone already a friend, is rejected rather than silently creating a second edge',
    'Canonical pair locking — send and accept/reject between the same two users are serialized through one lock keyed by min(userId1,userId2)#max(userId1,userId2), so concurrent requests from either direction can never both succeed and an accept can never be lost',
    'Posts and feed — users create text posts; a user\'s feed shows their own posts plus their friends\' posts, newest first',
    'Engagement — like/unlike a post, add comments',
    'Feed fan-out via Observer — publishing a post notifies an in-app feed-events log and the server log independently, neither aware the other exists',
    'Typed exception hierarchy — every domain failure (unknown user/post/request, duplicate request, already friends, request already resolved) maps to a specific 404/409/400, never a bare 500',
    'Isolated simulation sandbox (/api/social/sim/*) — a second repository/notifier pair, plus a live concurrent-friend-request race, so the interactive demo can never touch live users, posts or friendships'
  ],
  entities: [
    {
      name: 'SocialService',
      description: 'Facade the controller delegates to wholesale. Owns the live repository/notifier pair plus a fully isolated sim sandbox. Live and sim mutations both funnel through shared private helpers (doCreatePost, doSendFriendRequest, doRespondToRequest) so validation, locking and feed fan-out can never drift between the two paths — the same shared-path idiom InventoryService uses.',
      fields: [
        { name: 'repository / simRepository', type: 'SocialRepository', description: 'Live store, and a second isolated store rebuilt from scratch on every simReset()' },
        { name: 'feedNotifier / simFeedNotifier', type: 'FeedNotifier', description: 'The Observer subject each post-creation path publishes a FeedEvent through' },
        { name: 'friendPairLocks', type: 'ConcurrentHashMap<String, ReentrantLock>', description: 'One fair lock per unordered user pair, keyed by min(id1,id2)#max(id1,id2); created via computeIfAbsent' }
      ],
      methods: [
        { name: 'createPost(userId, content)', returns: 'Post', description: 'Validates, persists, then fans a FeedEvent out to every registered observer' },
        { name: 'sendFriendRequest(fromUserId, toUserId)', returns: 'FriendRequest', description: 'Acquires the pair lock, re-checks "already friends" / "already pending" inside it, then creates the request' },
        { name: 'respondToRequest(requestId, accept)', returns: 'FriendRequest', description: 'Acquires the SAME pair lock the send path uses, re-reads the request status inside it, then accepts or rejects' },
        { name: 'simRaceFriendRequests(userId1, userId2, attempts, step)', returns: 'Map', description: 'Fires `attempts` concurrent sendFriendRequest calls at one pair via a CountDownLatch; returns exactly how many won and how many were rejected' }
      ]
    },
    {
      name: 'FeedNotifier',
      description: 'Observer Subject. Fans every FeedEvent out to a CopyOnWriteArrayList<FeedObserver> so publish never locks and one misbehaving observer cannot break the rest — mirrors inventory.observer.StockAlertNotifier.',
      fields: [
        { name: 'observers', type: 'CopyOnWriteArrayList<FeedObserver>', description: 'Every registered observer; Spring injects the live set, the sim sandbox constructs fresh instances' }
      ],
      methods: [
        { name: 'publish(event)', returns: 'void', description: 'Notifies every observer, catching and logging any individual failure so one bad observer cannot break fan-out for the rest' }
      ]
    },
    {
      name: 'FeedObserver (interface)',
      description: 'Two independent implementations subscribe to the same "a friend posted" event stream without knowing about each other: InAppFeedObserver (queryable log behind GET /feed-events, bounded to 100) and LoggingFeedObserver (writes to the server log).',
      fields: [],
      methods: [
        { name: 'onFeedEvent(event)', returns: 'void', description: 'Called by FeedNotifier for every new post; implementations must never throw into the publisher and must never mutate social-graph state' }
      ]
    },
    {
      name: 'User',
      description: 'Lombok @Data/@Builder model: id, name, email, bio.',
      fields: [
        { name: 'id', type: 'long', description: 'Assigned by SocialRepository on creation' },
        { name: 'name', type: 'String', description: 'Required, validated non-blank by SocialService' },
        { name: 'email', type: 'String', description: 'Required, validated non-blank by SocialService' },
        { name: 'bio', type: 'String', description: 'Optional' }
      ]
    },
    {
      name: 'Post',
      description: 'Lombok model with two mutation methods (addLike, addComment) alongside the generated accessors. likes is a CopyOnWriteArraySet, comments a CopyOnWriteArrayList — safe for concurrent readers while a single post is being liked/commented from multiple requests.',
      fields: [
        { name: 'authorId', type: 'long', description: 'Owning user' },
        { name: 'likes', type: 'Set<Long>', description: 'CopyOnWriteArraySet of userIds who liked this post' },
        { name: 'comments', type: 'List<Comment>', description: 'CopyOnWriteArrayList, append-only' }
      ]
    },
    {
      name: 'FriendRequest',
      description: 'Lombok model. status starts PENDING and transitions exactly once, to ACCEPTED or REJECTED, under the canonical pair lock.',
      fields: [
        { name: 'fromUserId / toUserId', type: 'long', description: 'Directional — who sent it, who must respond' },
        { name: 'status', type: 'FriendRequest.Status', value: 'PENDING | ACCEPTED | REJECTED', description: 'Enum; ACCEPTED creates a bidirectional friendship edge' }
      ]
    },
    {
      name: 'SocialRepository',
      description: 'In-memory store: ConcurrentHashMap for users/posts/friendRequests/friendships. The no-arg constructor seeds 3 demo users (Alice, Bob, Carol; Alice and Bob already friends) — used both by the live Spring singleton and to rebuild the sim sandbox on every reset, the same "constructor seeds demo data" idiom InventoryRepository uses.',
      fields: [
        { name: 'friendships', type: 'ConcurrentHashMap<Long, Set<Long>>', description: 'Adjacency-list social graph — each user maps to the set of their friends\' ids' },
        { name: 'friendRequests', type: 'ConcurrentHashMap<Long, FriendRequest>', description: 'All requests ever sent, any status' }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Observer',
      used: true,
      explanation: 'FeedNotifier (Subject) fans every FeedEvent out to independent FeedObserver implementations — InAppFeedObserver (the queryable log behind GET /api/social/feed-events, bounded to 100) and LoggingFeedObserver (writes to the server log) — neither aware the other exists. SocialService#createPost never knows how many observers are listening or what they do with the event.'
    },
    {
      name: 'Facade',
      used: true,
      explanation: 'SocialService is the single entrypoint for every mutation; live and sim paths share private helpers (doCreatePost, doSendFriendRequest, doRespondToRequest) so the two can never validate, lock or fan-out differently. The controller only translates HTTP.'
    },
    {
      name: 'Repository',
      used: true,
      explanation: 'SocialRepository abstracts storage behind plain methods (saveUser, createPost, sendFriendRequest, ...); SocialService never touches the underlying ConcurrentHashMaps directly.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'User/Post/Comment/FriendRequest are plain data holders. SocialRepository owns storage. FeedNotifier owns fan-out. SocialService owns orchestration, validation and locking. No class does more than one job.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'A new alert sink (e.g. an email digest of new posts) is added by implementing FeedObserver and registering the bean — FeedNotifier and SocialService are never touched.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'SocialService depends on the FeedObserver abstraction only through FeedNotifier\'s publish(); it never references InAppFeedObserver or LoggingFeedObserver by name.'
    },
    {
      name: 'Liskov Substitution (LSP)',
      description: 'Any FeedObserver implementation is interchangeable wherever FeedNotifier iterates observers — swapping InAppFeedObserver for a different sink changes nothing at the call site.'
    },
    {
      name: 'DRY (Don\'t Repeat Yourself)',
      description: 'Friend-request validation (self-request, already-friends, duplicate-pending) lives once in doSendFriendRequest and is reused by both the live endpoint and every sim endpoint, including the concurrent race.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation — Locking Stays Inside the Service',
      description: 'The friendPairLocks map and the canonical key derivation are private to SocialService; callers (controller, sim engine) never acquire a lock themselves — they just call sendFriendRequest/respondToRequest and get a consistent result.',
      alternative: 'Could expose lock/unlock as service methods and let the controller sequence them. Encapsulating the whole critical section removes any chance a caller forgets to release the lock.'
    },
    {
      name: 'Composition over Inheritance',
      description: 'Post has-a Set<Long> of likes and a List<Comment>; User has-a set of friend ids via the repository\'s adjacency map, not a Set<User> field that would need eager loading. The graph is built by composing simple collections, not a deep class hierarchy.',
      alternative: 'Could model Comment as a subtype of Post ("a comment is a reply-post"). Composition keeps Post and Comment independently sized and independently validated.'
    },
    {
      name: 'Polymorphism — Observer Fan-Out',
      description: 'FeedNotifier.publish(event) calls observer.onFeedEvent(event) on every registered FeedObserver without knowing whether it is InAppFeedObserver, LoggingFeedObserver, or a future implementation.',
      alternative: 'Could hard-code "record to the deque, then print to stdout" inline in SocialService. Polymorphism lets a new sink be added with zero changes to the publishing code.'
    }
  ],
  extensibility: [
    {
      area: 'New Feed Sink',
      description: 'Implement FeedObserver (e.g. a push-notification or email digest sink) and register it as a @Component — FeedNotifier picks it up automatically via constructor injection, matching StockAlertNotifier\'s extension story.',
      difficulty: 'Easy'
    },
    {
      area: 'Feed Ranking',
      description: 'getFeed() currently returns posts newest-first. A ranking Strategy (engagement score, mutual-friend weighting) could replace the single Comparator without changing SocialRepository\'s storage shape.',
      difficulty: 'Medium'
    },
    {
      area: 'Group Friend-Request Batches',
      description: 'The canonical pair lock generalizes to N-way operations by acquiring every pairwise lock in a fixed (e.g. ascending userId) order — the same technique shoppingcart uses for multi-product checkout.',
      difficulty: 'Medium'
    },
    {
      area: 'Persisted Storage',
      description: 'Swap SocialRepository\'s ConcurrentHashMaps for a JPA-backed implementation behind the same method signatures. SocialService, the Observer chain and the exception hierarchy are all storage-agnostic already.',
      difficulty: 'Hard'
    }
  ],
  tradeoffs: [
    'Chose a canonical min/max pair-lock key over a single module-wide lock so unrelated user pairs never contend with each other — the same tradeoff linkedin.service.LinkedInService makes for connection requests.',
    'The friendPairLocks map is shared between the live module and the sim sandbox rather than kept in two separate maps — harmless extra contention across the two independent id spaces in exchange for one simpler map, the same simplification InventoryService\'s per-product lock map makes.',
    'Feed generation is a pull-model (getFeed() filters+sorts on every call) rather than a push-model materialized per-user feed. Simpler and correct at this scale; a real system would materialize feeds and use the Observer fan-out to push into them incrementally.',
    'FeedEvent carries a truncated content preview rather than the full post body, so the telemetry HUD and server log stay compact even for long posts.'
  ]
};
