// classDiagrams — ttl-cache
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'TTL Cache — Class Diagram',
  classes: [
    {
      name: 'TtlCacheController',
      stereotype: 'controller',
      fields: [
        '- service: TtlCacheService'
      ],
      methods: [
        '+ run(request: RunRequest): ResponseEntity<RunResult>'
      ]
    },
    {
      name: 'TtlCacheService',
      fields: [
        '- MIN_SWEEP_INTERVAL_MILLIS: long',
        '- MAX_SWEEP_INTERVAL_MILLIS: long',
        '- MAX_TTL_MILLIS: long',
        '- MAX_OBSERVE_MILLIS: long',
        '- MAX_PUTS: int',
        '- MAX_GETS: int',
        '- RUN_TIMEOUT_SECONDS: long'
      ],
      methods: [
        '+ run(request: RunRequest): RunResult',
        '- normalize(request: RunRequest): RunRequest',
        '- validate(r: RunRequest): void',
        '- sleepQuietly(millis: long): boolean'
      ]
    },
    {
      name: 'TtlCache',
      fields: [
        '- store: ConcurrentHashMap<String, CacheEntry>',
        '- sweeper: ScheduledExecutorService',
        '- sweepTask: ScheduledFuture<?>',
        '- sweepIntervalMillis: long',
        '- recorder: TraceRecorder'
      ],
      methods: [
        '+ put(key: String, value: String, ttlMillis: long): void',
        '+ get(key: String): Optional<String>',
        '+ size(): int',
        '+ shutdown(): void',
        '- sweepExpired(): void'
      ]
    },
    {
      name: 'CacheEntry',
      stereotype: 'private nested',
      fields: [
        '- value: String',
        '- expiresAtEpochMillis: long'
      ],
      methods: [
        '+ isExpiredAt(nowEpochMillis: long): boolean'
      ]
    },
    {
      name: 'TraceRecorder',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ record(type: EventType, key: String, value: String, ttlMillis: Long, cacheSizeNow: int): void'
      ]
    },
    {
      name: 'EventType',
      stereotype: 'enum',
      fields: [
        'PUT',
        'GET_HIT',
        'GET_MISS_NOT_FOUND',
        'GET_MISS_EXPIRED',
        'BACKGROUND_EVICTION'
      ],
      methods: []
    },
    {
      name: 'TraceEvent',
      fields: [
        '- sequence: long',
        '- timestamp: Instant',
        '- elapsedNanos: long',
        '- threadName: String',
        '- type: EventType',
        '- key: String',
        '- value: String',
        '- ttlMillis: Long',
        '- cacheSize: int'
      ],
      methods: []
    },
    {
      name: 'PutSpec',
      fields: [
        '- key: String',
        '- value: String',
        '- ttlMillis: Long'
      ],
      methods: []
    },
    {
      name: 'GetSpec',
      fields: [
        '- key: String',
        '- atMillis: Long'
      ],
      methods: []
    },
    {
      name: 'RunRequest',
      fields: [
        '- sweepIntervalMillis: Long',
        '- puts: List<PutSpec>',
        '- gets: List<GetSpec>',
        '- observeMillis: Long'
      ],
      methods: []
    },
    {
      name: 'RunResult',
      fields: [
        '- runId: String',
        '- sweepIntervalMillis: long',
        '- totalPuts: int',
        '- totalGets: int',
        '- startedAt: Instant',
        '- finishedAt: Instant',
        '- durationMillis: long',
        '- finalCacheSize: int',
        '- trace: List<TraceEvent>'
      ],
      methods: []
    },
    {
      name: 'TtlCacheException',
      stereotype: 'abstract',
      fields: [
        'extends DomainException'
      ],
      methods: []
    },
    {
      name: 'InvalidCacheParametersException',
      fields: [
        'extends TtlCacheException',
        '@ResponseStatus(400)'
      ],
      methods: []
    },
    {
      name: 'RunExecutionException',
      fields: [
        'extends RuntimeException',
        '(server-side safety-timeout fault, never a domain 4xx)'
      ],
      methods: []
    }
  ],
  relationships: [
    { from: 'TtlCacheController', to: 'TtlCacheService', label: 'delegates to' },
    { from: 'TtlCacheService', to: 'TtlCache', label: 'creates one per run' },
    { from: 'TtlCacheService', to: 'RunRequest', label: 'normalizes & validates' },
    { from: 'TtlCacheService', to: 'RunResult', label: 'assembles' },
    { from: 'TtlCacheService', to: 'RunExecutionException', label: 'throws on timeout' },
    { from: 'TtlCacheService', to: 'InvalidCacheParametersException', label: 'throws on bad params' },
    { from: 'TtlCache', to: 'CacheEntry', label: 'stores' },
    { from: 'TtlCache', to: 'TraceRecorder', label: 'reports every event to' },
    { from: 'TraceRecorder', to: 'TraceEvent', label: 'appends' },
    { from: 'TraceEvent', to: 'EventType', label: 'typed by' },
    { from: 'RunRequest', to: 'PutSpec', label: 'scripts' },
    { from: 'RunRequest', to: 'GetSpec', label: 'schedules' },
    { from: 'RunResult', to: 'TraceEvent', label: 'contains ordered' },
    { from: 'InvalidCacheParametersException', to: 'TtlCacheException', label: 'extends', dashed: true },
    { from: 'TtlCacheController', to: 'RunRequest', label: 'accepts' },
    { from: 'TtlCacheController', to: 'RunResult', label: 'returns' }
  ]
};
