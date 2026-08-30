// classDiagrams — blocking-queue
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Bounded Blocking Queue — Class Diagram',
  classes: [
    {
      name: 'BlockingQueueController',
      stereotype: 'controller',
      fields: [
        '- service: BlockingQueueService'
      ],
      methods: [
        '+ run(request: RunRequest): ResponseEntity<RunResult>'
      ]
    },
    {
      name: 'BlockingQueueService',
      fields: [
        '- MAX_CAPACITY: int',
        '- MAX_THREADS: int',
        '- MAX_ITEMS_PER_PRODUCER: int',
        '- RUN_TIMEOUT_SECONDS: long'
      ],
      methods: [
        '+ run(request: RunRequest): RunResult',
        '- awaitCompletion(threads: List<Thread>): void',
        '- validate(capacity, producers, consumers, itemsPerProducer): void'
      ]
    },
    {
      name: 'BoundedBlockingQueue<T>',
      fields: [
        '- items: Object[]',
        '- capacity: int',
        '- count: int',
        '- putIndex: int',
        '- takeIndex: int',
        '- lock: ReentrantLock',
        '- notFull: Condition',
        '- notEmpty: Condition',
        '- recorder: TraceRecorder'
      ],
      methods: [
        '+ put(item: T): void',
        '+ take(): T',
        '+ size(): int',
        '+ capacity(): int'
      ]
    },
    {
      name: 'TraceRecorder',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ record(type: EventType, item: String, queueSizeNow: int): void'
      ]
    },
    {
      name: 'EventType',
      stereotype: 'enum',
      fields: [
        'ENQUEUE_ATTEMPT',
        'ENQUEUE_SUCCESS',
        'ENQUEUE_BLOCKED',
        'DEQUEUE_ATTEMPT',
        'DEQUEUE_SUCCESS',
        'DEQUEUE_BLOCKED',
        'QUEUE_FULL',
        'QUEUE_EMPTY'
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
        '- queueSize: int',
        '- capacity: int'
      ],
      methods: []
    },
    {
      name: 'RunRequest',
      fields: [
        '- capacity: Integer',
        '- producers: Integer',
        '- consumers: Integer',
        '- itemsPerProducer: Integer'
      ],
      methods: []
    },
    {
      name: 'RunResult',
      fields: [
        '- runId: String',
        '- capacity: int',
        '- producers: int',
        '- consumers: int',
        '- itemsPerProducer: int',
        '- totalItems: int',
        '- startedAt: Instant',
        '- finishedAt: Instant',
        '- durationMillis: long',
        '- maxObservedSize: int',
        '- trace: List<TraceEvent>'
      ],
      methods: []
    },
  ],
  relationships: [
    { from: 'BlockingQueueController', to: 'BlockingQueueService', label: 'delegates to' },
    { from: 'BlockingQueueService', to: 'BoundedBlockingQueue<T>', label: 'creates one per run' },
    { from: 'BlockingQueueService', to: 'RunRequest', label: 'validates' },
    { from: 'BlockingQueueService', to: 'RunResult', label: 'assembles' },
    { from: 'BoundedBlockingQueue<T>', to: 'TraceRecorder', label: 'reports every event to' },
    { from: 'TraceRecorder', to: 'TraceEvent', label: 'appends' },
    { from: 'TraceEvent', to: 'EventType', label: 'typed by' },
    { from: 'RunResult', to: 'TraceEvent', label: 'contains ordered' },
    { from: 'BlockingQueueController', to: 'RunRequest', label: 'accepts' },
    { from: 'BlockingQueueController', to: 'RunResult', label: 'returns' }
  ]
};
