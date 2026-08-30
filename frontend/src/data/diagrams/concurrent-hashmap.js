// classDiagrams — concurrent-hashmap
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Concurrent HashMap (Striped Lock) — Class Diagram',
  classes: [
    {
      name: 'ConcurrentHashMapController',
      stereotype: 'controller',
      fields: [
        '- service: ConcurrentHashMapService'
      ],
      methods: [
        '+ run(request: RunRequest): ResponseEntity<RunResult>'
      ]
    },
    {
      name: 'ConcurrentHashMapService',
      fields: [
        '- MAX_SEGMENTS: int',
        '- MAX_THREADS: int',
        '- MAX_INCREMENTS_PER_THREAD: int',
        '- MAX_DISTINCT_KEYS: int',
        '- MAX_COMPUTE_RACERS: int',
        '- RUN_TIMEOUT_SECONDS: long'
      ],
      methods: [
        '+ run(request: RunRequest): RunResult',
        '- awaitCompletion(threads: List<Thread>): void',
        '- validate(segments, threads, incrementsPerThread, distinctKeys, computeRacers): void'
      ]
    },
    {
      name: 'StripedHashMap<K,V>',
      fields: [
        '- segmentCount: int',
        '- locks: ReentrantLock[]',
        '- segments: Map<K,V>[]',
        '- recorder: TraceRecorder'
      ],
      methods: [
        '+ put(key: K, value: V): void',
        '+ get(key: K): V',
        '+ remove(key: K): V',
        '+ merge(key: K, value: V, remappingFunction: BinaryOperator<V>): V',
        '+ computeIfAbsent(key: K, mappingFunction: Function<K,V>): V',
        '+ size(): int',
        '- segmentFor(key: K): int'
      ]
    },
    {
      name: 'TraceRecorder',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ record(type: EventType, key: String, valueAfter: String, segmentIndex: int, segmentSize: int, mapSize: int): void'
      ]
    },
    {
      name: 'EventType',
      stereotype: 'enum',
      fields: [
        'SEGMENT_LOCK_ACQUIRED',
        'SEGMENT_LOCK_RELEASED',
        'PUT_SUCCESS',
        'GET_HIT',
        'GET_MISS',
        'REMOVE_SUCCESS',
        'REMOVE_MISS',
        'MERGE_SUCCESS',
        'COMPUTE_IF_ABSENT_ATTEMPT',
        'COMPUTE_IF_ABSENT_COMPUTED',
        'COMPUTE_IF_ABSENT_SKIPPED'
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
        '- valueAfter: String',
        '- segmentIndex: int',
        '- segmentSize: int',
        '- mapSize: int'
      ],
      methods: []
    },
    {
      name: 'RunRequest',
      fields: [
        '- segments: Integer',
        '- threads: Integer',
        '- incrementsPerThread: Integer',
        '- distinctKeys: Integer',
        '- computeRacers: Integer'
      ],
      methods: []
    },
    {
      name: 'RunResult',
      fields: [
        '- runId: String',
        '- segments: int',
        '- threads: int',
        '- incrementsPerThread: int',
        '- distinctKeys: int',
        '- computeRacers: int',
        '- totalIncrements: long',
        '- sumOfFinalCounters: long',
        '- computeExecutions: int',
        '- startedAt: Instant',
        '- finishedAt: Instant',
        '- durationMillis: long',
        '- trace: List<TraceEvent>'
      ],
      methods: []
    },
  ],
  relationships: [
    { from: 'ConcurrentHashMapController', to: 'ConcurrentHashMapService', label: 'delegates to' },
    { from: 'ConcurrentHashMapService', to: 'StripedHashMap<K,V>', label: 'creates one per phase per run' },
    { from: 'ConcurrentHashMapService', to: 'RunRequest', label: 'validates' },
    { from: 'ConcurrentHashMapService', to: 'RunResult', label: 'assembles' },
    { from: 'StripedHashMap<K,V>', to: 'TraceRecorder', label: 'reports every event to' },
    { from: 'TraceRecorder', to: 'TraceEvent', label: 'appends' },
    { from: 'TraceEvent', to: 'EventType', label: 'typed by' },
    { from: 'RunResult', to: 'TraceEvent', label: 'contains ordered' },
    { from: 'ConcurrentHashMapController', to: 'RunRequest', label: 'accepts' },
    { from: 'ConcurrentHashMapController', to: 'RunResult', label: 'returns' }
  ]
};
