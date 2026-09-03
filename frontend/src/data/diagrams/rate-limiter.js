// classDiagrams — rate-limiter
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Rate Limiter — Class Diagram',
  classes: [
    {
      name: 'RateLimiterController',
      stereotype: 'controller',
      fields: [
        '- service: RateLimiterService'
      ],
      methods: [
        '+ attemptRequest(clientId: String): ResponseEntity<RateLimitDecision>',
        '+ getStatus(clientId: String): ResponseEntity<ClientStatus>',
        '+ listClients(): ResponseEntity<List<ClientStatus>>',
        '+ configureClient(clientId: String, config: ClientConfig): ResponseEntity<ClientStatus>'
      ]
    },
    {
      name: 'RateLimiterService',
      fields: [
        '- repository: RateLimiterRepository',
        '- factory: RateLimiterFactory'
      ],
      methods: [
        '+ attemptRequest(clientId: String): RateLimitDecision',
        '+ getStatus(clientId: String): ClientStatus',
        '+ listClients(): List<ClientStatus>',
        '+ configureClient(clientId: String, config: ClientConfig): ClientStatus'
      ]
    },
    {
      name: 'RateLimiterRepository',
      fields: [
        '- limiters: Map<String, RateLimiter>',
        '- factory: RateLimiterFactory'
      ],
      methods: [
        '+ findOrCreate(clientId: String, defaultConfig: ClientConfig, now: long): RateLimiter',
        '+ find(clientId: String): RateLimiter',
        '+ configure(clientId: String, config: ClientConfig, now: long): void',
        '+ listClientIds(): List<String>'
      ]
    },
    {
      name: 'RateLimiterFactory',
      fields: [],
      methods: [
        '+ create(config: ClientConfig, now: long): RateLimiter'
      ]
    },
    {
      name: 'RateLimiter',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ tryAcquire(now: long): RateLimitDecision',
        '+ peek(now: long): RateLimitDecision',
        '+ getConfig(): ClientConfig',
        '+ getTotalAllowed(): long',
        '+ getTotalDenied(): long'
      ]
    },
    {
      name: 'TokenBucketRateLimiter',
      fields: [
        '- config: ClientConfig',
        '- lock: ReentrantLock',
        '- tokens: double',
        '- lastRefillMillis: long',
        '- totalAllowed: AtomicLong',
        '- totalDenied: AtomicLong'
      ],
      methods: [
        '+ tryAcquire(now: long): RateLimitDecision',
        '+ peek(now: long): RateLimitDecision',
        '- refill(now: long): void',
        '- millisUntilNextToken(now: long): long'
      ]
    },
    {
      name: 'SlidingWindowCounterRateLimiter',
      fields: [
        '- config: ClientConfig',
        '- windowMillis: long',
        '- lock: ReentrantLock',
        '- currentWindowStart: long',
        '- currentWindowCount: long',
        '- previousWindowCount: long',
        '- totalAllowed: AtomicLong',
        '- totalDenied: AtomicLong'
      ],
      methods: [
        '+ tryAcquire(now: long): RateLimitDecision',
        '+ peek(now: long): RateLimitDecision',
        '- advanceWindow(now: long): void',
        '- estimatedCount(now: long): double'
      ]
    },
    {
      name: 'RateLimitAlgorithm',
      stereotype: 'enum',
      fields: [
        'TOKEN_BUCKET',
        'SLIDING_WINDOW_COUNTER'
      ],
      methods: []
    },
    {
      name: 'ClientConfig',
      fields: [
        '- algorithm: RateLimitAlgorithm',
        '- capacityOrLimit: int',
        '- refillPerSecondOrWindowSeconds: double'
      ],
      methods: []
    },
    {
      name: 'RateLimitDecision',
      fields: [
        '- clientId: String',
        '- allowed: boolean',
        '- remaining: long',
        '- resetEpochMillis: long'
      ],
      methods: []
    },
    {
      name: 'ClientStatus',
      fields: [
        '- clientId: String',
        '- algorithm: RateLimitAlgorithm',
        '- capacityOrLimit: int',
        '- refillPerSecondOrWindowSeconds: double',
        '- remaining: long',
        '- resetEpochMillis: long',
        '- totalAllowed: long',
        '- totalDenied: long'
      ],
      methods: []
    }
  ],
  relationships: [
    { from: 'RateLimiterController', to: 'RateLimiterService', label: 'delegates to' },
    { from: 'RateLimiterService', to: 'RateLimiterRepository', label: 'reads/writes clients via' },
    { from: 'RateLimiterService', to: 'RateLimiterFactory', label: 'uses' },
    { from: 'RateLimiterRepository', to: 'RateLimiterFactory', label: 'creates limiters via' },
    { from: 'RateLimiterRepository', to: 'RateLimiter', label: 'stores one per client' },
    { from: 'RateLimiterFactory', to: 'RateLimiter', label: 'creates' },
    { from: 'TokenBucketRateLimiter', to: 'RateLimiter', label: 'implements' },
    { from: 'SlidingWindowCounterRateLimiter', to: 'RateLimiter', label: 'implements' },
    { from: 'RateLimiter', to: 'ClientConfig', label: 'configured by' },
    { from: 'RateLimiter', to: 'RateLimitDecision', label: 'returns' },
    { from: 'ClientConfig', to: 'RateLimitAlgorithm', label: 'typed by' },
    { from: 'RateLimiterService', to: 'ClientStatus', label: 'assembles from RateLimiter + ClientConfig' }
  ]
};
