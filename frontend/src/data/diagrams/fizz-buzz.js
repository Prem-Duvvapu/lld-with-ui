// classDiagrams — fizz-buzz
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Multithreaded FizzBuzz — Class Diagram',
  classes: [
    {
      name: 'FizzBuzzController',
      stereotype: 'controller',
      fields: [
        '- service: FizzBuzzService'
      ],
      methods: [
        '+ run(request: RunRequest): ResponseEntity<RunResult>'
      ]
    },
    {
      name: 'FizzBuzzService',
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
      name: 'FizzBuzzPrinter',
      fields: [
        '- n: int',
        '- lock: ReentrantLock',
        '- condition: Condition',
        '- current: int',
        '- result: StringBuilder',
        '- recorder: TraceRecorder'
      ],
      methods: [
        '+ number(): void',
        '+ fizz(): void',
        '+ buzz(): void',
        '+ fizzbuzz(): void',
        '- worker(matches: IntPredicate, formatter: Function<Integer,String>, attemptType, printedType): void',
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
        'NUMBER_ATTEMPT',
        'NUMBER_PRINTED',
        'FIZZ_ATTEMPT',
        'FIZZ_PRINTED',
        'BUZZ_ATTEMPT',
        'BUZZ_PRINTED',
        'FIZZBUZZ_ATTEMPT',
        'FIZZBUZZ_PRINTED'
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
    {
      name: 'FizzBuzzException',
      stereotype: 'abstract',
      fields: [
        'extends DomainException'
      ],
      methods: []
    },
    {
      name: 'InvalidFizzBuzzParametersException',
      fields: [
        'extends FizzBuzzException',
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
    { from: 'FizzBuzzController', to: 'FizzBuzzService', label: 'delegates to' },
    { from: 'FizzBuzzService', to: 'FizzBuzzPrinter', label: 'creates one per run' },
    { from: 'FizzBuzzService', to: 'RunRequest', label: 'validates' },
    { from: 'FizzBuzzService', to: 'RunResult', label: 'assembles' },
    { from: 'FizzBuzzService', to: 'RunExecutionException', label: 'throws on timeout' },
    { from: 'FizzBuzzService', to: 'InvalidFizzBuzzParametersException', label: 'throws on bad params' },
    { from: 'FizzBuzzPrinter', to: 'TraceRecorder', label: 'reports every event to' },
    { from: 'TraceRecorder', to: 'TraceEvent', label: 'appends' },
    { from: 'TraceEvent', to: 'EventType', label: 'typed by' },
    { from: 'RunResult', to: 'TraceEvent', label: 'contains ordered' },
    { from: 'InvalidFizzBuzzParametersException', to: 'FizzBuzzException', label: 'extends', dashed: true },
    { from: 'FizzBuzzController', to: 'RunRequest', label: 'accepts' },
    { from: 'FizzBuzzController', to: 'RunResult', label: 'returns' }
  ]
};
