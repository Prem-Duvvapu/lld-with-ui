// Sequence diagram content for concurrent-hashmap.
// Grounded directly in ConcurrentHashMap striped locking (N independent locks across M hash stripes).
export default {
  title: 'Concurrent Hash Map — Lock Striping & Non-Blocking Concurrent Puts',
  description:
    'How StripedConcurrentHashMap achieves high concurrency by partitioning entries across N distinct stripe locks. Threads writing to different stripes execute simultaneously without lock contention.',
  flows: [
    {
      id: 'striped-concurrent-puts',
      label: 'Two threads write to different stripes concurrently without blocking',
      description:
        'Thread T1 puts key "alpha" (maps to Stripe 0). Thread T2 puts key "beta" (maps to Stripe 2). Because each stripe has an independent ReentrantLock, both threads acquire their respective stripe locks and write concurrently without waiting for each other.',
      participants: [
        { id: 'thread1', name: 'Thread 1\n(Key: "alpha")', kind: 'actor' },
        { id: 'thread2', name: 'Thread 2\n(Key: "beta")', kind: 'actor' },
        { id: 'map', name: 'StripedMap\n(16 Stripes)', kind: 'component', stereotype: 'primitive' },
        { id: 'stripe0', name: 'stripeLock[0]', kind: 'lock', stereotype: 'ReentrantLock' },
        { id: 'stripe2', name: 'stripeLock[2]', kind: 'lock', stereotype: 'ReentrantLock' },
        { id: 'buckets', name: 'Segment Buckets', kind: 'store' },
      ],
      steps: [
        { from: 'thread1', to: 'map', text: 'put("alpha", "val1")' },
        { from: 'thread2', to: 'map', text: 'put("beta", "val2")' },
        { from: 'map', to: 'map', text: 'hash("alpha") % 16 → Stripe 0' },
        { from: 'map', to: 'map', text: 'hash("beta") % 16 → Stripe 2' },
        { from: 'map', to: 'stripe0', text: '[T1] stripeLock[0].lock() — ACQUIRED', activate: 'stripe0' },
        { from: 'map', to: 'stripe2', text: '[T2] stripeLock[2].lock() — ACQUIRED (no contention!)', activate: 'stripe2' },
        { type: 'note', over: ['stripe0', 'stripe2'], text: 'Both locks held simultaneously by separate threads.' },
        { from: 'map', to: 'buckets', text: '[T1] write entry ("alpha", "val1") in Bucket 0' },
        { from: 'map', to: 'buckets', text: '[T2] write entry ("beta", "val2") in Bucket 2' },
        { from: 'map', to: 'stripe0', text: '[T1] stripeLock[0].unlock()', deactivate: 'stripe0' },
        { from: 'map', to: 'stripe2', text: '[T2] stripeLock[2].unlock()', deactivate: 'stripe2' },
        { from: 'map', to: 'thread1', text: 'put("alpha") completed ✓', type: 'return' },
        { from: 'map', to: 'thread2', text: 'put("beta") completed ✓', type: 'return' },
      ],
    },
  ],
};
