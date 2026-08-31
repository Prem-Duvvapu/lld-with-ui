// designDetails — ttl-cache
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'TTL Cache — Design Details',
  tldr: [
    'A genuine time-to-live cache backed by a ConcurrentHashMap — expiry is enforced two independent ways: lazily on every get() (checked against wall-clock time before a value is ever returned) and proactively by a real ScheduledExecutorService sweeper running on its own daemon thread',
    'get() never returns a value past its TTL, even in the window before the background sweep has caught up — the lazy check on read is what makes that guarantee absolute rather than "usually true"',
    'A fresh put() on an existing key fully replaces both the value and the TTL clock — there is no partial overwrite',
    'A run service scripts real put()/get() calls, executes the gets from a dedicated driver thread that genuinely sleeps in real time between them, and records every PUT / GET_HIT / GET_MISS_NOT_FOUND / GET_MISS_EXPIRED / BACKGROUND_EVICTION with a real timestamp and the thread it actually happened on',
    'The frontend replays the exact recorded trace returned by POST /run, so the cards and countdown bars on screen reflect what genuinely happened on the JVM — including which events came from the sweeper thread versus the driver thread'
  ],
  requirements: [
    'put(key, value, ttlMillis) stores a value that becomes unreadable once ttlMillis has elapsed',
    'get(key) must never return a value whose TTL has elapsed, regardless of whether a background sweep has run yet',
    'get(key) must distinguish "never existed" from "existed but expired" for observability, even though both return empty to the caller',
    'A background process must proactively reclaim expired entries so memory is not held forever by keys nobody reads again',
    'A fresh put() for an existing key must replace both its value and its TTL — not extend or merge with the old one',
    'Concurrent put/get traffic from multiple threads on overlapping keys must never corrupt state, throw, or return a torn/partial value',
    'The background sweeper must be shut down cleanly with no leaked threads once a cache instance is no longer needed',
    'Every meaningful event (put, hit, miss-not-found, miss-expired, background eviction) must be observable with a timestamp and the responsible thread for diagnostics/visualization'
  ],
  entities: [
    {
      name: 'TtlCache',
      description: 'The primitive itself. A ConcurrentHashMap<String, CacheEntry> for storage, plus one ScheduledExecutorService running a periodic sweep on a dedicated daemon thread.',
      fields: [
        { name: 'store', type: 'ConcurrentHashMap<String, CacheEntry>', description: 'Thread-safe storage; every entry pairs a value with its absolute expiry instant' },
        { name: 'sweeper', type: 'ScheduledExecutorService', description: 'Single-thread scheduled executor running sweepExpired() at a fixed period, on its own daemon thread' },
        { name: 'sweepTask', type: 'ScheduledFuture<?>', description: 'Handle used to cancel the periodic sweep cleanly on shutdown' },
        { name: 'recorder', type: 'TraceRecorder', description: 'Callback invoked for every put/hit/miss/eviction, from whichever thread it genuinely happened on' }
      ],
      methods: [
        { name: 'put(key, value, ttlMillis)', returns: 'void', description: 'Stores value with expiresAt = now + ttlMillis, replacing anything previously under key' },
        { name: 'get(key)', returns: 'Optional<String>', description: 'Returns the live value, or empty — lazily evicting the entry on the spot if its TTL has elapsed' },
        { name: 'size()', returns: 'int', description: 'Current live entry count; does not itself trigger any expiry check' },
        { name: 'shutdown()', returns: 'void', description: 'Cancels the sweep task and shuts the executor down; safe to call more than once' }
      ]
    },
    {
      name: 'CacheEntry',
      description: 'Private, immutable pairing of a stored value with the absolute epoch-millis instant it stops being valid.',
      fields: [
        { name: 'value', type: 'String', description: 'The stored value' },
        { name: 'expiresAtEpochMillis', type: 'long', description: 'Absolute wall-clock instant this entry becomes invalid' }
      ],
      methods: [
        { name: 'isExpiredAt(nowEpochMillis)', returns: 'boolean', description: 'Pure comparison against the given instant — used identically by get() and the sweeper' }
      ]
    },
    {
      name: 'TraceRecorder',
      description: 'Functional callback the cache invokes for every attempt/hit/miss/eviction. Keeps the primitive itself free of any HTTP/JSON/orchestration knowledge.',
      fields: [],
      methods: [
        { name: 'record(type, key, value, ttlMillis, cacheSizeNow)', returns: 'void', description: 'Appends one fact to the run\'s trace; ttlMillis is only non-null for PUT events' }
      ]
    },
    {
      name: 'TraceEvent',
      description: 'One immutable, ordered, timestamped fact in the trace — the unit the frontend replays.',
      fields: [
        { name: 'sequence', type: 'long', description: 'Assigned from a single shared AtomicLong so ordering is unambiguous even across the driver thread and the sweeper thread' },
        { name: 'timestamp / elapsedNanos', type: 'Instant / long', description: 'Wall-clock and run-relative timing' },
        { name: 'threadName', type: 'String', description: 'The real Java thread that produced this event — ttl-run-driver or ttl-cache-sweeper' },
        { name: 'type', type: 'EventType', description: 'PUT / GET_HIT / GET_MISS_NOT_FOUND / GET_MISS_EXPIRED / BACKGROUND_EVICTION' },
        { name: 'key / value / ttlMillis / cacheSize', type: 'String / String / Long / int', description: 'What was involved and the store size at that instant' }
      ],
      methods: []
    },
    {
      name: 'TtlCacheService',
      description: 'Orchestrates one run: builds a fresh TtlCache, executes a scripted list of puts synchronously at time zero, then runs a dedicated driver thread that genuinely sleeps in real time and issues each scripted get at its scheduled offset — all while the cache\'s own sweeper runs independently in the background.',
      fields: [
        { name: 'MIN_SWEEP_INTERVAL_MILLIS/MAX_SWEEP_INTERVAL_MILLIS, MAX_TTL_MILLIS, MAX_OBSERVE_MILLIS', type: 'long', description: 'Safety ceilings so a run always finishes in seconds, not longer' },
        { name: 'RUN_TIMEOUT_SECONDS', type: 'long', description: 'Upper bound the service waits on the driver thread before treating the run as a server-side fault' }
      ],
      methods: [
        { name: 'run(RunRequest)', returns: 'RunResult', description: 'Validates parameters, executes the scripted scenario in real time, returns the full ordered trace' }
      ]
    },
    {
      name: 'TtlCacheController',
      description: 'REST facade — POST /api/concurrency/ttl-cache/run executes a bounded, synchronous run and returns the RunResult as JSON.',
      fields: [],
      methods: [
        { name: 'run(RunRequest)', returns: 'ResponseEntity<RunResult>', description: 'Delegates to TtlCacheService.run and returns 200 with the full trace' }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Observer (via TraceRecorder callback)',
      used: true,
      explanation: 'The cache never knows who is listening — it just calls TraceRecorder.record() on every event. The service supplies a concrete recorder that appends to a trace list; a test can supply a recorder that trips a CountDownLatch on a specific event instead.'
    },
    {
      name: 'Facade',
      used: true,
      explanation: 'TtlCacheService hides scenario scripting, real-time pacing, timeout handling and trace assembly behind one run(RunRequest) call; the controller and callers never touch TtlCache or the driver thread directly.'
    },
    {
      name: 'Lazy + Active (dual) Expiry',
      used: true,
      explanation: 'The canonical TTL-cache pattern: get() enforces expiry lazily so correctness never depends on sweep timing, while a background ScheduledExecutorService reclaims memory proactively so unread expired keys do not live forever.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'TtlCache only implements the store/expire contract. TtlCacheService only orchestrates the scripted run and assembles results. TraceRecorder only records.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'New instrumentation (e.g. a recorder that also emits metrics) plugs in via the TraceRecorder functional interface without touching TtlCache\'s storage or expiry logic at all.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'TtlCache depends on the TraceRecorder abstraction, not on how or whether events are stored — tests inject a NOOP or a latch-tripping recorder without changing the cache.'
    },
    {
      name: 'Fail Fast',
      description: 'TtlCacheService validates sweep interval, TTLs, and scheduled get offsets up front and throws a typed InvalidCacheParametersException before a single thread is ever started.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation — private CacheEntry',
      description: 'CacheEntry is a private static nested class; no caller can construct or mutate one directly, and expiresAtEpochMillis is only ever set once, at construction.',
      alternative: 'Could store value and expiry as two parallel maps, but that would let them drift out of sync under concurrent access.'
    },
    {
      name: 'Composition — Service composes the primitive',
      description: 'TtlCacheService has-a TtlCache per run; it never subclasses or extends the cache, keeping the primitive reusable outside any scenario-scripting concern.',
      alternative: 'Could bake scenario scripting into the cache itself, but that would defeat the point of demonstrating the primitive in isolation.'
    },
    {
      name: 'Immutability — TraceEvent / RunResult / CacheEntry',
      description: 'All three are immutable (records or effectively-final fields): once appended or constructed, none can be mutated, which is what makes "replay the trace" a safe, side-effect-free operation on the frontend.',
      alternative: 'Could use mutable DTOs updated in place, but that would make concurrent recording from the driver thread and the sweeper thread unsafe without extra locking.'
    }
  ],
  extensibility: [
    {
      area: 'Multiple named caches',
      description: 'TtlCacheService currently builds one fresh cache per run; a keyed registry (Map<String, TtlCache>) would let a caller run several independent caches concurrently and address them by id.',
      difficulty: 'Easy'
    },
    {
      area: 'Sliding expiration',
      description: 'Add a variant where a get() extends the TTL (like a session timeout) instead of only ever counting down from put() — requires get() to also write, changing it from a pure read.',
      difficulty: 'Medium'
    },
    {
      area: 'Size-bounded eviction',
      description: 'Combine TTL expiry with an LRU cap so the cache also evicts on capacity pressure, not only on time — would need an access-ordered structure alongside the expiry map.',
      difficulty: 'Medium'
    },
    {
      area: 'Streaming trace instead of batch',
      description: 'Replace the synchronous "wait for the whole run, return the trace" contract with Server-Sent Events so a much longer or slower run could be watched live instead of replayed after the fact.',
      difficulty: 'Hard'
    }
  ],
  tradeoffs: [
    'Chose dual expiry (lazy + background) over either alone: lazy-only would let unread expired keys leak memory forever; sweep-only would let a get() briefly return a stale value if it landed between sweeps.',
    'The sweeper is a single dedicated thread on a fixed period rather than one scheduled task per entry, trading a little worst-case sweep latency (up to one full interval) for a bounded, predictable thread count regardless of how many keys are stored.',
    'Runs are synchronous (the HTTP call blocks until the run finishes) rather than streamed, so parameters are capped (sweep interval 50ms-5s, TTL <= 8s, observed window <= 8s) to keep every run in the seconds range.',
    'A lazy expiry removes only the exact CacheEntry instance it observed (store.remove(key, entry)) rather than an unconditional remove(key), so a concurrent put() that already replaced the entry is never accidentally wiped out by a stale expiry check.'
  ],
  solid: [
    { principle: 'Single Responsibility', details: 'TtlCache = storage + expiry primitive; TtlCacheService = scenario orchestration; TtlCacheController = HTTP boundary.' },
    { principle: 'Open/Closed', details: 'New event consumers (metrics, logging, a different frontend) plug in via TraceRecorder without modifying the cache.' }
  ]
};
