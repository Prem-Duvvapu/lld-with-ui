// designDetails — lru-cache
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'LRU Cache System — Design Details',
  tldr: [
    'Production-grade in-memory cache system supporting thread-safe O(1) GET, PUT, REMOVE operations and configurable capacity',
    'Extensible Eviction Strategy pattern enabling dynamic runtime switching between LRU (Least Recently Used), LFU (Least Frequently Used), and FIFO algorithms',
    'Thread-safe storage combining ConcurrentHashMap for O(1) key lookups with a custom Doubly-Linked List guarded by ReentrantLock',
    'Real-time telemetry tracking (hits, misses, evictions, hit rate %) and 2D animated memory rack simulation'
  ],
  requirements: [
    'Fixed-capacity cache with configurable maximum size — evicts least recently used entries when capacity is reached',
    'O(1) get(key) operation — returns value if present, moves accessed item to most-recently-used position, returns null if absent',
    'O(1) put(key, value) operation — inserts or updates entry, evicts LRU entry if at capacity, moves updated entry to MRU position',
    'Thread-safe operations — concurrent reads and writes must not corrupt internal data structures or return stale values',
    'Eviction callback — optional listener notified when an entry is evicted (useful for cleanup or cache coherency)',
    'Cache statistics — hit count, miss count, hit rate, eviction count for performance monitoring',
    'TTL support — entries can expire after a configurable time-to-live, evicted on access if expired'
  ],
  entities: [
    {
      name: 'LruCache',
      description: 'Core cache engine class holding key-value mapping, doubly linked list pointers, lock manager, and metrics.'
    },
    {
      name: 'Node',
      description: 'Doubly linked list element storing key, value, prev/next references, access count, and timestamps.'
    },
    {
      name: 'EvictionPolicy',
      description: 'Strategy interface defining keyAccessed, keyInserted, evictKey, removeKey, and getOrderedNodes.'
    },
    {
      name: 'LRUEvictionPolicy',
      description: 'LRU strategy maintaining Sentinel Head (MRU) and Sentinel Tail (LRU) for O(1) access and eviction.'
    },
    {
      name: 'LFUEvictionPolicy',
      description: 'LFU strategy tracking access counts to evict least frequently used nodes.'
    },
    {
      name: 'FIFOEvictionPolicy',
      description: 'FIFO strategy evicting nodes based strictly on insertion creation timestamp.'
    }
  ],
  designPatterns: [
    {
      name: 'Singleton',
      used: true,
      explanation: 'Cache instances are singletons per configuration (one cache per named region). Ensures all consumers share the same cached data and eviction state.'
    },
    {
      name: 'Strategy',
      used: true,
      explanation: 'EvictionPolicy interface with implementations: LRUEvictionPolicy, LFUEvictionPolicy, FIFOEvictionPolicy, TTLEvictionPolicy. Cache delegates eviction decisions to the policy.'
    },
    {
      name: 'Factory',
      used: true,
      explanation: 'CacheFactory creates configured cache instances with desired capacity, eviction policy, and TTL. Clients don\'t need to assemble internal components manually.'
    },
    {
      name: 'Observer',
      used: true,
      explanation: 'EvictionListener is an observer pattern. When cache evicts an entry, it notifies registered listeners for cleanup or distributed invalidation.'
    },
    {
      name: 'Proxy',
      used: false,
      explanation: 'A CachingProxy could wrap a slow data source (database, remote API). The proxy checks cache first, fetches from source on miss, populates cache. Separates caching from data access logic.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'LRUCache handles public API (get/put). DoublyLinkedList manages node ordering. Node wraps key-value. EvictionPolicy decides eviction. CacheStats tracks metrics. Each has one reason to change.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'New eviction policies implement EvictionPolicy interface. Cache core (HashMap + LinkedList + locking) stays unchanged. Adding LFU or FIFO requires zero changes to base cache logic.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'LRUCache depends on EvictionPolicy and DoublyLinkedList abstractions. It doesn\'t depend on concrete eviction implementations. Factory injects the concrete policy.'
    },
    {
      name: 'DRY (Don\'t Repeat Yourself)',
      description: 'Node manipulation logic (addToFront, removeNode) is centralized in DoublyLinkedList, not duplicated across get/put. Thread-safety is handled once by the ReentrantReadWriteLock.'
    },
    {
      name: 'KISS (Keep It Simple)',
      description: 'Classic HashMap + DoublyLinkedList is the simplest O(1) implementation. Sentinel pattern (dummy head/tail) eliminates null checks for edge cases.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation',
      description: 'Internal list pointer updates and concurrency locks are strictly encapsulated within LruCache methods.'
    },
    {
      name: 'Abstraction',
      description: 'REST API exposes clean GET, PUT, REMOVE endpoints without exposing pointer manipulation details.'
    },
    {
      name: 'Polymorphism',
      description: 'LruCache invokes eviction policy methods polymorphically regardless of active strategy.'
    }
  ],
  extensibility: [
    {
      area: 'New Eviction Policy',
      description: 'Implement EvictionPolicy interface (LFU, FIFO, LIFO, Random). Register with CacheFactory. Core get/put O(1) operations remain unchanged.',
      difficulty: 'Easy'
    },
    {
      area: 'Persistent Cache',
      description: 'Add disk-backed storage. On put, write to both memory and disk. On startup, load entries from disk into memory. In-memory API remains the same.',
      difficulty: 'Medium'
    },
    {
      area: 'Distributed Cache',
      description: 'Wrap LRUCache in a DistributedCache using consistent hashing to partition keys across nodes. Each node runs its own LRUCache internally.',
      difficulty: 'Hard'
    },
    {
      area: 'Cache-aside Loading',
      description: 'Add load(key) method accepting a loader function. On cache miss, loader fetches value, populates cache, and returns. Single API instead of get-then-fetch.',
      difficulty: 'Easy'
    }
  ],
  tradeoffs: [
    'Used custom Doubly-Linked List with Sentinel Head & Tail nodes to guarantee clean O(1) node detachment and head promotion without null checks.',
    'Guarded doubly-linked list mutations with ReentrantLock to prevent concurrency pointer corruption during simultaneous put/get operations.',
    'Decoupled EvictionPolicy into a Strategy interface to allow runtime swapping of eviction rules (LRU, LFU, FIFO) without clearing active cache data.',
    'Maintained in-memory operation logs to enable step-by-step history inspection and simulation replay.'
  ]
};
