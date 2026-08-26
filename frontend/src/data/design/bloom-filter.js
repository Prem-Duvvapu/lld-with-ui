// designDetails — bloom-filter
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Concurrent Bloom Filter — Design Details',
  tldr: [
    'A genuine Bloom filter built from scratch on java.util.BitSet — two independent, fully deterministic hash functions (String.hashCode() and a hand-written 32-bit FNV-1a) combined via Kirsch–Mitzenmacher double hashing to derive k bit positions per item',
    'A single ReentrantLock guards the shared BitSet, since BitSet is not thread-safe and multiple adder threads set bits concurrently — every attempt, per-bit check and completion is recorded from inside the critical section so reported bit counts are never racy',
    'A run service spins up real adder Thread objects that add a fixed deterministic word batch, then deterministically hunts down a genuine false positive by scanning probe-0..probe-999 against the real, populated filter and stopping at the first hit',
    'The central design property is the asymmetric probabilistic guarantee: mightContain() NEVER false-negatives for an item genuinely added, but CAN false-positive for an item never added — because a shared bit can be set by more than one item\'s hash positions',
    'The frontend replays the exact recorded trace it gets back from POST /run and renders the discovered false positive with real visual weight, since watching a Bloom filter "lie" about presence is the whole point of the demo'
  ],
  requirements: [
    'add(item) must insert an item into the filter by setting k deterministically-derived bit positions',
    'mightContain(item) must return false with 100% certainty for anything genuinely never added (no false negatives, ever)',
    'mightContain(item) may return true for an item never added, if all of its k positions happen to already be set by other items (a false positive) — this must be observable, not hidden',
    'The two hash functions must be independent of each other and of JVM identity hashing, and fully deterministic across runs so a discovered false positive reliably reproduces',
    'Multiple threads must be able to add() concurrently without corrupting the shared bit array',
    'Every meaningful state transition (attempt, per-bit set/collision, completion, query hit/miss/result) must be observable with a timestamp and thread identity for diagnostics/visualization',
    'A run must complete in bounded time (seconds) so it can be driven synchronously over HTTP',
    'The false-positive search itself must be a genuine, traced query against the real filter — not a canned or precomputed answer'
  ],
  entities: [
    {
      name: 'BloomFilter',
      description: 'The primitive itself. A fixed-size BitSet guarded by one ReentrantLock, with two independent hash functions combined via double hashing to compute k positions per item.',
      fields: [
        { name: 'bitSize (m)', type: 'int', description: 'Total number of bits in the underlying array' },
        { name: 'hashCount (k)', type: 'int', description: 'Number of bit positions derived and set/checked per item' },
        { name: 'bits', type: 'BitSet', description: 'The shared bit array; not thread-safe on its own, hence the lock' },
        { name: 'lock', type: 'ReentrantLock', description: 'Guards every read and write of bits — the only thing making concurrent add() safe' },
        { name: 'recorder', type: 'TraceRecorder', description: 'Reports every attempt/bit-event/result from inside the critical section' }
      ],
      methods: [
        { name: 'add(item)', returns: 'void', description: 'Computes k positions via double hashing, sets each unset one, records BIT_ALREADY_SET/BIT_NEWLY_SET per position' },
        { name: 'mightContain(item)', returns: 'boolean', description: 'Checks each of the k positions in order; short-circuits to false on the first unset bit; true only if every position is set' },
        { name: 'cardinalityEstimate()', returns: 'int', description: 'BitSet.cardinality() under the lock — how many bits are currently set, a fill-factor signal' }
      ]
    },
    {
      name: 'Double Hashing (Kirsch–Mitzenmacher)',
      description: 'Rather than implementing k independent hash functions, the filter derives all k positions from exactly two: position_i = floorMod(h1 + i*h2, bitSize) for i in 0..k-1. This is a well-known technique proven to give false-positive rates statistically indistinguishable from k truly independent hashes, at a fraction of the implementation cost.',
      fields: [
        { name: 'h1(item)', type: 'int', description: 'Java\'s specified String.hashCode() polynomial — deterministic per the JDK spec, not JVM identity hashing' },
        { name: 'h2(item)', type: 'int', description: 'Hand-written 32-bit FNV-1a over the UTF-8 bytes (offset basis 0x811c9dc5, prime 0x01000193) — fully independent of h1' }
      ],
      methods: []
    },
    {
      name: 'TraceRecorder',
      description: 'Functional callback the filter invokes, still holding its lock, for every attempt/bit-event/result. Keeps the primitive itself free of any HTTP/JSON/orchestration knowledge.',
      fields: [],
      methods: [
        { name: 'record(type, item, bitIndex, bitsSetSoFar)', returns: 'void', description: 'Appends one fact to the run\'s trace; bitIndex is -1 for whole-operation events not about a specific bit' }
      ]
    },
    {
      name: 'TraceEvent',
      description: 'One immutable, ordered, timestamped fact in the trace — the unit the frontend replays.',
      fields: [
        { name: 'sequence', type: 'long', description: 'Assigned from a single shared AtomicLong so cross-thread ordering is unambiguous even on timestamp ties' },
        { name: 'timestamp / elapsedNanos', type: 'Instant / long', description: 'Wall-clock and run-relative timing' },
        { name: 'threadName', type: 'String', description: 'The real Java thread that produced this event, e.g. adder-2' },
        { name: 'type', type: 'EventType', description: 'ADD_ATTEMPT / BIT_ALREADY_SET / BIT_NEWLY_SET / ADD_COMPLETE / QUERY_ATTEMPT / QUERY_BIT_HIT / QUERY_BIT_MISS / QUERY_RESULT_POSITIVE / QUERY_RESULT_NEGATIVE' },
        { name: 'item / bitIndex / bitsSetSoFar', type: 'String / int / int', description: 'What was involved, which bit (or -1), and the total bit count at that instant' }
      ],
      methods: []
    },
    {
      name: 'QueryOutcome',
      description: 'The result of one mightContain() call made after the concurrent add phase joins, paired with whether the item was genuinely part of the add batch. falsePositive is derived: true only when wasAdded is false but mightContain is true.',
      fields: [
        { name: 'item', type: 'String', description: 'The word queried' },
        { name: 'wasAdded', type: 'boolean', description: 'Whether this item was genuinely part of the fixed add batch' },
        { name: 'mightContain', type: 'boolean', description: 'What the filter genuinely reported' },
        { name: 'falsePositive', type: 'boolean', description: '!wasAdded && mightContain — the central story of the demo' }
      ],
      methods: []
    },
    {
      name: 'BloomFilterService',
      description: 'Orchestrates one run: builds a fresh BloomFilter, starts real adder Threads against it round-robin over a fixed deterministic word batch, joins them, then deterministically searches for a false positive and assembles every QueryOutcome.',
      fields: [
        { name: 'ITEM_BATCH', type: 'List<String>', description: 'Fixed 10-word batch every run adds, e.g. apple/banana/cherry/... — deterministic so results reproduce' },
        { name: 'TRUE_NEGATIVE_CANDIDATES', type: 'List<String>', description: 'Fixed words guaranteed absent from ITEM_BATCH, used to demonstrate correct negatives' },
        { name: 'MAX_BIT_SIZE / MAX_HASH_COUNT / MAX_ADD_THREADS', type: 'int', description: 'Safety ceilings so a run always finishes in seconds, not longer' }
      ],
      methods: [
        { name: 'run(RunRequest)', returns: 'RunResult', description: 'Validates parameters, starts adder threads, joins, hunts probe-0..probe-999 for a genuine false positive (stopping at the first hit), queries every added/true-negative/found-probe item, returns the full ordered trace' }
      ]
    },
    {
      name: 'BloomFilterController',
      description: 'REST facade — POST /api/concurrency/bloom-filter/run executes a bounded, synchronous run and returns the RunResult as JSON.',
      fields: [],
      methods: [
        { name: 'run(RunRequest)', returns: 'ResponseEntity<RunResult>', description: 'Delegates to BloomFilterService.run and returns 200 with the full trace' }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Monitor Object (Lock-guarded shared state)',
      used: true,
      explanation: 'BloomFilter is a textbook monitor: one ReentrantLock guards the entire BitSet, so concurrent add() calls from multiple threads can never interleave a read-then-write on the same bit into a lost update.'
    },
    {
      name: 'Observer (via TraceRecorder callback)',
      used: true,
      explanation: 'The filter never knows who is listening — it just calls TraceRecorder.record() on every event. The service supplies a concrete recorder that appends to a trace list; a test could supply one that trips a CountDownLatch instead.'
    },
    {
      name: 'Facade',
      used: true,
      explanation: 'BloomFilterService hides thread creation, round-robin item assignment, the deterministic false-positive search, and trace assembly behind one run(RunRequest) call; the controller and callers never touch Thread or BitSet directly.'
    },
    {
      name: 'Strategy (double hashing in place of k independent hash functions)',
      used: true,
      explanation: 'Rather than hard-coding k separate hash implementations, the Kirsch–Mitzenmacher combination treats "how to derive position i" as a single reusable formula parameterized by h1, h2 and i — extensible to any k without new code.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'BloomFilter only implements the hashing/bit-setting contract. BloomFilterService only orchestrates threads, the false-positive search, and result assembly. TraceRecorder only records. Nobody mixes concurrency primitives with HTTP concerns.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'New instrumentation (e.g. a recorder that also emits metrics) plugs in via the TraceRecorder functional interface without touching BloomFilter\'s locking or hashing logic at all.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'BloomFilter depends on the TraceRecorder abstraction, not on how or whether events are stored — tests inject a NOOP recorder without changing the filter.'
    },
    {
      name: 'Fail Fast',
      description: 'BloomFilterService validates bitSize/hashCount/addThreads up front and throws a typed InvalidBloomFilterParametersException before a single thread is ever started.'
    },
    {
      name: 'Honesty over a clean demo',
      description: 'If a true-negative candidate happens to collide onto already-set bits, the service reports it as a false positive rather than hiding or excluding it — the whole point of this module is to show the real probabilistic behavior, not a scripted one.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation — lock-guarded bit array',
      description: 'The BitSet is private; every read and write happens under the same ReentrantLock, so no caller can observe or corrupt a torn state during a concurrent add().',
      alternative: 'Could expose the BitSet directly for callers to manipulate, but that would defeat the whole purpose of the lock and let races reappear outside the class.'
    },
    {
      name: 'Composition — Service composes the primitive',
      description: 'BloomFilterService has-a BloomFilter per run; it never subclasses or extends the filter, keeping the primitive reusable outside any orchestration concern.',
      alternative: 'Could bake thread orchestration and the false-positive search into the filter itself, but that would defeat the point of demonstrating the primitive in isolation.'
    },
    {
      name: 'Immutability — TraceEvent / QueryOutcome / RunResult',
      description: 'All three are Java records: once an event or outcome is appended it can never be mutated, which is what makes "replay the trace" and "trust the reported false positive" safe, side-effect-free operations on the frontend.',
      alternative: 'Could use mutable DTOs updated in place, but that would make concurrent recording from multiple adder threads unsafe without extra locking.'
    }
  ],
  extensibility: [
    {
      area: 'Deletable / counting Bloom filter',
      description: 'Swap BitSet for an int[] of small counters instead of single bits; add() increments, a new remove() decrements, and mightContain() checks counter > 0 — supports deletion at the cost of more memory per slot.',
      difficulty: 'Medium'
    },
    {
      area: 'Optimal k/m calculator',
      description: 'Given an expected item count n and a target false-positive rate p, expose a helper computing the theoretically optimal bitSize and hashCount (m = -n·ln(p)/ln(2)^2, k = (m/n)·ln(2)) instead of requiring the caller to guess.',
      difficulty: 'Easy'
    },
    {
      area: 'Scalable Bloom filter',
      description: 'Chain multiple BloomFilter instances of geometrically increasing size, querying all and adding to the newest, so the false-positive rate stays bounded as the item count grows past the original sizing.',
      difficulty: 'Hard'
    },
    {
      area: 'Streaming trace instead of batch',
      description: 'Replace the synchronous "wait for the whole run, return the trace" contract with Server-Sent Events so a much larger bitSize/item batch could be watched live instead of replayed after the fact.',
      difficulty: 'Hard'
    }
  ],
  tradeoffs: [
    'Built the primitive from scratch on BitSet + two hand-rolled hash functions instead of a probabilistic-structures library, because the whole point of this module is to demonstrate the double-hashing technique itself, not to re-export someone else\'s implementation.',
    'Chose double hashing (2 real hash functions combined k ways) over implementing k truly independent hash functions — Kirsch–Mitzenmacher proves this gives statistically equivalent false-positive rates at a fraction of the code.',
    'The item batch, true-negative candidates, and false-positive search are all fixed/deterministic rather than client-supplied, trading flexibility for reproducibility — the demonstrated false positive must be the same every time for a given bitSize/hashCount, not a coin flip.',
    'Query phase runs single-threaded on the calling thread after the concurrent add phase joins, since the interesting concurrency story is entirely in the adds — querying gains nothing from parallelism and this keeps the false-positive search simple to reason about.',
    'A smaller bitSize relative to the item count is what makes the false-positive demo reliable (more collisions) — this is presented honestly as the accuracy/space trade-off, not smoothed over: shrink bitSize or grow hashCount and the story changes.'
  ],
  solid: [
    { principle: 'Single Responsibility', details: 'BloomFilter = hashing + bit-guarding primitive; BloomFilterService = thread orchestration + false-positive search; BloomFilterController = HTTP boundary.' },
    { principle: 'Open/Closed', details: 'New event consumers (metrics, logging, a different frontend) plug in via TraceRecorder without modifying the filter; new k values plug into double hashing without new hash functions.' }
  ]
};
