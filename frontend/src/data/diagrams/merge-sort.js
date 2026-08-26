// classDiagrams — merge-sort
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Multi-threaded Merge Sort — Class Diagram',
  classes: [
    {
      name: 'MergeSortController',
      stereotype: 'controller',
      fields: [
        '- service: MergeSortService'
      ],
      methods: [
        '+ run(request: RunRequest): ResponseEntity<RunResult>'
      ]
    },
    {
      name: 'MergeSortService',
      fields: [
        '- MAX_SIZE: int',
        '- MAX_PARALLELISM: int',
        '- MAX_SEQUENTIAL_THRESHOLD: int'
      ],
      methods: [
        '+ run(request: RunRequest): RunResult',
        '- validate(size, parallelism, sequentialThreshold): void'
      ]
    },
    {
      name: 'ParallelMergeSorter',
      fields: [
        '- parallelism: int',
        '- sequentialThreshold: int',
        '- recorder: TraceRecorder'
      ],
      methods: [
        '+ sort(input: int[]): int[]'
      ]
    },
    {
      name: 'SortTask',
      stereotype: 'extends RecursiveAction',
      fields: [
        '- array: int[]',
        '- lo: int',
        '- hi: int',
        '- buffer: int[]'
      ],
      methods: [
        '# compute(): void',
        '- merge(mid: int): void'
      ]
    },
    {
      name: 'TraceRecorder',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ record(type: EventType, lo: int, hi: int, mid: Integer, position: Integer, value: Integer, sourceSide: String): void'
      ]
    },
    {
      name: 'EventType',
      stereotype: 'enum',
      fields: [
        'PARTITION',
        'BASE_CASE',
        'FORK_RIGHT',
        'MERGE_START',
        'MERGE_WRITE',
        'MERGE_COMPLETE'
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
        '- lo: int',
        '- hi: int',
        '- mid: Integer',
        '- position: Integer',
        '- value: Integer',
        '- sourceSide: String'
      ],
      methods: []
    },
    {
      name: 'RunRequest',
      fields: [
        '- array: List<Integer>',
        '- size: Integer',
        '- parallelism: Integer',
        '- sequentialThreshold: Integer'
      ],
      methods: []
    },
    {
      name: 'RunResult',
      fields: [
        '- runId: String',
        '- originalArray: List<Integer>',
        '- sortedArray: List<Integer>',
        '- size: int',
        '- parallelism: int',
        '- sequentialThreshold: int',
        '- distinctThreadsUsed: int',
        '- startedAt: Instant',
        '- finishedAt: Instant',
        '- durationMillis: long',
        '- trace: List<TraceEvent>'
      ],
      methods: []
    },
    {
      name: 'MergeSortException',
      stereotype: 'abstract',
      fields: [
        'extends DomainException'
      ],
      methods: []
    },
    {
      name: 'InvalidSortParametersException',
      fields: [
        'extends MergeSortException',
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
    { from: 'MergeSortController', to: 'MergeSortService', label: 'delegates to' },
    { from: 'MergeSortService', to: 'ParallelMergeSorter', label: 'creates one per run' },
    { from: 'MergeSortService', to: 'RunRequest', label: 'validates' },
    { from: 'MergeSortService', to: 'RunResult', label: 'assembles' },
    { from: 'MergeSortService', to: 'InvalidSortParametersException', label: 'throws on bad params' },
    { from: 'ParallelMergeSorter', to: 'SortTask', label: 'submits root task' },
    { from: 'ParallelMergeSorter', to: 'RunExecutionException', label: 'throws on timeout/interrupt' },
    { from: 'SortTask', to: 'SortTask', label: 'forks/joins left+right' },
    { from: 'SortTask', to: 'TraceRecorder', label: 'reports every event to' },
    { from: 'TraceRecorder', to: 'TraceEvent', label: 'appends' },
    { from: 'TraceEvent', to: 'EventType', label: 'typed by' },
    { from: 'RunResult', to: 'TraceEvent', label: 'contains ordered' },
    { from: 'InvalidSortParametersException', to: 'MergeSortException', label: 'extends', dashed: true },
    { from: 'MergeSortController', to: 'RunRequest', label: 'accepts' },
    { from: 'MergeSortController', to: 'RunResult', label: 'returns' }
  ]
};
