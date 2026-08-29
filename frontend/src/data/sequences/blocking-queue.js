// Sequence diagram content for blocking-queue.
// Grounded directly in BlockingQueue primitive (ReentrantLock + notFull/notEmpty Conditions),
// and ConcurrencyRunService trace recording.
export default {
  title: 'Blocking Queue — Producer/Consumer Synchronization & Condition Variables',
  description:
    'How BlockingQueue coordinates concurrent producers and consumers using a ReentrantLock with notFull and notEmpty Condition variables to suspend threads when the queue is full or empty.',
  flows: [
    {
      id: 'blocking-queue-sync',
      label: 'Producer enqueues to full queue → Blocks until Consumer dequeues',
      description:
        'Queue capacity is 2 (currently holding [item1, item2]). Producer thread P1 calls put(item3) and awaits on notFull Condition. Consumer thread C1 calls take(), removes item1, and signals notFull, awakening P1 to complete its insertion.',
      participants: [
        { id: 'producer', name: 'Producer Thread\n(Thread-P1)', kind: 'actor' },
        { id: 'consumer', name: 'Consumer Thread\n(Thread-C1)', kind: 'actor' },
        { id: 'queue', name: 'BlockingQueue\n(Capacity: 2)', kind: 'component', stereotype: 'primitive' },
        { id: 'lock', name: 'queueLock\n(ReentrantLock)', kind: 'lock', stereotype: 'ReentrantLock' },
        { id: 'notFull', name: 'notFull\n(Condition)', kind: 'component' },
        { id: 'notEmpty', name: 'notEmpty\n(Condition)', kind: 'component' },
      ],
      steps: [
        { from: 'producer', to: 'queue', text: 'put("item3")' },
        { from: 'queue', to: 'lock', text: 'lock.lock() — ACQUIRED', activate: 'lock' },
        { from: 'queue', to: 'queue', text: 'count == 2 (capacity=2) → QUEUE FULL' },
        { from: 'queue', to: 'notFull', text: 'notFull.await() — P1 releases lock and suspends', deactivate: 'lock' },
        { type: 'note', over: ['producer', 'notFull'], blocked: true, text: 'Thread-P1 is blocked waiting for queue space.' },
        { from: 'consumer', to: 'queue', text: 'take()' },
        { from: 'queue', to: 'lock', text: 'lock.lock() — ACQUIRED by C1', activate: 'lock' },
        { from: 'queue', to: 'queue', text: 'dequeue item1 → count becomes 1' },
        { from: 'queue', to: 'notFull', text: 'notFull.signal() — wakes up P1' },
        { from: 'queue', to: 'lock', text: 'lock.unlock()', deactivate: 'lock' },
        { from: 'queue', to: 'consumer', text: 'return "item1"', type: 'return' },
        { from: 'producer', to: 'lock', text: 'P1 re-acquires lock upon wake-up', activate: 'lock' },
        { from: 'queue', to: 'queue', text: 'enqueue item3 → count becomes 2' },
        { from: 'queue', to: 'notEmpty', text: 'notEmpty.signal() — notifies any waiting consumers' },
        { from: 'queue', to: 'lock', text: 'lock.unlock()', deactivate: 'lock' },
        { from: 'queue', to: 'producer', text: 'put("item3") completed ✓', type: 'return' },
      ],
    },
  ],
};
