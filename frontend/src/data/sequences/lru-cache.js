// Sequence diagram content for lru-cache.
// Grounded directly in LruCacheService, DoublyLinkedList + HashMap synchronization,
// and LRU eviction when capacity is exceeded.
export default {
  title: 'LRU Cache — O(1) Get/Put & Least-Recently-Used Node Eviction',
  description:
    'How LruCache manages constant-time reads and writes while strictly bounding capacity. When put() is invoked on a full cache, the tail node in the doubly linked list is evicted, and new nodes are moved to the head.',
  flows: [
    {
      id: 'lru-eviction-flow',
      label: 'Put on full capacity evicts least-recently-used tail node',
      description:
        'Cache has capacity=3 with entries [C, B, A] (A is LRU tail). put("D", 400) is called. LruCacheService locks the cache, identifies capacity overflow (size=4 > 3), evicts tail node "A" from HashMap and LinkedList, and prepends "D" at the head.',
      participants: [
        { id: 'client', name: 'Client', kind: 'actor' },
        { id: 'controller', name: 'LruCache\nController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'LruCacheService', kind: 'component', stereotype: 'facade' },
        { id: 'lock', name: 'cacheLock', kind: 'lock', stereotype: 'ReentrantLock' },
        { id: 'map', name: 'HashMap\n(Node lookup)', kind: 'store' },
        { id: 'dll', name: 'DoublyLinkedList\n(Recency order)', kind: 'store' },
      ],
      steps: [
        { from: 'client', to: 'controller', text: 'POST /api/lru-cache/put {key: "D", value: "400"}' },
        { from: 'controller', to: 'service', text: 'put("D", "400")', activate: 'service' },
        { from: 'service', to: 'lock', text: 'lock.lock() — ACQUIRED', activate: 'lock' },
        { from: 'service', to: 'map', text: 'get("D") → null (new key)' },
        { from: 'service', to: 'dll', text: 'create Node("D", "400") ; addToHead(nodeD)' },
        { from: 'service', to: 'map', text: 'put("D", nodeD)' },
        { from: 'service', to: 'service', text: 'size = 4 > capacity(3) → EVICTION REQUIRED' },
        { from: 'service', to: 'dll', text: 'removeTail() → returns Node("A", "100")' },
        { from: 'service', to: 'map', text: 'remove("A")' },
        { from: 'service', to: 'lock', text: 'lock.unlock()', deactivate: 'lock' },
        { from: 'service', to: 'controller', text: 'PutResult {key: "D", evictedKey: "A", newSize: 3}', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'client', text: '200 OK — Inserted "D", evicted LRU key "A"', type: 'return' },
      ],
    },
  ],
};
