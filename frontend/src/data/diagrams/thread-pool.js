// classDiagrams — thread-pool
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Thread Pool — Class Diagram',
  classes: [
    {
      name: 'ThreadPoolController',
      stereotype: 'controller',
      fields: [
        '- service: ThreadPoolService'
      ],
      methods: [
        '+ listPools(): ResponseEntity<List<PoolStats>>',
        '+ getStats(poolId: String): ResponseEntity<PoolStats>',
        '+ submit(poolId: String, body: Map): ResponseEntity<SubmitResult>',
        '+ resize(poolId: String, body: Map): ResponseEntity<PoolStats>',
        '+ shutdown(poolId: String): ResponseEntity<PoolStats>'
      ]
    },
    {
      name: 'ThreadPoolService',
      fields: [
        '- repository: ThreadPoolRepository',
        '- policyFactory: RejectionPolicyFactory'
      ],
      methods: [
        '+ submitTask(poolId: String, taskName: String, durationMillis: long): SubmitResult',
        '+ getStats(poolId: String): PoolStats',
        '+ listPools(): List<PoolStats>',
        '+ resizePool(poolId: String, core: int, max: int): PoolStats',
        '+ shutdownPool(poolId: String): PoolStats'
      ]
    },
    {
      name: 'ThreadPoolRepository',
      fields: [
        '- pools: Map<String, CustomThreadPool>'
      ],
      methods: [
        '+ register(pool: CustomThreadPool): void',
        '+ find(poolId: String): CustomThreadPool',
        '+ listPoolIds(): List<String>'
      ]
    },
    {
      name: 'CustomThreadPool',
      fields: [
        '- corePoolSize: int',
        '- maxPoolSize: int',
        '- queueCapacity: int',
        '- keepAliveMillis: long',
        '- rejectionPolicy: RejectionPolicy',
        '- queue: ArrayDeque<PoolTask>',
        '- workers: Set<Worker>',
        '- workerCount: int',
        '- lock: ReentrantLock',
        '- notEmpty: Condition',
        '- shuttingDown: volatile boolean',
        '- terminatingNow: volatile boolean'
      ],
      methods: [
        '+ submit(taskName: String, runnable: Runnable): SubmitResult',
        '+ shutdown(): void',
        '+ shutdownNow(): List<PoolTask>',
        '+ awaitTermination(timeoutMillis: long): boolean',
        '+ resize(core: int, max: int): void',
        '- tryAssignDirectly(task: PoolTask): boolean',
        '- spawnWorker(core: boolean, firstTask: PoolTask): void',
        '~ takeTask(worker: Worker): PoolTask',
        '~ runTask(task: PoolTask, worker: Worker): void',
        '~ workerTerminated(worker: Worker): void'
      ]
    },
    {
      name: 'Worker',
      fields: [
        '- pool: CustomThreadPool',
        '- core: boolean',
        '- firstTask: PoolTask',
        '- thread: Thread'
      ],
      methods: [
        '+ run(): void'
      ]
    },
    {
      name: 'PoolTask',
      fields: [
        '- id: String',
        '- name: String',
        '- runnable: Runnable',
        '- status: volatile TaskStatus',
        '- workerName: volatile String'
      ],
      methods: []
    },
    {
      name: 'TaskStatus',
      stereotype: 'enum',
      fields: [
        'QUEUED',
        'RUNNING',
        'COMPLETED',
        'REJECTED'
      ],
      methods: []
    },
    {
      name: 'RejectionPolicy',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ decide(): RejectionAction',
        '+ type(): RejectionPolicyType'
      ]
    },
    {
      name: 'AbortPolicy',
      fields: [],
      methods: [
        '+ decide(): RejectionAction'
      ]
    },
    {
      name: 'CallerRunsPolicy',
      fields: [],
      methods: [
        '+ decide(): RejectionAction'
      ]
    },
    {
      name: 'DiscardPolicy',
      fields: [],
      methods: [
        '+ decide(): RejectionAction'
      ]
    },
    {
      name: 'DiscardOldestPolicy',
      fields: [],
      methods: [
        '+ decide(): RejectionAction'
      ]
    },
    {
      name: 'RejectionPolicyFactory',
      fields: [],
      methods: [
        '+ create(type: RejectionPolicyType): RejectionPolicy'
      ]
    },
    {
      name: 'RejectionAction',
      stereotype: 'enum',
      fields: [
        'ABORT',
        'CALLER_RUNS',
        'DISCARD',
        'DISCARD_OLDEST'
      ],
      methods: []
    },
    {
      name: 'RejectionPolicyType',
      stereotype: 'enum',
      fields: [
        'ABORT',
        'CALLER_RUNS',
        'DISCARD',
        'DISCARD_OLDEST'
      ],
      methods: []
    },
    {
      name: 'SubmitResult',
      fields: [
        '- taskId: String',
        '- taskName: String',
        '- outcome: SubmitOutcome',
        '- evictedTaskId: String'
      ],
      methods: []
    },
    {
      name: 'SubmitOutcome',
      stereotype: 'enum',
      fields: [
        'ACCEPTED',
        'DISCARDED',
        'RAN_ON_CALLER'
      ],
      methods: []
    },
    {
      name: 'PoolStats',
      fields: [
        '- poolId: String',
        '- corePoolSize: int',
        '- maxPoolSize: int',
        '- queueCapacity: int',
        '- rejectionPolicy: String',
        '- currentWorkerCount: int',
        '- queueSize: int',
        '- submittedCount: long',
        '- completedCount: long',
        '- rejectedCount: long',
        '- callerRunCount: long',
        '- shuttingDown: boolean',
        '- terminated: boolean'
      ],
      methods: []
    }
  ],
  relationships: [
    { from: 'ThreadPoolController', to: 'ThreadPoolService', label: 'delegates to' },
    { from: 'ThreadPoolService', to: 'ThreadPoolRepository', label: 'reads/writes pools via' },
    { from: 'ThreadPoolService', to: 'RejectionPolicyFactory', label: 'uses' },
    { from: 'ThreadPoolRepository', to: 'CustomThreadPool', label: 'stores named pools' },
    { from: 'CustomThreadPool', to: 'RejectionPolicy', label: 'consults when saturated' },
    { from: 'CustomThreadPool', to: 'Worker', label: 'spawns and owns' },
    { from: 'CustomThreadPool', to: 'PoolTask', label: 'queues' },
    { from: 'Worker', to: 'PoolTask', label: 'runs' },
    { from: 'PoolTask', to: 'TaskStatus', label: 'typed by' },
    { from: 'AbortPolicy', to: 'RejectionPolicy', label: 'implements' },
    { from: 'CallerRunsPolicy', to: 'RejectionPolicy', label: 'implements' },
    { from: 'DiscardPolicy', to: 'RejectionPolicy', label: 'implements' },
    { from: 'DiscardOldestPolicy', to: 'RejectionPolicy', label: 'implements' },
    { from: 'RejectionPolicyFactory', to: 'RejectionPolicy', label: 'creates' },
    { from: 'RejectionPolicy', to: 'RejectionAction', label: 'decides' },
    { from: 'RejectionPolicy', to: 'RejectionPolicyType', label: 'typed by' },
    { from: 'CustomThreadPool', to: 'SubmitResult', label: 'returns' },
    { from: 'SubmitResult', to: 'SubmitOutcome', label: 'typed by' },
    { from: 'ThreadPoolService', to: 'PoolStats', label: 'assembles from CustomThreadPool' }
  ]
};
