// classDiagrams — lru-cache
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'LRU Cache System — Class Diagram',
  classes: [
    {
      name: 'LruCacheService',
      stereotype: 'singleton',
      fields: [
        '- cache: LruCache<String, String>',
      ],
      methods: [
        '+ get(key): String',
        '+ put(key, value): void',
        '+ remove(key): boolean',
        '+ clear(): void',
        '+ setCapacity(capacity): void',
        '+ setPolicy(type): void',
        '+ getSnapshot(): Map',
        '+ getStats(): Map',
        '+ batchSimulate(): Map',
        '+ getSimSnapshot(): Map'
      ]
    },
    {
      name: 'LruCache',
      fields: [
        '- capacity: int',
        '- map: ConcurrentHashMap<K, Node<K,V>>',
        '- evictionPolicy: EvictionPolicy<K,V>',
        '- lock: ReentrantLock',
        '- totalHits: long',
        '- totalMisses: long',
        '- totalEvictions: long',
        '- logs: List<Map>'
      ],
      methods: [
        '+ get(key): V',
        '+ put(key, value): void',
        '+ remove(key): boolean',
        '+ setCapacity(capacity): void',
        '+ setPolicy(type): void',
        '+ getSnapshot(): Map'
      ]
    },
    {
      name: 'Node',
      fields: [
        '- key: K',
        '- value: V',
        '- prev: Node<K,V>',
        '- next: Node<K,V>',
        '- accessCount: int',
        '- createdAt: long',
        '- lastAccessedAt: long'
      ],
      methods: [
        '+ incrementAccessCount(): void',
        '+ updateLastAccessedAt(): void'
      ]
    },
    {
      name: 'EvictionPolicy',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ keyAccessed(node): void',
        '+ keyInserted(node): void',
        '+ evictKey(): Node',
        '+ removeKey(node): void',
        '+ getOrderedNodes(): List<Node>',
        '+ getType(): EvictionPolicyType'
      ]
    },
    {
      name: 'LRUEvictionPolicy',
      fields: [
        '- head: Node<K,V>',
        '- tail: Node<K,V>'
      ],
      methods: [
        'implements EvictionPolicy'
      ]
    },
    {
      name: 'LFUEvictionPolicy',
      fields: [
        '- nodes: List<Node<K,V>>'
      ],
      methods: [
        'implements EvictionPolicy'
      ]
    },
    {
      name: 'FIFOEvictionPolicy',
      fields: [
        '- queue: List<Node<K,V>>'
      ],
      methods: [
        'implements EvictionPolicy'
      ]
    },
    {
      name: 'EvictionPolicyType',
      stereotype: 'enum',
      fields: [
        'LRU',
        'LFU',
        'FIFO'
      ],
      methods: []
    },
  ],
  relationships: [
    {
      from: 'LruCacheService',
      to: 'LruCache',
      label: 'delegates to'
    },
    {
      from: 'LruCache',
      to: 'Node',
      label: 'manages map & pointers'
    },
    {
      from: 'LruCache',
      to: 'EvictionPolicy',
      label: 'strategy pattern'
    },
    {
      from: 'LRUEvictionPolicy',
      to: 'EvictionPolicy',
      label: 'implements',
      dashed: true
    },
    {
      from: 'LFUEvictionPolicy',
      to: 'EvictionPolicy',
      label: 'implements',
      dashed: true
    },
    {
      from: 'FIFOEvictionPolicy',
      to: 'EvictionPolicy',
      label: 'implements',
      dashed: true
    },
    {
      from: 'EvictionPolicy',
      to: 'EvictionPolicyType',
      label: 'uses'
    },
    {
      from: 'LRUEvictionPolicy',
      to: 'Node',
      label: 'doubly-linked list HEAD/TAIL'
    },
  ]
};
