// classDiagrams — bloom-filter
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Concurrent Bloom Filter — Class Diagram',
  classes: [
    {
      name: 'BloomFilterController',
      stereotype: 'controller',
      fields: [
        '- service: BloomFilterService'
      ],
      methods: [
        '+ run(request: RunRequest): ResponseEntity<RunResult>'
      ]
    },
    {
      name: 'BloomFilterService',
      fields: [
        '- ITEM_BATCH: List<String>',
        '- TRUE_NEGATIVE_CANDIDATES: List<String>',
        '- MAX_BIT_SIZE: int',
        '- MAX_HASH_COUNT: int',
        '- MAX_ADD_THREADS: int',
        '- RUN_TIMEOUT_SECONDS: long'
      ],
      methods: [
        '+ run(request: RunRequest): RunResult',
        '- awaitCompletion(threads: List<Thread>): void',
        '- validate(bitSize, hashCount, addThreads): void'
      ]
    },
    {
      name: 'BloomFilter',
      fields: [
        '- bitSize: int',
        '- hashCount: int',
        '- bits: BitSet',
        '- lock: ReentrantLock',
        '- recorder: TraceRecorder'
      ],
      methods: [
        '+ add(item: String): void',
        '+ mightContain(item: String): boolean',
        '+ cardinalityEstimate(): int',
        '- h1(s: String): int',
        '- h2(s: String): int',
        '- position(h1, h2, i): int'
      ]
    },
    {
      name: 'TraceRecorder',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ record(type: EventType, item: String, bitIndex: int, bitsSetSoFar: int): void'
      ]
    },
    {
      name: 'EventType',
      stereotype: 'enum',
      fields: [
        'ADD_ATTEMPT',
        'BIT_ALREADY_SET',
        'BIT_NEWLY_SET',
        'ADD_COMPLETE',
        'QUERY_ATTEMPT',
        'QUERY_BIT_HIT',
        'QUERY_BIT_MISS',
        'QUERY_RESULT_POSITIVE',
        'QUERY_RESULT_NEGATIVE'
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
        '- item: String',
        '- bitIndex: int',
        '- bitsSetSoFar: int'
      ],
      methods: []
    },
    {
      name: 'QueryOutcome',
      fields: [
        '- item: String',
        '- wasAdded: boolean',
        '- mightContain: boolean',
        '- falsePositive: boolean'
      ],
      methods: []
    },
    {
      name: 'RunRequest',
      fields: [
        '- bitSize: Integer',
        '- hashCount: Integer',
        '- addThreads: Integer'
      ],
      methods: []
    },
    {
      name: 'RunResult',
      fields: [
        '- runId: String',
        '- bitSize: int',
        '- hashCount: int',
        '- addThreads: int',
        '- itemsAdded: List<String>',
        '- queries: List<QueryOutcome>',
        '- bitsSetCount: int',
        '- falsePositiveDemonstrated: boolean',
        '- startedAt: Instant',
        '- finishedAt: Instant',
        '- durationMillis: long',
        '- trace: List<TraceEvent>'
      ],
      methods: []
    },
    {
      name: 'BloomFilterException',
      stereotype: 'abstract',
      fields: [
        'extends DomainException'
      ],
      methods: []
    },
    {
      name: 'InvalidBloomFilterParametersException',
      fields: [
        'extends BloomFilterException',
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
    { from: 'BloomFilterController', to: 'BloomFilterService', label: 'delegates to' },
    { from: 'BloomFilterService', to: 'BloomFilter', label: 'creates one per run' },
    { from: 'BloomFilterService', to: 'RunRequest', label: 'validates' },
    { from: 'BloomFilterService', to: 'RunResult', label: 'assembles' },
    { from: 'BloomFilterService', to: 'QueryOutcome', label: 'builds per query' },
    { from: 'BloomFilterService', to: 'RunExecutionException', label: 'throws on timeout' },
    { from: 'BloomFilterService', to: 'InvalidBloomFilterParametersException', label: 'throws on bad params' },
    { from: 'BloomFilter', to: 'TraceRecorder', label: 'reports every event to' },
    { from: 'TraceRecorder', to: 'TraceEvent', label: 'appends' },
    { from: 'TraceEvent', to: 'EventType', label: 'typed by' },
    { from: 'RunResult', to: 'TraceEvent', label: 'contains ordered' },
    { from: 'RunResult', to: 'QueryOutcome', label: 'contains' },
    { from: 'InvalidBloomFilterParametersException', to: 'BloomFilterException', label: 'extends', dashed: true },
    { from: 'BloomFilterController', to: 'RunRequest', label: 'accepts' },
    { from: 'BloomFilterController', to: 'RunResult', label: 'returns' }
  ]
};
