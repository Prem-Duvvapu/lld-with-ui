// classDiagrams — h2o
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Building H2O — Class Diagram',
  classes: [
    {
      name: 'H2OController',
      stereotype: 'controller',
      fields: [
        '- service: H2OService'
      ],
      methods: [
        '+ run(request: RunRequest): ResponseEntity<RunResult>'
      ]
    },
    {
      name: 'H2OService',
      fields: [
        '- MAX_MOLECULE_COUNT: int',
        '- RUN_TIMEOUT_SECONDS: long'
      ],
      methods: [
        '+ run(request: RunRequest): RunResult',
        '- awaitCompletion(threads: List<Thread>): void',
        '- validate(moleculeCount: int): void'
      ]
    },
    {
      name: 'H2OBonder',
      fields: [
        '- hydrogenSemaphore: Semaphore',
        '- oxygenSemaphore: Semaphore',
        '- barrier: CyclicBarrier',
        '- output: List<String>',
        '- moleculeCount: AtomicInteger',
        '- recorder: TraceRecorder'
      ],
      methods: [
        '+ hydrogen(): void',
        '+ oxygen(): void',
        '- bond(): void',
        '+ getResult(): String',
        '+ getMoleculesBonded(): int'
      ]
    },
    {
      name: 'TraceRecorder',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ record(type: EventType, item: String, outputLengthNow: int): void'
      ]
    },
    {
      name: 'EventType',
      stereotype: 'enum',
      fields: [
        'HYDROGEN_ATTEMPT',
        'HYDROGEN_ACQUIRED',
        'HYDROGEN_DEPARTED',
        'OXYGEN_ATTEMPT',
        'OXYGEN_ACQUIRED',
        'OXYGEN_DEPARTED',
        'MOLECULE_BONDED'
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
        '- outputLength: int'
      ],
      methods: []
    },
    {
      name: 'RunRequest',
      fields: [
        '- moleculeCount: Integer'
      ],
      methods: []
    },
    {
      name: 'RunResult',
      fields: [
        '- runId: String',
        '- moleculeCount: int',
        '- hydrogenCount: int',
        '- oxygenCount: int',
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
      name: 'H2OException',
      stereotype: 'abstract',
      fields: [
        'extends DomainException'
      ],
      methods: []
    },
    {
      name: 'InvalidH2OParametersException',
      fields: [
        'extends H2OException',
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
    { from: 'H2OController', to: 'H2OService', label: 'delegates to' },
    { from: 'H2OService', to: 'H2OBonder', label: 'creates one per run' },
    { from: 'H2OService', to: 'RunRequest', label: 'validates' },
    { from: 'H2OService', to: 'RunResult', label: 'assembles' },
    { from: 'H2OService', to: 'RunExecutionException', label: 'throws on timeout' },
    { from: 'H2OService', to: 'InvalidH2OParametersException', label: 'throws on bad params' },
    { from: 'H2OBonder', to: 'TraceRecorder', label: 'reports every event to' },
    { from: 'TraceRecorder', to: 'TraceEvent', label: 'appends' },
    { from: 'TraceEvent', to: 'EventType', label: 'typed by' },
    { from: 'RunResult', to: 'TraceEvent', label: 'contains ordered' },
    { from: 'InvalidH2OParametersException', to: 'H2OException', label: 'extends', dashed: true },
    { from: 'H2OController', to: 'RunRequest', label: 'accepts' },
    { from: 'H2OController', to: 'RunResult', label: 'returns' }
  ]
};
