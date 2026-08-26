// designDetails — concurrent-hashmap
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Concurrent HashMap (Striped Lock) — Design Details',
  tldr: [
    'A genuine striped-lock concurrent map built from scratch — an array of N independent segments, each guarded by its own java.util.concurrent.locks.ReentrantLock and holding a plain java.util.HashMap<K,V> — not a wrapper around java.util.concurrent.ConcurrentHashMap',
    'Design choice explained: wrapping the JDK class would be one line of code but would teach nothing — it would hide the exact mechanism (segment/bucket locking) this module exists to demonstrate. Building it from scratch mirrors ConcurrentHashMap\'s historical (pre-Java-8) segment-locking design, and gives the frontend a real "N locks, N buckets" visualization to drive instead of an opaque black box',
    'Two threads touching different segments never contend at all — they run in true parallel with zero shared state. Two threads touching the same segment are fully serialized by that one segment\'s lock, so correctness never depends on timing',
    'merge(key, value, remappingFunction) proves "no lost updates": the entire read-modify-write cycle happens under one lock acquisition, so concurrent increments on the same key are impossible to interleave badly — the sum of final counters always equals the total increments attempted',
    'computeIfAbsent(key, mappingFunction) proves "exactly-once computation": the check-then-act (is it absent? then compute) is atomic under the segment lock, so when many threads race the same absent key, exactly one of them ever invokes the mapping function',
    'A run service spins up real Thread objects — incrementer threads hammering merge() and, after a CountDownLatch releases them together, racer threads hammering computeIfAbsent() — and every lock-acquired/released/put/get/merge/compute event is recorded with a real timestamp, thread name, segment index and size. The frontend replays that exact recorded trace, not a scripted animation'
  ],
  requirements: [
    'Partition the key space across N independent lock segments so unrelated keys never contend',
    'put/get/remove must be safe under arbitrary concurrent access from multiple threads',
    'merge(key, value, fn) must be a single atomic read-modify-write — no lost updates under concurrent calls on the same key',
    'computeIfAbsent(key, fn) must invoke fn at most once per key even when many threads race the same absent key simultaneously',
    'No operation may ever hold more than one segment lock at a time, so there is no possible lock-ordering deadlock',
    'size() must report a correct-enough total without holding every segment lock simultaneously',
    'Every meaningful event (lock acquired/released, put/get/remove/merge/compute outcome) must be observable with a timestamp, thread identity and segment index for diagnostics/visualization',
    'A run must complete in bounded time (seconds) so it can be driven synchronously over HTTP'
  ],
  entities: [
    {
      name: 'StripedHashMap<K,V>',
      description: 'The primitive itself. segmentCount independent segments, each a plain HashMap<K,V> guarded by its own ReentrantLock. segmentFor(key) routes every operation to exactly one segment via (key.hashCode() & 0x7fffffff) % segmentCount.',
      fields: [
        { name: 'segmentCount', type: 'int', description: 'Number of independent lock stripes' },
        { name: 'locks', type: 'ReentrantLock[]', description: 'One lock per segment; never more than one held by a thread at a time' },
        { name: 'segments', type: 'Map<K,V>[]', description: 'One plain HashMap per segment, only ever touched while that segment\'s lock is held' },
        { name: 'recorder', type: 'TraceRecorder', description: 'Callback invoked, still holding the segment lock, for every event worth recording' }
      ],
      methods: [
        { name: 'put(key, value)', returns: 'void', description: 'Locks the key\'s segment, stores the value, records PUT_SUCCESS' },
        { name: 'get(key)', returns: 'V', description: 'Locks the key\'s segment, records GET_HIT or GET_MISS, returns the value or null' },
        { name: 'remove(key)', returns: 'V', description: 'Locks the key\'s segment, records REMOVE_SUCCESS or REMOVE_MISS' },
        { name: 'merge(key, value, remappingFunction)', returns: 'V', description: 'Atomic read-modify-write under the segment lock: stores value if absent, else remappingFunction.apply(existing, value) (or removes on a null result) — the no-lost-updates proof' },
        { name: 'computeIfAbsent(key, mappingFunction)', returns: 'V', description: 'Locks the segment; if present, returns the existing value without calling mappingFunction (COMPUTE_IF_ABSENT_SKIPPED); if absent, calls it exactly once and stores the result (COMPUTE_IF_ABSENT_ATTEMPT/COMPUTED) — the exactly-once-computation proof' },
        { name: 'size()', returns: 'int', description: 'Sums each segment\'s size, reading each under that segment\'s own lock — never holding all locks at once' }
      ]
    },
    {
      name: 'TraceRecorder',
      description: 'Functional callback the map invokes, still holding the relevant segment\'s lock, for every event. Keeps the primitive itself free of any HTTP/JSON/orchestration knowledge.',
      fields: [],
      methods: [
        { name: 'record(type, key, valueAfter, segmentIndex, segmentSize, mapSize)', returns: 'void', description: 'Appends one fact to the run\'s trace; the map calls this from inside the critical section so the reported segment size is never racy' }
      ]
    },
    {
      name: 'TraceEvent',
      description: 'One immutable, ordered, timestamped fact in the trace — the unit the frontend replays.',
      fields: [
        { name: 'sequence', type: 'long', description: 'Assigned from a single shared AtomicLong so cross-thread ordering is unambiguous even on timestamp ties' },
        { name: 'timestamp / elapsedNanos', type: 'Instant / long', description: 'Wall-clock and run-relative timing, both captured via Instant.now()/System.nanoTime()' },
        { name: 'threadName', type: 'String', description: 'The real Java thread that produced this event, e.g. incrementer-2 or racer-5' },
        { name: 'type', type: 'EventType', description: 'SEGMENT_LOCK_ACQUIRED / SEGMENT_LOCK_RELEASED / PUT_SUCCESS / GET_HIT / GET_MISS / REMOVE_SUCCESS / REMOVE_MISS / MERGE_SUCCESS / COMPUTE_IF_ABSENT_ATTEMPT / COMPUTE_IF_ABSENT_COMPUTED / COMPUTE_IF_ABSENT_SKIPPED' },
        { name: 'key / valueAfter', type: 'String / String', description: 'The key involved and its value after the operation, if any' },
        { name: 'segmentIndex / segmentSize / mapSize', type: 'int / int / int', description: 'Which segment this happened in, that segment\'s occupancy, and the whole map\'s occupancy at that instant' }
      ],
      methods: []
    },
    {
      name: 'ConcurrentHashMapService',
      description: 'Orchestrates one run in two phases: Phase A starts real "incrementer-N" threads merge-incrementing a small set of shared counter keys; Phase B releases real "racer-N" threads together via a CountDownLatch to race computeIfAbsent() on one shared key. Assembles the ordered RunResult with both correctness proofs.',
      fields: [
        { name: 'MAX_SEGMENTS / MAX_THREADS / MAX_INCREMENTS_PER_THREAD / MAX_DISTINCT_KEYS / MAX_COMPUTE_RACERS', type: 'int', description: 'Safety ceilings so a run always finishes in seconds, not longer' },
        { name: 'RUN_TIMEOUT_SECONDS', type: 'long', description: 'Upper bound the service waits on Thread.join() before treating the run as a server-side fault' }
      ],
      methods: [
        { name: 'run(RunRequest)', returns: 'RunResult', description: 'Validates parameters, runs Phase A (merge contention) then Phase B (computeIfAbsent race), returns the full ordered trace plus sumOfFinalCounters and computeExecutions' }
      ]
    },
    {
      name: 'ConcurrentHashMapController',
      description: 'REST facade — POST /api/concurrency/concurrent-hashmap/run executes a bounded, synchronous run and returns the RunResult as JSON.',
      fields: [],
      methods: [
        { name: 'run(RunRequest)', returns: 'ResponseEntity<RunResult>', description: 'Delegates to ConcurrentHashMapService.run and returns 200 with the full trace' }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Lock Striping',
      used: true,
      explanation: 'The core pattern: instead of one lock guarding the whole map (which would serialize every operation), the key space is partitioned across N independent ReentrantLocks, one per segment. Operations on different segments run in true parallel; only same-segment operations serialize. This is exactly the technique the real ConcurrentHashMap used before Java 8 switched to per-bin CAS/synchronized nodes.'
    },
    {
      name: 'Monitor Object (per segment)',
      used: true,
      explanation: 'Each segment is its own tiny monitor: one ReentrantLock guards exactly one HashMap. There are N independent monitors instead of one map-wide monitor, which is what makes the parallelism real rather than illusory.'
    },
    {
      name: 'Observer (via TraceRecorder callback)',
      used: true,
      explanation: 'StripedHashMap never knows who is listening — it just calls TraceRecorder.record() on every event. The service supplies a concrete recorder that appends to a trace list; a test can supply a recorder that trips a CountDownLatch or increments a counter instead.'
    },
    {
      name: 'Facade',
      used: true,
      explanation: 'ConcurrentHashMapService hides thread creation, latch-gated release, timeout handling and trace assembly behind one run(RunRequest) call; the controller and callers never touch Thread, ReentrantLock or CountDownLatch directly.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'StripedHashMap only implements the locking/storage contract. ConcurrentHashMapService only orchestrates threads and assembles results. TraceRecorder only records. Nobody mixes the concurrency primitive with HTTP concerns.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'New instrumentation (e.g. a recorder that also emits metrics, or a latch-tripping test recorder) plugs in via the TraceRecorder functional interface without touching StripedHashMap\'s locking logic at all.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'StripedHashMap depends on the TraceRecorder abstraction, not on how or whether events are stored — tests inject a NOOP or a counting recorder without changing the map.'
    },
    {
      name: 'Fail Fast',
      description: 'ConcurrentHashMapService validates segments/threads/incrementsPerThread/distinctKeys/computeRacers up front and throws a typed InvalidMapParametersException before a single thread is ever started.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation — segment-guarded state',
      description: 'Each segment\'s HashMap is only ever touched while that segment\'s ReentrantLock is held; no method exposes a segment\'s map or lock directly, so no caller can observe or corrupt a torn state.',
      alternative: 'Could expose synchronized getters per segment, but that would let callers read stale state outside the lock that guards consistency.'
    },
    {
      name: 'Composition — Service composes the primitive',
      description: 'ConcurrentHashMapService has-a StripedHashMap (in fact two, one per phase) per run; it never subclasses or extends the map, keeping the primitive reusable outside any orchestration concern.',
      alternative: 'Could bake thread orchestration into the map itself, but that would defeat the point of demonstrating the primitive in isolation.'
    },
    {
      name: 'Immutability — TraceEvent / RunResult',
      description: 'Both are Java records: once an event is appended it can never be mutated, which is what makes "replay the trace" a safe, side-effect-free operation on the frontend.',
      alternative: 'Could use mutable DTOs updated in place, but that would make concurrent recording from multiple threads unsafe without extra locking.'
    }
  ],
  extensibility: [
    {
      area: 'Resizing (rehashing)',
      description: 'A production striped map would need to grow segmentCount under load and rehash keys across a larger array — this module keeps segmentCount fixed for a run to keep the locking story simple to visualize.',
      difficulty: 'Hard'
    },
    {
      area: 'Fairness policy',
      description: 'ReentrantLock supports a fair-ordering constructor flag; swapping new ReentrantLock() for new ReentrantLock(true) per segment would give FIFO lock acquisition among waiting threads at a small throughput cost.',
      difficulty: 'Easy'
    },
    {
      area: 'Per-key fine-grained locking',
      description: 'Instead of striping by segment, a hash-of-key-to-lock-object scheme (like the real ConcurrentHashMap\'s later bin-level synchronization) would shrink contention further at the cost of many more lock objects.',
      difficulty: 'Medium'
    },
    {
      area: 'Streaming trace instead of batch',
      description: 'Replace the synchronous "wait for the whole run, return the trace" contract with Server-Sent Events so a much longer or slower run could be watched live instead of replayed after the fact.',
      difficulty: 'Hard'
    }
  ],
  tradeoffs: [
    'Built the primitive from scratch on an array of ReentrantLock + plain HashMap instead of wrapping java.util.concurrent.ConcurrentHashMap, because the whole point of this module is to demonstrate the segment-locking mechanism itself, not to re-export a JDK class — a one-line wrapper would visualize nothing.',
    'Chose lock striping (coarse, per-segment) over per-bucket or per-node locking: simpler to reason about and visualize as "N locks, N buckets" at the cost of more contention than the real modern ConcurrentHashMap achieves with its finer-grained bin-level synchronization.',
    'size() locks each segment sequentially rather than all at once, trading a theoretically perfect snapshot for zero deadlock risk — the same tradeoff the real ConcurrentHashMap makes for its own size().',
    'Runs are synchronous (the HTTP call blocks until the run finishes) rather than streamed, so parameters are capped (segments <= 32, threads <= 24, increments/thread <= 200) to keep every run in the seconds range.',
    'The trace is recorded inside each segment\'s own lock (not after releasing it) so every reported segment size is exactly what that thread observed; the cross-segment mapSize field on each event is a best-effort snapshot (not itself lock-protected across segments) to avoid ever acquiring two segment locks at once, which would reintroduce deadlock risk.'
  ],
  solid: [
    { principle: 'Single Responsibility', details: 'StripedHashMap = locking/storage primitive; ConcurrentHashMapService = thread orchestration across two phases; ConcurrentHashMapController = HTTP boundary.' },
    { principle: 'Open/Closed', details: 'New event consumers (metrics, logging, a different frontend) plug in via TraceRecorder without modifying the map.' }
  ]
};
