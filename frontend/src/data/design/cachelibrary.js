// designDetails — cachelibrary
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Generic Cache Library — Design Details',
  requirements: [
    'Not another single-policy cache demo — this repo already has lru-cache and ttl-cache, each a from-scratch implementation of one fixed algorithm. This module is the LIBRARY DESIGN itself: one Cache<K,V> interface, and a CacheBuilder that composes any eviction policy with optional TTL and optional stats, so a caller writes CacheBuilder.newBuilder().maximumSize(100).evictionPolicy(LFU).withStats().build() and gets a fully working cache without ever touching a concrete class.',
    'Builder Pattern (CacheBuilder): three independent, orthogonal choices — eviction policy (LRU/LFU/FIFO) x TTL (on/off) x stats (on/off) — combine into genuinely different cache shapes from one fluent API.',
    'Strategy Pattern (EvictionPolicy): LRU, LFU and FIFO are interchangeable bookkeeping strategies a Shard consults only when it is actually at capacity.',
    'Decorator Pattern (StatsDecorator): wraps any Cache<K,V> and counts hit/miss/eviction without the wrapped implementation knowing stats exist at all — ShardedCache exposes only a generic eviction-listener callback, never a stats-specific hook.',
    'Segment/Shard-Locked Concurrency: the same throughput idea real ConcurrentHashMap and Guava/Caffeine caches use — partition keys across N independently-locked shards so concurrent operations on different shards never contend, while same-key operations (which always land on the same shard) still serialize correctly.',
    'Isolated Concurrency Simulation: an isolated /api/cachelibrary/sim/* sandbox (a second CacheLibraryRepository instance) with a fill-past-capacity eviction demo, a real TTL expiry wait, a stats readout, and a live multi-shard race.',
  ],
  entities: [
    {
      name: 'CacheBuilder<K,V>',
      description: 'The module\'s centerpiece. Fluent, validating setters; build() assembles a ShardedCache and optionally wraps it in a StatsDecorator.',
      fields: [
        { name: 'evictionListeners', type: 'List<Consumer<K>>', description: 'Composed into one combined listener at build() time — withStats() and onEviction() can both be active simultaneously' },
      ],
      methods: [
        { name: 'build()', returns: 'Cache<K,V>', description: 'Clamps shardCount to never exceed maximumSize (so no shard\'s capacity rounds down to zero), then constructs the cache' },
      ],
    },
    {
      name: 'Shard<K,V>',
      description: 'One segment of a ShardedCache — its own map, its own EvictionPolicy instance, its own ReentrantLock. Package-private; ShardedCache is the only caller.',
      fields: [
        { name: 'lock', type: 'ReentrantLock', description: 'Held across the ENTIRE put() body — the concurrency centerpiece, see Concurrency below' },
      ],
      methods: [
        { name: 'put(key, value, ttlMillis)', returns: 'K', description: 'Returns the evicted key (or null) so ShardedCache can notify its eviction listener outside the lock' },
      ],
    },
    {
      name: 'EvictionPolicy<K>',
      description: 'Tracks whatever bookkeeping the concrete policy needs. Every method is called only while the owning shard\'s lock is held, so implementations need no synchronization of their own.',
      fields: [],
      methods: [
        { name: 'evictionCandidate()', returns: 'K', description: 'LRU: LinkedHashMap access order. LFU: linear scan for minimum frequency, ties broken by insertion order. FIFO: LinkedHashSet insertion order, ignores access entirely' },
      ],
    },
    {
      name: 'StatsDecorator<K,V>',
      description: 'Wraps a delegate Cache<K,V> and a shared CacheStats. get() increments hit/miss based on the delegate\'s return value; eviction counting is wired separately, as an eviction-listener callback CacheBuilder attaches to the underlying ShardedCache.',
      fields: [],
      methods: [],
    },
  ],
  designPatterns: [
    {
      name: 'Builder',
      used: true,
      explanation: 'CacheBuilder is the one entry point for constructing any cache shape this library supports. Every setter validates and returns `this`; build() does the actual composition, including a deliberate shardCount-clamping trade-off (see Trade-offs).',
    },
    {
      name: 'Strategy',
      used: true,
      explanation: 'EvictionPolicy<K> (LRU/LFU/FIFO) is resolved fresh per shard by EvictionPolicyFactory — deliberately NOT the usual EnumMap-of-singletons shape this repo uses elsewhere (see locker.strategy.LockerAllocationStrategyFactory), because eviction policies hold mutable per-shard state that a shared singleton would corrupt across every cache and every shard built anywhere in the process.',
    },
    {
      name: 'Decorator',
      used: true,
      explanation: 'StatsDecorator genuinely wraps and delegates every Cache<K,V> method — it never reaches into ShardedCache\'s internals, and ShardedCache has no notion that stats exist. A cache built without withStats() is a plain ShardedCache with zero decorator overhead.',
    },
    {
      name: 'Factory',
      used: true,
      explanation: 'EvictionPolicyFactory.create(type) resolves EvictionPolicyType to a concrete implementation — the twist (see Strategy above) is that it must mint a new instance every call rather than caching one.',
    },
  ],
  principles: [
    { name: 'Single Responsibility Principle (SRP)', description: 'Shard owns locking and capacity enforcement; EvictionPolicy owns only "which key goes next"; StatsDecorator owns only counting; CacheBuilder owns only composition.' },
    { name: 'Open/Closed Principle (OCP)', description: 'A fourth eviction policy (e.g. a random-eviction policy) is one new EvictionPolicy implementation and one new EvictionPolicyFactory case — no existing policy, Shard, or ShardedCache code changes.' },
    { name: 'Liskov Substitution Principle (LSP)', description: 'Every EvictionPolicy honors the same four-method contract; Shard never needs to know which concrete policy it holds. Every Cache<K,V> (plain ShardedCache or a StatsDecorator around one) is interchangeable to any caller.' },
  ],
  oopConcepts: [
    { name: 'Encapsulation', description: 'CacheEntry and Shard are package-private — nothing outside com.lld.cachelibrary.cache can see a shard\'s internal map or lock directly.' },
    { name: 'Composition over Inheritance', description: 'StatsDecorator composes a Cache<K,V> rather than extending ShardedCache — the textbook reason Decorator exists: stats-tracking is added behavior, not a specialization of what a sharded cache is.' },
    { name: 'Polymorphism', description: 'CacheLibraryService talks to Cache<K,V> and EvictionPolicy<K> purely through their interfaces, never knowing whether it holds a ShardedCache or a StatsDecorator, or which of the three policies is behind a given shard.' },
  ],
  extensibility: [
    { area: 'A fourth eviction policy', description: 'e.g. Random or a size-weighted policy — one new EvictionPolicy implementation, one EvictionPolicyFactory case, one EvictionPolicyType enum constant.', difficulty: 'Easy' },
    { area: 'Async/scheduled TTL sweeping', description: 'TTL is currently enforced lazily (checked only on get()) — a background sweep thread would proactively reclaim expired entries\' shard-slot capacity even for keys nobody reads again, at the cost of a new concurrency surface between the sweeper and in-flight put()s.', difficulty: 'Medium' },
    { area: 'A real, hard global capacity bound', description: 'Today maximumSize is distributed evenly per-shard (see Trade-offs); a hard global bound would need cross-shard coordination on every put — a genuinely different, more expensive design than segment-locking.', difficulty: 'Hard' },
  ],
  tradeoffs: [
    'maximumSize is distributed evenly across shards (at least 1 per shard), not enforced as a single hard global ceiling — the same trade every real segment-locked cache (Guava, Caffeine) makes for lock-free cross-shard throughput. CacheBuilder clamps shardCount to never exceed maximumSize so no shard\'s capacity rounds down to zero, but an unevenly-divisible maximumSize (e.g. 10 across 3 shards -> 3 per shard, 9 total) can leave the library holding slightly fewer entries than configured — documented rather than silently under-designed.',
    'Cache<K,V>#get() returns null on a miss, matching standard java.util.Map/Guava/Caffeine semantics — the demo REST layer (CacheLibraryService#get) is the one that chooses to translate a null into a 404 KeyNotFoundException. Keeping that translation out of the library itself means the library stays reusable somewhere a null-on-miss caller is exactly what\'s wanted.',
    'TTL expiry is lazy (checked only when a key is actually read), not swept proactively by a background thread — simpler and race-free, at the cost of an expired entry still occupying its shard\'s capacity slot until something reads (or evicts) it.',
  ],
  summary: 'A pluggable cache library, not another single-algorithm cache demo: CacheBuilder composes any of three EvictionPolicy strategies with optional TTL and an optional StatsDecorator into one Cache<K,V>. The concurrency centerpiece is a segment/shard-locked design — each shard owns its own map, its own eviction-policy instance, and its own lock, so concurrent operations on different shards never contend with each other while Shard#put holds its lock across the whole "check capacity, evict if needed, insert" sequence, closing the classic check-then-act eviction race a naive two-step implementation would fall into.',
  highlights: [
    'The shard-capacity race proven directly: a 300-round repeated test hammers 20 concurrent distinct-key puts at a single capacity-5 shard and asserts the final size is exactly 5 every round — never more, which is exactly what a broken "check size, then evict-and-insert as two separate locked steps" implementation would overshoot.',
    'Cross-shard independence proven with fully deterministic keys: two threads racing 200 puts each onto two DIFFERENT, precisely-chosen shards (via Integer keys whose hashCode() is their own value) across 200 rounds, asserting no deadlock and zero cross-shard corruption — not left to hash-distribution luck.',
    'A genuinely composable Builder: CacheBuilderTest proves withStats() and onEviction() combine correctly (both fire on the same eviction), that shardCount is silently clamped rather than producing a zero-capacity shard, and that swapping only the EvictionPolicyType produces observably different eviction behavior from the same builder call shape.',
  ],
};
