// classDiagrams — cachelibrary
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Generic Cache Library — Class Diagram',
  classes: [
    {
      name: 'CacheBuilder<K,V>',
      stereotype: 'builder',
      fields: [
        '- maximumSize: int',
        '- evictionPolicy: EvictionPolicyType',
        '- ttlSeconds: long',
        '- shardCount: int',
        '- withStats: boolean',
        '- evictionListeners: List<Consumer<K>>',
      ],
      methods: [
        '+ newBuilder(): CacheBuilder<K,V>',
        '+ maximumSize(size): CacheBuilder<K,V>',
        '+ evictionPolicy(type): CacheBuilder<K,V>',
        '+ ttlSeconds(seconds): CacheBuilder<K,V>',
        '+ shardCount(count): CacheBuilder<K,V>',
        '+ withStats(): CacheBuilder<K,V>',
        '+ onEviction(listener): CacheBuilder<K,V>',
        '+ build(): Cache<K,V>',
      ],
    },
    {
      name: 'Cache<K,V>',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ get(key): V',
        '+ put(key, value): void',
        '+ remove(key): void',
        '+ size(): int',
        '+ clear(): void',
      ],
    },
    {
      name: 'ShardedCache<K,V>',
      stereotype: 'component',
      fields: [
        '- shards: Shard<K,V>[]',
        '- shardCount: int',
        '- ttlMillis: long',
        '- evictionListener: Consumer<K>',
      ],
      methods: ['+ get/put/remove/size/clear(...)  // implements Cache<K,V>'],
    },
    {
      name: 'Shard<K,V>',
      stereotype: 'internal',
      fields: [
        '- capacity: int',
        '- evictionPolicy: EvictionPolicy<K>',
        '- entries: Map<K, CacheEntry<V>>',
        '- lock: ReentrantLock',
      ],
      methods: [
        '+ get(key, ttlMillis): V',
        '+ put(key, value, ttlMillis): K  // returns the evicted key, or null',
      ],
    },
    {
      name: 'StatsDecorator<K,V>',
      stereotype: 'decorator',
      fields: ['- delegate: Cache<K,V>', '- stats: CacheStats'],
      methods: ['+ get/put/remove/size/clear(...)  // implements Cache<K,V>, delegates + counts'],
    },
    {
      name: 'CacheStats',
      fields: ['- hits: AtomicLong', '- misses: AtomicLong', '- evictions: AtomicLong'],
      methods: ['+ getHits/getMisses/getEvictions(): long'],
    },
    {
      name: 'EvictionPolicy<K>',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ onAccess(key): void',
        '+ onInsert(key): void',
        '+ onRemove(key): void',
        '+ evictionCandidate(): K',
      ],
    },
    {
      name: 'LruEvictionPolicy<K>',
      fields: ['implements EvictionPolicy<K>'],
      methods: ['+ evictionCandidate(): K  // LinkedHashMap access order'],
    },
    {
      name: 'LfuEvictionPolicy<K>',
      fields: ['implements EvictionPolicy<K>'],
      methods: ['+ evictionCandidate(): K  // min frequency, ties broken by insertion order'],
    },
    {
      name: 'FifoEvictionPolicy<K>',
      fields: ['implements EvictionPolicy<K>'],
      methods: ['+ evictionCandidate(): K  // ignores access entirely'],
    },
    {
      name: 'EvictionPolicyFactory',
      stereotype: 'factory',
      fields: [],
      methods: ['+ create(type): EvictionPolicy<K>  // always a NEW instance, never a shared singleton'],
    },
    {
      name: 'EvictionPolicyType',
      stereotype: 'enum',
      fields: ['LRU', 'LFU', 'FIFO'],
      methods: [],
    },
    {
      name: 'CacheLibraryService',
      stereotype: 'service',
      fields: ['- repository: CacheLibraryRepository'],
      methods: [
        '+ configure(config): CacheConfig',
        '+ get(key): String',
        '+ put(key, value): void',
        '+ getStats(): CacheStats',
      ],
    },
    {
      name: 'CacheLibraryRepository',
      stereotype: 'repository',
      fields: ['- cache: Cache<String,String>', '- stats: CacheStats', '- config: CacheConfig'],
      methods: ['+ configure(config, cache, stats): void', '+ getCache(): Cache<String,String>'],
    },
  ],
  relationships: [
    { from: 'CacheBuilder<K,V>', to: 'ShardedCache<K,V>', label: 'builds' },
    { from: 'CacheBuilder<K,V>', to: 'StatsDecorator<K,V>', label: 'optionally wraps result in' },
    { from: 'CacheBuilder<K,V>', to: 'EvictionPolicyType', label: 'configured with' },
    { from: 'ShardedCache<K,V>', to: 'Cache<K,V>', label: 'implements', dashed: true },
    { from: 'StatsDecorator<K,V>', to: 'Cache<K,V>', label: 'implements + delegates to', dashed: true },
    { from: 'StatsDecorator<K,V>', to: 'CacheStats', label: 'updates' },
    { from: 'ShardedCache<K,V>', to: 'Shard<K,V>', label: 'partitions keys across' },
    { from: 'Shard<K,V>', to: 'EvictionPolicy<K>', label: 'owns one, asks for eviction candidate' },
    { from: 'LruEvictionPolicy<K>', to: 'EvictionPolicy<K>', label: 'implements', dashed: true },
    { from: 'LfuEvictionPolicy<K>', to: 'EvictionPolicy<K>', label: 'implements', dashed: true },
    { from: 'FifoEvictionPolicy<K>', to: 'EvictionPolicy<K>', label: 'implements', dashed: true },
    { from: 'EvictionPolicyFactory', to: 'EvictionPolicy<K>', label: 'mints a fresh instance of' },
    { from: 'CacheLibraryService', to: 'CacheBuilder<K,V>', label: 'configures via' },
    { from: 'CacheLibraryService', to: 'CacheLibraryRepository', label: 'reads/writes' },
    { from: 'CacheLibraryRepository', to: 'Cache<K,V>', label: 'holds the live instance of' },
  ],
};
