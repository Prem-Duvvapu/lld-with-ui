// designDetails — lru-cache
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'LRU Cache System — Design Details',
  tldr: [
    'Thread-safe, fixed-capacity in-memory cache with O(1) get/put/remove, guarded end-to-end by one ReentrantLock per LruCache instance.',
    'Runtime-swappable Eviction Strategy pattern: LRU (doubly-linked list with sentinel head/tail), LFU (access-count ranking), and FIFO (insertion order) all implement the same EvictionPolicy interface.',
    'Capacity is validated, not merely clamped — a non-positive capacity throws a typed InvalidCapacityException (400) from both the constructor and setCapacity, instead of the module silently no-op-ing.',
    'Real-time telemetry (hits, misses, evictions, hit rate %) and a rolling 50-entry operation log power the Telemetry/Logs tabs and the 2D animated memory-rack simulation.',
    'A second, fully independent LruCache instance backs the isolated /sim/* endpoints, so the interactive simulation tab can never disturb the primary cache\'s hit/miss statistics.'
  ],
  requirements: [
    'Fixed-capacity cache with configurable maximum size — evicts an entry per the active policy when capacity is reached on insert.',
    'O(1) get(key) — returns the value if present and records the access with the active policy (LRU promotes to MRU head, LFU increments the access count), returns null on a miss.',
    'O(1) put(key, value) — inserts or updates an entry; on insert at capacity, evicts one entry via the active policy first.',
    'Thread-safe operations — every method takes the instance\'s ReentrantLock for its full read-modify-write span, so concurrent get/put/remove/resize cannot corrupt the map or the eviction-policy\'s internal ordering.',
    'setCapacity(n) can shrink the cache at runtime, evicting excess entries immediately; n <= 0 is rejected rather than silently ignored.',
    'setPolicy(type) swaps the active EvictionPolicy at runtime, re-inserting every current node into the new policy so ordering (recency/frequency/insertion-time as the new policy tracks it) is rebuilt without losing data.',
    'Cache statistics — hit count, miss count, hit rate %, eviction count — for the Telemetry tab.'
  ],
  entities: [
    {
      name: 'LruCache<K, V>',
      description: 'The cache engine: capacity, a Map<K, Node<K,V>> for O(1) key lookup, the active EvictionPolicy, a ReentrantLock, hit/miss/eviction counters, and a rolling operation log.'
    },
    {
      name: 'Node<K, V>',
      description: 'Doubly-linked-list element: key, value, prev/next references, access count, createdAt, lastAccessedAt.'
    },
    {
      name: 'EvictionPolicy<K, V>',
      description: 'Strategy interface: keyAccessed, keyInserted, evictKey, removeKey, clear, getOrderedNodes, getType.'
    },
    {
      name: 'LRUEvictionPolicy',
      description: 'Maintains sentinel head (MRU) and tail (LRU) nodes so promotion-on-access and eviction are both O(1) pointer surgery, no scanning.'
    },
    {
      name: 'LFUEvictionPolicy',
      description: 'Tracks per-node access count; evicts the minimum-count node, breaking ties by oldest lastAccessedAt.'
    },
    {
      name: 'FIFOEvictionPolicy',
      description: 'Evicts strictly by insertion order (createdAt), ignoring access pattern entirely — an access never protects an entry from eviction under this policy.'
    },
    {
      name: 'LruCacheException hierarchy',
      description: 'Abstract module base (never thrown directly) plus InvalidCapacityException (400) — the constructor and setCapacity both throw rather than silently accepting a non-positive value.'
    },
    {
      name: 'LruCacheService',
      description: 'Spring facade the controller delegates to. Holds exactly two LruCache instances: the primary cache and a fully independent one backing /sim/*.'
    }
  ],
  designPatterns: [
    {
      name: 'Strategy',
      used: true,
      explanation: 'EvictionPolicy<K,V> with three interchangeable implementations (LRU/LFU/FIFO). LruCache.setPolicy() swaps the active strategy at runtime and replays the current node set into it, so get/put never need to know which policy is active.'
    },
    {
      name: 'Facade',
      used: true,
      explanation: 'LruCacheService is the single surface the controller calls — capacity/policy changes, telemetry, and the isolated sim cache all go through it, never through LruCache directly.'
    },
    {
      name: 'Sandboxed Simulation Instance',
      used: true,
      explanation: 'LruCacheService holds a second LruCache (simCache) that the /sim/* endpoints exclusively operate on, so replaying the demo can never change the primary cache\'s hit-rate/eviction telemetry the Operations/Telemetry tabs show.'
    },
    {
      name: 'Exception Hierarchy',
      used: true,
      explanation: 'The abstract LruCacheException base lets the shared GlobalExceptionHandler map InvalidCapacityException to a real 400 via @ResponseStatus, replacing the previous silent no-op on invalid input.'
    },
    {
      name: 'Sentinel Node',
      used: true,
      explanation: 'LRUEvictionPolicy keeps permanent dummy head/tail Node instances so every detach/promote is unconditional pointer surgery — no null checks for an empty list or a single-element list.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'LruCache owns capacity/locking/statistics; each EvictionPolicy owns exactly one eviction algorithm; Node is a plain data holder with no policy logic of its own.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'A new eviction algorithm (e.g. Random, MRU) is a new EvictionPolicy implementation — LruCache\'s get/put/remove/setCapacity never change to add one.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'LruCache holds an EvictionPolicy<K,V> field — the abstraction — and never references LRUEvictionPolicy/LFUEvictionPolicy/FIFOEvictionPolicy by name outside of setPolicy\'s switch.'
    },
    {
      name: 'Fail Fast',
      description: 'A non-positive capacity is now rejected at the boundary (constructor and setCapacity) with a typed exception, instead of being silently absorbed and only surfacing later as confusing cache behavior.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation',
      description: 'Doubly-linked-list pointer surgery lives entirely inside LRUEvictionPolicy; LruCache never touches a Node\'s prev/next fields directly.'
    },
    {
      name: 'Abstraction',
      description: 'The REST layer exposes GET/PUT/REMOVE/capacity/policy endpoints without exposing any pointer- or lock-level detail.'
    },
    {
      name: 'Polymorphism',
      description: 'LruCache calls keyAccessed/keyInserted/evictKey polymorphically through the EvictionPolicy interface regardless of which concrete strategy is active.'
    }
  ],
  extensibility: [
    {
      area: 'New Eviction Policy',
      description: 'Implement EvictionPolicy<K,V> (e.g. Random, MRU, ARC) and add one more case to LruCache.setPolicy(). get/put/remove stay untouched.',
      difficulty: 'Easy'
    },
    {
      area: 'TTL Expiry',
      description: 'Not implemented today. Would add an expiresAt to Node and a check at get()-time (evict-on-access-if-expired), or a background sweep — see the separate ttl-cache module for a from-scratch TTL primitive.',
      difficulty: 'Medium'
    },
    {
      area: 'Eviction Listener / Observer',
      description: 'Not implemented today. A registered listener notified on evictKey() would let a caller do cleanup or cross-cache invalidation without polling the operation log.',
      difficulty: 'Easy'
    },
    {
      area: 'Distributed Cache',
      description: 'Wrap LruCache behind consistent-hashed key partitioning across nodes, each running its own local LruCache — a substantial redesign, not an in-place extension.',
      difficulty: 'Hard'
    }
  ],
  tradeoffs: [
    'LRUEvictionPolicy uses sentinel head/tail nodes specifically to avoid null checks on an empty or single-element list during detach/promote.',
    'One ReentrantLock guards the whole LruCache instance (map + policy + counters) rather than finer-grained locking — simpler to reason about and fast enough at this scale, at the cost of serializing unrelated keys\' operations against each other.',
    'setPolicy() re-inserts every existing node into the new policy in insertion order, not the old policy\'s order — so switching FROM LFU TO LRU, for example, treats the current membership as freshly inserted rather than preserving frequency-based ranking.',
    'The primary and /sim/* caches are two independent LruCache instances rather than one cache with a "demo mode" flag — simpler to reason about and guarantees the demo can never perturb real telemetry, at the cost of duplicated capacity/policy state to keep in sync if the two are ever meant to mirror each other.'
  ]
};
