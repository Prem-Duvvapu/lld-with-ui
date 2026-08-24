// designDetails — blocking-queue
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Bounded Blocking Queue — Design Details',
  tldr: [
    'A genuine bounded producer/consumer queue built from scratch on ReentrantLock + two Condition objects (notFull/notEmpty) — not a wrapper around java.util.concurrent',
    'put() and take() really park the calling thread via Condition.await() when the buffer is full/empty; both wait in a while loop so a spurious wakeup re-checks the real state instead of proceeding blindly',
    'A run service spins up real Thread objects as producers and consumers, and every attempt/success/block is recorded with a real timestamp, thread name and queue size — a genuine execution trace, not a scripted animation',
    'Each consumer atomically claims a "slot" before ever calling take(), so total take() calls == total put() calls — the run is provably terminating with no risk of a permanently parked consumer',
    'The frontend replays the exact recorded trace it gets back from POST /run, so what you see on screen is what genuinely happened on the JVM, scaled for pleasant playback'
  ],
  requirements: [
    'Bounded capacity — the queue holds at most N items; a producer must block once the buffer is full',
    'put(item) blocks the calling thread until space is available, then inserts and wakes a waiting consumer',
    'take() blocks the calling thread until an item is available, then removes and returns it, waking a waiting producer',
    'Multiple producer and multiple consumer threads must be supported concurrently without corrupting the buffer',
    'Spurious wakeups must not cause a thread to proceed on a stale condition — every wait re-checks the predicate',
    'FIFO ordering must hold for a single-producer/single-consumer pair',
    'Every meaningful state transition (attempt, success, blocked, full, empty) must be observable with a timestamp and thread identity for diagnostics/visualization',
    'A run must complete in bounded time (seconds) so it can be driven synchronously over HTTP'
  ],
  entities: [
    {
      name: 'BoundedBlockingQueue<T>',
      description: 'The primitive itself. A fixed-size circular Object[] buffer guarded by one ReentrantLock, with two Condition queues for producers and consumers respectively.',
      fields: [
        { name: 'items', type: 'Object[]', description: 'Fixed-size circular buffer holding at most capacity elements' },
        { name: 'capacity', type: 'int', description: 'Maximum number of items the buffer can hold at once' },
        { name: 'count / putIndex / takeIndex', type: 'int', description: 'Current occupancy and the circular buffer\'s next write/read positions' },
        { name: 'lock', type: 'ReentrantLock', description: 'Single lock guarding every read and write of buffer state' },
        { name: 'notFull', type: 'Condition', description: 'Producers await() here while count == capacity; signalled by a successful take()' },
        { name: 'notEmpty', type: 'Condition', description: 'Consumers await() here while count == 0; signalled by a successful put()' }
      ],
      methods: [
        { name: 'put(item)', returns: 'void', description: 'Blocks (while count == capacity) on notFull, inserts, increments count, signals notEmpty' },
        { name: 'take()', returns: 'T', description: 'Blocks (while count == 0) on notEmpty, removes, decrements count, signals notFull' },
        { name: 'size()', returns: 'int', description: 'Snapshot of current occupancy, taken under the lock' }
      ]
    },
    {
      name: 'TraceRecorder',
      description: 'Functional callback the queue invokes, still holding its lock, for every attempt/success/block. Keeps the primitive itself free of any HTTP/JSON/orchestration knowledge.',
      fields: [],
      methods: [
        { name: 'record(type, item, queueSizeNow)', returns: 'void', description: 'Appends one fact to the run\'s trace; the queue calls this from inside the critical section so the reported size is never racy' }
      ]
    },
    {
      name: 'TraceEvent',
      description: 'One immutable, ordered, timestamped fact in the trace — the unit the frontend replays.',
      fields: [
        { name: 'sequence', type: 'long', description: 'Assigned from a single shared AtomicLong so cross-thread ordering is unambiguous even on timestamp ties' },
        { name: 'timestamp / elapsedNanos', type: 'Instant / long', description: 'Wall-clock and run-relative timing, both captured via Instant.now()/System.nanoTime()' },
        { name: 'threadName', type: 'String', description: 'The real Java thread that produced this event, e.g. producer-2' },
        { name: 'type', type: 'EventType', description: 'ENQUEUE_ATTEMPT / ENQUEUE_SUCCESS / ENQUEUE_BLOCKED / DEQUEUE_ATTEMPT / DEQUEUE_SUCCESS / DEQUEUE_BLOCKED / QUEUE_FULL / QUEUE_EMPTY' },
        { name: 'item / queueSize / capacity', type: 'String / int / int', description: 'What was involved and the buffer occupancy at that instant' }
      ],
      methods: []
    },
    {
      name: 'BlockingQueueService',
      description: 'Orchestrates one run: builds a fresh BoundedBlockingQueue, starts real producer and consumer Threads against it, waits for completion, and assembles the ordered RunResult.',
      fields: [
        { name: 'MAX_CAPACITY / MAX_THREADS / MAX_ITEMS_PER_PRODUCER', type: 'int', description: 'Safety ceilings so a run always finishes in seconds, not longer' },
        { name: 'RUN_TIMEOUT_SECONDS', type: 'long', description: 'Upper bound the service waits on Thread.join() before treating the run as a server-side fault' }
      ],
      methods: [
        { name: 'run(RunRequest)', returns: 'RunResult', description: 'Validates parameters, starts threads, blocks until every thread finishes, returns the full ordered trace' }
      ]
    },
    {
      name: 'BlockingQueueController',
      description: 'REST facade — POST /api/concurrency/blocking-queue/run executes a bounded, synchronous run and returns the RunResult as JSON.',
      fields: [],
      methods: [
        { name: 'run(RunRequest)', returns: 'ResponseEntity<RunResult>', description: 'Delegates to BlockingQueueService.run and returns 200 with the full trace' }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Monitor Object (Lock + Condition)',
      used: true,
      explanation: 'BoundedBlockingQueue is a textbook monitor: one ReentrantLock guards all shared state, and two Condition queues let threads wait for specific predicates (notFull, notEmpty) instead of busy-polling.'
    },
    {
      name: 'Producer-Consumer',
      used: true,
      explanation: 'The whole module is the producer-consumer pattern made literal: independent producer and consumer threads coordinate purely through the bounded buffer\'s blocking put()/take() contract.'
    },
    {
      name: 'Observer (via TraceRecorder callback)',
      used: true,
      explanation: 'The queue never knows who is listening — it just calls TraceRecorder.record() on every event. The service supplies a concrete recorder that appends to a trace list; a test can supply a recorder that trips a CountDownLatch instead.'
    },
    {
      name: 'Facade',
      used: true,
      explanation: 'BlockingQueueService hides thread creation, slot-claiming, timeout handling and trace assembly behind one run(RunRequest) call; the controller and callers never touch Thread or Condition directly.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'BoundedBlockingQueue only implements the blocking contract. BlockingQueueService only orchestrates threads and assembles results. TraceRecorder only records. Nobody mixes concurrency primitives with HTTP concerns.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'New instrumentation (e.g. a recorder that also emits metrics) plugs in via the TraceRecorder functional interface without touching BoundedBlockingQueue\'s locking logic at all.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'BoundedBlockingQueue depends on the TraceRecorder abstraction, not on how or whether events are stored — tests inject a NOOP or a latch-tripping recorder without changing the queue.'
    },
    {
      name: 'Fail Fast',
      description: 'BlockingQueueService validates capacity/producers/consumers/itemsPerProducer up front and throws a typed InvalidQueueParametersException before a single thread is ever started.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation — lock-guarded state',
      description: 'count, putIndex, takeIndex and the buffer array are private; every read and write happens under the same ReentrantLock, so no caller can observe or corrupt a torn state.',
      alternative: 'Could expose synchronized getters, but that would let callers read stale state outside the lock that guards consistency.'
    },
    {
      name: 'Composition — Service composes the primitive',
      description: 'BlockingQueueService has-a BoundedBlockingQueue per run; it never subclasses or extends the queue, keeping the primitive reusable outside any orchestration concern.',
      alternative: 'Could bake thread orchestration into the queue itself, but that would defeat the point of demonstrating the primitive in isolation.'
    },
    {
      name: 'Immutability — TraceEvent / RunResult',
      description: 'Both are Java records: once an event is appended it can never be mutated, which is what makes "replay the trace" a safe, side-effect-free operation on the frontend.',
      alternative: 'Could use mutable DTOs updated in place, but that would make concurrent recording from multiple threads unsafe without extra locking.'
    }
  ],
  extensibility: [
    {
      area: 'Multiple named queues',
      description: 'BlockingQueueService currently builds one fresh queue per run; a keyed registry (Map<String, BoundedBlockingQueue<?>>) would let a caller run several independent queues concurrently and address them by id.',
      difficulty: 'Easy'
    },
    {
      area: 'Fairness policy',
      description: 'ReentrantLock supports a fair-ordering constructor flag; swapping new ReentrantLock() for new ReentrantLock(true) would give FIFO lock acquisition among waiting threads at a small throughput cost.',
      difficulty: 'Easy'
    },
    {
      area: 'Timed variants',
      description: 'Add offer(item, timeout)/poll(timeout) using Condition.awaitNanos(), returning false/null on timeout instead of blocking forever — mirrors java.util.concurrent.BlockingQueue\'s timed API.',
      difficulty: 'Medium'
    },
    {
      area: 'Streaming trace instead of batch',
      description: 'Replace the synchronous "wait for the whole run, return the trace" contract with Server-Sent Events so a much longer or slower run could be watched live instead of replayed after the fact.',
      difficulty: 'Hard'
    }
  ],
  tradeoffs: [
    'Built the primitive from scratch on ReentrantLock/Condition instead of wrapping ArrayBlockingQueue, because the whole point of this module is to demonstrate the monitor pattern itself, not to re-export a JDK class.',
    'Consumers atomically claim a slot (AtomicInteger) before calling take(), trading a small amount of orchestration complexity for a hard termination guarantee — no consumer can ever be left parked forever.',
    'Runs are synchronous (the HTTP call blocks until the run finishes) rather than streamed, so parameters are capped (capacity <= 50, threads <= 12, items/producer <= 50) to keep every run in the seconds range.',
    'The trace is recorded inside the lock (not after releasing it) so every reported queue size is exactly what that thread observed — at the cost of doing a little more work per critical section.'
  ],
  solid: [
    { principle: 'Single Responsibility', details: 'BoundedBlockingQueue = locking primitive; BlockingQueueService = thread orchestration; BlockingQueueController = HTTP boundary.' },
    { principle: 'Open/Closed', details: 'New event consumers (metrics, logging, a different frontend) plug in via TraceRecorder without modifying the queue.' }
  ]
};
