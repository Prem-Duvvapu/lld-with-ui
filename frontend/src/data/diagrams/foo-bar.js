// classDiagrams — foo-bar
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Print FooBar Alternately — Class Diagram',
  classes: [
    {
      name: 'FooBarController',
      stereotype: 'controller',
      fields: [
        '- service: FooBarService'
      ],
      methods: [
        '+ run(request: RunRequest): ResponseEntity<RunResult>'
      ]
    },
    {
      name: 'FooBarService',
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
      name: 'FooBarPrinter',
      fields: [
        '- n: int',
        '- fooSemaphore: Semaphore',
        '- barSemaphore: Semaphore',
        '- result: StringBuilder',
        '- recorder: TraceRecorder'
      ],
      methods: [
        '+ foo(): void',
        '+ bar(): void',
        '+ getResult(): String'
      ]
    },
    {
      name: 'TraceRecorder',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ record(type: EventType, item: String, repetition: int): void'
      ]
    },
    {
      name: 'EventType',
      stereotype: 'enum',
      fields: [
        'FOO_ATTEMPT',
        'FOO_PRINTED',
        'BAR_ATTEMPT',
        'BAR_PRINTED'
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
        '- repetition: int'
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
    {
      name: 'FooBarException',
      stereotype: 'abstract',
      fields: [
        'extends DomainException'
      ],
      methods: []
    },
    {
      name: 'InvalidFooBarParametersException',
      fields: [
        'extends FooBarException',
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
    { from: 'FooBarController', to: 'FooBarService', label: 'delegates to' },
    { from: 'FooBarService', to: 'FooBarPrinter', label: 'creates one per run' },
    { from: 'FooBarService', to: 'RunRequest', label: 'validates' },
    { from: 'FooBarService', to: 'RunResult', label: 'assembles' },
    { from: 'FooBarService', to: 'RunExecutionException', label: 'throws on timeout' },
    { from: 'FooBarService', to: 'InvalidFooBarParametersException', label: 'throws on bad params' },
    { from: 'FooBarPrinter', to: 'TraceRecorder', label: 'reports every event to' },
    { from: 'TraceRecorder', to: 'TraceEvent', label: 'appends' },
    { from: 'TraceEvent', to: 'EventType', label: 'typed by' },
    { from: 'RunResult', to: 'TraceEvent', label: 'contains ordered' },
    { from: 'InvalidFooBarParametersException', to: 'FooBarException', label: 'extends', dashed: true },
    { from: 'FooBarController', to: 'RunRequest', label: 'accepts' },
    { from: 'FooBarController', to: 'RunResult', label: 'returns' }
  ]
};
