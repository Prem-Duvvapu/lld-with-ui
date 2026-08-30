// classDiagrams — zero-even-odd
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Print Zero Even Odd — Class Diagram',
  classes: [
    {
      name: 'ZeroEvenOddController',
      stereotype: 'controller',
      fields: [
        '- service: ZeroEvenOddService'
      ],
      methods: [
        '+ run(request: RunRequest): ResponseEntity<RunResult>'
      ]
    },
    {
      name: 'ZeroEvenOddService',
      fields: [
        '- MAX_N: int',
        '- RUN_TIMEOUT_SECONDS: long'
      ],
      methods: [
        '+ run(request: RunRequest): RunResult',
        '- awaitCompletion(threads: List<Thread>): void',
        '- validate(n: int): void'
      ]
    },
    {
      name: 'ZeroEvenOddPrinter',
      fields: [
        '- n: int',
        '- zeroSemaphore: Semaphore',
        '- oddSemaphore: Semaphore',
        '- evenSemaphore: Semaphore',
        '- result: StringBuilder',
        '- recorder: TraceRecorder'
      ],
      methods: [
        '+ zero(): void',
        '+ odd(): void',
        '+ even(): void',
        '+ getResult(): String'
      ]
    },
    {
      name: 'TraceRecorder',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ record(type: EventType, token: String, n: int): void'
      ]
    },
    {
      name: 'EventType',
      stereotype: 'enum',
      fields: [
        'ZERO_ATTEMPT',
        'ZERO_PRINTED',
        'ODD_ATTEMPT',
        'ODD_PRINTED',
        'EVEN_ATTEMPT',
        'EVEN_PRINTED'
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
        '- token: String',
        '- n: int'
      ],
      methods: []
    },
    {
      name: 'RunRequest',
      fields: [
        '- n: Integer'
      ],
      methods: []
    },
    {
      name: 'RunResult',
      fields: [
        '- runId: String',
        '- n: int',
        '- threadCount: int',
        '- result: String',
        '- startedAt: Instant',
        '- finishedAt: Instant',
        '- durationMillis: long',
        '- elapsedNanos: long',
        '- events: List<TraceEvent>'
      ],
      methods: []
    },
  ],
  relationships: [
    { from: 'ZeroEvenOddController', to: 'ZeroEvenOddService', label: 'delegates to' },
    { from: 'ZeroEvenOddService', to: 'ZeroEvenOddPrinter', label: 'creates one per run' },
    { from: 'ZeroEvenOddService', to: 'RunRequest', label: 'validates' },
    { from: 'ZeroEvenOddService', to: 'RunResult', label: 'assembles' },
    { from: 'ZeroEvenOddPrinter', to: 'TraceRecorder', label: 'reports every event to' },
    { from: 'TraceRecorder', to: 'TraceEvent', label: 'appends' },
    { from: 'TraceEvent', to: 'EventType', label: 'typed by' },
    { from: 'RunResult', to: 'TraceEvent', label: 'contains ordered' },
    { from: 'ZeroEvenOddController', to: 'RunRequest', label: 'accepts' },
    { from: 'ZeroEvenOddController', to: 'RunResult', label: 'returns' }
  ]
};
