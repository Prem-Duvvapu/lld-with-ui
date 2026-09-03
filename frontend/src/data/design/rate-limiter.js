// designDetails — rate-limiter
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Rate Limiter — Design Details',
  tldr: [
    'Two real rate-limiting algorithms behind one Strategy interface: Token Bucket (continuous refill, fractional tokens) and Sliding Window Counter (weighted current+previous window estimate)',
    'One RateLimiter instance per client, each owning its own ReentrantLock — unrelated clients never contend, and ConcurrentHashMap.computeIfAbsent makes first-touch client creation atomic without a global lock',
    'A virtual, manually-advanced clock (not System.currentTimeMillis()) drives every algorithm call, so both the concurrency test and the /sim/* demo are fully deterministic',
    'Every endpoint returns a plain, flat DTO (RateLimitDecision / ClientStatus) — never the RateLimiter or its lock itself, avoiding the exact Jackson-serialization pitfall documented in RCA-049',
    'An isolated /sim/* sandbox with its own client, its own repository, and its own virtual clock, so the interactive demo can never corrupt the two production demo clients seeded on boot'
  ],
  requirements: [
    'Support at least two interchangeable rate-limiting algorithms, selectable per client',
    'Token Bucket: a capacity-capped bucket that refills continuously at a configurable rate; a request is allowed only if a full token is available',
    'Sliding Window Counter: a fixed window length and a request limit; estimate the current sliding-window count from the current and previous window\'s counts without storing a timestamp per request',
    'Per-client isolation: one client\'s request volume must never affect another client\'s remaining quota or block on another client\'s lock',
    'Thread-safety: N concurrent requests against the same client must never allow more than the configured capacity/limit through',
    'Every decision must report whether it was allowed, how much capacity remains, and when capacity next resets',
    'An isolated simulation sandbox must demonstrate throttling and refill without touching the real seeded clients',
    'Unknown client ids and invalid configs must fail with a typed, readable exception — never a bare 500'
  ],
  entities: [
    {
      name: 'RateLimiter',
      description: 'Strategy interface every algorithm implements. now (epoch millis) is passed in explicitly rather than read internally, so the /sim/* engine can drive a virtual clock deterministically instead of sleeping in real time.',
      fields: [],
      methods: [
        { name: 'tryAcquire(now)', returns: 'RateLimitDecision', description: 'Attempts to consume one unit of capacity; mutates state only if it succeeds' },
        { name: 'peek(now)', returns: 'RateLimitDecision', description: 'Read-only view of current capacity — never mutates state' },
        { name: 'getConfig()', returns: 'ClientConfig', description: 'The algorithm/capacity/rate this instance was created with' },
        { name: 'getTotalAllowed() / getTotalDenied()', returns: 'long', description: 'Running counters for the status endpoint and the sim HUD' }
      ]
    },
    {
      name: 'TokenBucketRateLimiter',
      description: 'A bucket holding up to capacity tokens, refilling continuously at refillPerSecond tokens/second. tokens is a double so a fractional refill rate accumulates correctly instead of being floored away on every call.',
      fields: [
        { name: 'tokens', type: 'double', description: 'Current token count, refilled lazily on every call based on elapsed time since lastRefillMillis' },
        { name: 'lastRefillMillis', type: 'long', description: 'Timestamp of the last refill computation' },
        { name: 'lock', type: 'ReentrantLock', description: 'Guards the whole refill-then-decrement sequence so two concurrent callers cannot both read the same pre-refill token count and both succeed past capacity' }
      ],
      methods: [
        { name: 'refill(now)', returns: 'void', description: 'Adds elapsedSeconds * refillPerSecond tokens, capped at capacity' },
        { name: 'millisUntilNextToken(now)', returns: 'long', description: 'When fewer than 1 token remains, computes exactly when the next full token becomes available' }
      ]
    },
    {
      name: 'SlidingWindowCounterRateLimiter',
      description: 'Splits time into fixed windows and estimates the true sliding-window request count as currentWindowCount + previousWindowCount * (fraction of the current window remaining) — the same trade-off real rate limiters like Cloudflare\'s make to avoid storing a timestamp per request.',
      fields: [
        { name: 'currentWindowStart / currentWindowCount / previousWindowCount', type: 'long', description: 'The rolling two-window state the estimate is computed from' },
        { name: 'windowMillis', type: 'long', description: 'Fixed window length, derived from the client\'s configured window seconds' },
        { name: 'lock', type: 'ReentrantLock', description: 'Guards window-rollover plus the read-estimate-increment sequence for the same reason the token bucket needs one' }
      ],
      methods: [
        { name: 'advanceWindow(now)', returns: 'void', description: 'Rolls the window forward in O(1) — even across a large simulated time jump — instead of looping window-by-window' },
        { name: 'estimatedCount(now)', returns: 'double', description: 'The weighted current+previous window estimate the allow/deny decision is based on' }
      ]
    },
    {
      name: 'RateLimiterFactory',
      description: 'Builds a fresh, stateful RateLimiter for a client\'s ClientConfig. Unlike a registry-of-singletons factory, this must construct a new instance per call, since each client\'s bucket/window state is unique to that client.',
      fields: [],
      methods: [
        { name: 'create(config, now)', returns: 'RateLimiter', description: 'Validates the config, then constructs a TokenBucketRateLimiter or SlidingWindowCounterRateLimiter per config.algorithm' }
      ]
    },
    {
      name: 'RateLimiterRepository',
      description: 'In-memory store of one RateLimiter per client id. The production instance is a Spring bean; RateLimiterService also constructs a second, plain instance for the isolated /sim/* sandbox, sharing the same RateLimiterFactory bean but never the same client map.',
      fields: [],
      methods: [
        { name: 'findOrCreate(clientId, defaultConfig, now)', returns: 'RateLimiter', description: 'Atomic get-or-create via ConcurrentHashMap.computeIfAbsent — no top-level lock needed for first-touch creation' },
        { name: 'configure(clientId, config, now)', returns: 'void', description: 'Replaces (or creates) a client\'s limiter with a freshly-configured one' }
      ]
    },
    {
      name: 'RateLimiterService',
      description: 'Facade the controller delegates to wholesale. Owns the production repository plus a completely separate sim repository and virtual clock for the isolated /sim/* engine.',
      fields: [],
      methods: [
        { name: 'attemptRequest(clientId)', returns: 'RateLimitDecision', description: 'Looks up the client\'s limiter and calls tryAcquire with the real wall-clock time; throws ClientNotFoundException if unregistered' },
        { name: 'getStatus(clientId)', returns: 'ClientStatus', description: 'Peeks the client\'s current remaining capacity and running allow/deny counters without consuming anything' },
        { name: 'configureClient(clientId, config)', returns: 'ClientStatus', description: 'Admin operation: (re)configures a client\'s algorithm and limits' }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Strategy',
      used: true,
      explanation: 'RateLimiter is the strategy interface; TokenBucketRateLimiter and SlidingWindowCounterRateLimiter are interchangeable algorithms selected per client via ClientConfig.algorithm.'
    },
    {
      name: 'Factory Method',
      used: true,
      explanation: 'RateLimiterFactory.create(config, now) builds the correct concrete strategy from a ClientConfig, so RateLimiterRepository and RateLimiterService never construct a TokenBucketRateLimiter or SlidingWindowCounterRateLimiter directly.'
    },
    {
      name: 'Facade',
      used: true,
      explanation: 'RateLimiterController never touches a RateLimiter, RateLimiterRepository, or RateLimiterFactory directly — every call goes through RateLimiterService.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'Each RateLimiter implementation only tracks its own algorithm\'s state; RateLimiterRepository only stores/looks up instances; RateLimiterService only orchestrates and shapes DTOs; RateLimiterController only translates HTTP.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'A third algorithm (e.g. leaky bucket) plugs in by adding a RateLimitAlgorithm value, a new RateLimiter implementation, and one new switch arm in RateLimiterFactory — nothing else changes.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'RateLimiterService and RateLimiterRepository depend on the RateLimiter interface, never on TokenBucketRateLimiter or SlidingWindowCounterRateLimiter directly.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation — lock-guarded state',
      description: 'tokens/lastRefillMillis (token bucket) and currentWindowCount/previousWindowCount/currentWindowStart (sliding window) are private; every read and write happens under that instance\'s own ReentrantLock.',
      alternative: 'Could expose the raw counters via getters for the status endpoint, but that would let a caller read mid-mutation state outside the lock — which is exactly why ClientStatus is assembled from peek()\'s already-locked result instead.'
    },
    {
      name: 'Polymorphism — RateLimiter dispatch',
      description: 'RateLimiterRepository and RateLimiterService call tryAcquire()/peek() through the RateLimiter interface without ever checking which concrete algorithm they\'re holding.',
      alternative: 'Could branch on config.algorithm at every call site instead, but that duplicates the branching everywhere the strategy is used rather than once, in the factory.'
    }
  ],
  extensibility: [
    {
      area: 'Leaky Bucket algorithm',
      description: 'Add RateLimitAlgorithm.LEAKY_BUCKET, a LeakyBucketRateLimiter implementing the same RateLimiter interface, and one new arm in RateLimiterFactory.create — no other file changes.',
      difficulty: 'Easy'
    },
    {
      area: 'Distributed rate limiting',
      description: 'RateLimiterRepository\'s ConcurrentHashMap<String, RateLimiter> would need to become a shared store (e.g. Redis-backed) for the limiter to work across multiple JVM instances — the RateLimiter interface itself would not need to change.',
      difficulty: 'Hard'
    },
    {
      area: 'Per-endpoint (not just per-client) limits',
      description: 'ClientConfig currently keys purely on clientId; keying RateLimiterRepository on a (clientId, endpoint) pair would let different endpoints on the same client have independent budgets.',
      difficulty: 'Medium'
    }
  ],
  tradeoffs: [
    'The sliding window counter is an estimate (weighted current+previous window), not an exact sliding log — trading a small amount of burst tolerance at window boundaries for O(1) memory per client instead of storing a timestamp per request.',
    'Each RateLimiter owns its own lock rather than sharing one global lock across all clients, trading a slightly more complex per-instance design for zero cross-client contention — the whole point of a per-client rate limiter.',
    'now is passed explicitly into every strategy call instead of read from System.currentTimeMillis() internally, which makes every method one parameter longer but makes both the concurrency test and the /sim/* engine fully deterministic.',
    'An unknown clientId is rejected with ClientNotFoundException rather than silently auto-provisioned with a default config, so a demo client (like the sim sandbox\'s) is always explicitly configured, never accidentally created by a typo\'d id.'
  ],
  solid: [
    { principle: 'Single Responsibility', details: 'RateLimiter implementations = algorithm state; RateLimiterRepository = storage/lookup; RateLimiterService = orchestration/DTO shaping; RateLimiterController = HTTP boundary.' },
    { principle: 'Open/Closed', details: 'New algorithms plug in via RateLimiterFactory without modifying RateLimiterRepository, RateLimiterService, or RateLimiterController.' }
  ]
};
