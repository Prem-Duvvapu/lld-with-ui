// Sequence diagram content for ttl-cache.
// Grounded directly in TtlCache primitive (ConcurrentHashMap + ScheduledExecutorService eviction).
export default {
  title: 'TTL Cache — Expiration Scheduling & Background Task Eviction',
  description:
    'How TtlCache manages item lifespans using ScheduledExecutorService to asynchronously evict expired keys without blocking active reads or memory leaks.',
  flows: [
    {
      id: 'ttl-cache-eviction',
      label: 'Put item with TTL → Read before TTL → Eviction after TTL expires',
      description:
        'Key "session-token" is added with TTL=5000ms. A ScheduledFuture is registered. A get() within 2s returns the cached value. At t=5001ms, the scheduled task fires, removing the key from the map and freeing resources.',
      participants: [
        { id: 'client', name: 'Client Thread', kind: 'actor' },
        { id: 'cache', name: 'TtlCache\n(Primitive)', kind: 'component', stereotype: 'primitive' },
        { id: 'store', name: 'ConcurrentHashMap\n(Cache Store)', kind: 'store' },
        { id: 'scheduler', name: 'ScheduledExecutor\nService', kind: 'component', stereotype: 'executor' },
      ],
      steps: [
        { from: 'client', to: 'cache', text: 'put("session-token", "xyz123", ttl=5000ms)' },
        { from: 'cache', to: 'store', text: 'put("session-token", CacheEntry {value: "xyz123", expiry: now+5s})' },
        { from: 'cache', to: 'scheduler', text: 'scheduleEviction("session-token", delay=5000ms)', activate: 'scheduler' },
        { from: 'client', to: 'cache', text: 'get("session-token") [at t=2000ms]' },
        { from: 'cache', to: 'store', text: 'get("session-token")' },
        { from: 'store', to: 'cache', text: 'CacheEntry {value: "xyz123", isValid: true}', type: 'return' },
        { from: 'cache', to: 'client', text: 'return "xyz123"', type: 'return' },
        { type: 'note', over: ['scheduler'], text: '5000ms elapse. Scheduled task executes on worker thread.' },
        { from: 'scheduler', to: 'store', text: 'remove("session-token") — key evicted from memory', deactivate: 'scheduler' },
        { from: 'client', to: 'cache', text: 'get("session-token") [at t=5500ms]' },
        { from: 'cache', to: 'store', text: 'get("session-token")' },
        { from: 'store', to: 'cache', text: 'return null', type: 'return' },
        { from: 'cache', to: 'client', text: 'return null (Expired)', type: 'return' },
      ],
    },
  ],
};
