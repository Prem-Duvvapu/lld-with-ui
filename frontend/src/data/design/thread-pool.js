// designDetails — thread-pool
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Thread Pool — Design Details',
  tldr: [
    'A thread pool built from scratch — real Thread-backed Worker objects pulling from a real bounded queue, not a wrapper around java.util.concurrent.ThreadPoolExecutor',
    'Mirrors ThreadPoolExecutor\'s core algorithm exactly: fewer than corePoolSize workers -> spawn a core worker; queue has room -> enqueue; fewer than maxPoolSize workers -> spawn an extra worker; otherwise saturated -> ask the RejectionPolicy',
    'Four interchangeable RejectionPolicy strategies (Abort, CallerRuns, Discard, DiscardOldest) behind one interface, each a stateless singleton',
    'A worker spawned specifically for a task is handed that task directly, bypassing the shared queue entirely — routing it through the queue too (an earlier version of this module did exactly that) created a real, test-caught race between the new worker\'s first pickup and the next submission\'s queue-size check',
    'The isolated /sim/* engine gates every task on its own CountDownLatch instead of a real sleep, so an 8-step guided demo backed by genuinely concurrent worker threads plays out deterministically regardless of how fast a person clicks through it'
  ],
  requirements: [
    'Maintain a configurable number of "core" worker threads that stay alive indefinitely waiting for work',
    'Grow beyond core, up to a configurable maximum, only once a bounded task queue is completely full',
    'Let a worker beyond core size retire after sitting idle past a configurable keep-alive duration',
    'Support at least four interchangeable behaviors for what happens when the pool is fully saturated: abort loudly, run on the caller\'s own thread, silently discard, or evict the oldest queued task',
    'A task must run on exactly one thread exactly once — no task lost, no task run twice, even under a concurrent submission burst',
    'Submitting after shutdown must always fail clearly, regardless of the configured rejection policy',
    'An isolated simulation sandbox must demonstrate core-fill, queue-fill, extra-worker spin-up, and rejection without racing real wall-clock timing'
  ],
  entities: [
    {
      name: 'CustomThreadPool',
      description: 'The engine. Owns the bounded task queue, the live worker set, and every rejection/shutdown decision. lock guards every piece of mutable state (queue, worker set/count, shutdown flags); a worker executes its task outside the lock, so one slow task never blocks submission or its sibling workers.',
      fields: [
        { name: 'corePoolSize / maxPoolSize', type: 'volatile int', description: 'Mutable via resize(); read without the lock for the fast-path checks, written under it' },
        { name: 'queue', type: 'ArrayDeque<PoolTask>', description: 'Holds only tasks waiting for an *existing* worker — never a task just handed to a worker spawned specifically for it' },
        { name: 'workers / workerCount', type: 'Set<Worker> / int', description: 'The live worker set and its size, both guarded by lock' },
        { name: 'lock / notEmpty', type: 'ReentrantLock / Condition', description: 'lock guards all mutable state above; notEmpty is what a worker blocks on while waiting for the next task' },
        { name: 'shuttingDown / terminatingNow / terminated', type: 'volatile boolean', description: 'shutdown() sets shuttingDown only (drain then stop); shutdownNow() also sets terminatingNow (drop queued work, interrupt workers)' }
      ],
      methods: [
        { name: 'submit(taskName, runnable)', returns: 'SubmitResult', description: 'The core/queue/max decision, in order, under lock; falls through to the configured RejectionPolicy only once none of the three paths has room' },
        { name: 'takeTask(worker)', returns: 'PoolTask', description: 'Called only by a worker\'s own thread: blocks for the next queued task, or returns null (telling the worker to retire) once idle-timeout or shutdown-with-nothing-left applies' },
        { name: 'runTask(task, worker)', returns: 'void', description: 'Executes outside the lock: marks RUNNING, runs the Runnable, marks COMPLETED' },
        { name: 'shutdown() / shutdownNow()', returns: 'void / List<PoolTask>', description: 'Graceful drain-then-stop vs. immediate queue-drop + worker interruption' },
        { name: 'resize(core, max)', returns: 'void', description: 'Updates the two size fields; a larger core is grown lazily on the next submission, matching ThreadPoolExecutor rather than eagerly spinning up idle workers' }
      ]
    },
    {
      name: 'Worker',
      description: 'One real worker thread\'s run loop. "Core" vs. "non-core" is fixed at creation and only changes whether takeTask() blocks forever or retires after the keep-alive — the pool decides which kind to spawn, this class just carries the flag.',
      fields: [
        { name: 'core', type: 'boolean', description: 'Core workers wait indefinitely for the next task; non-core workers retire after keepAliveMillis of idleness' },
        { name: 'firstTask', type: 'PoolTask', description: 'A task handed directly at construction, run before ever calling takeTask() — how a freshly-spawned worker\'s own task bypasses the shared queue' }
      ],
      methods: [
        { name: 'run()', returns: 'void', description: 'Runs firstTask if present, then loops on pool.takeTask(this) until it returns null' }
      ]
    },
    {
      name: 'PoolTask',
      description: 'One unit of submitted work. Never returned directly by the controller — its Runnable field has no Jackson-visible shape (the RCA-049 lesson); only the flat SubmitResult/PoolStats DTOs ever leave the service layer.',
      fields: [
        { name: 'runnable', type: 'Runnable', description: 'The actual work — never serialized, never leaves the service layer' },
        { name: 'status', type: 'volatile TaskStatus', description: 'QUEUED -> RUNNING -> COMPLETED, or REJECTED if a saturation policy fired' }
      ],
      methods: []
    },
    {
      name: 'RejectionPolicy',
      description: 'Strategy interface for what happens to a task the pool cannot accept through its normal core/queue/max path. Every implementation is a stateless singleton — the decision never depends on which task arrived, only on which policy the pool was configured with.',
      fields: [],
      methods: [
        { name: 'decide()', returns: 'RejectionAction', description: 'ABORT / CALLER_RUNS / DISCARD / DISCARD_OLDEST — fixed per policy instance' }
      ]
    },
    {
      name: 'RejectionPolicyFactory',
      description: 'Resolves a RejectionPolicyType to its singleton RejectionPolicy instance.',
      fields: [],
      methods: [
        { name: 'create(type)', returns: 'RejectionPolicy', description: 'Switch over RejectionPolicyType returning the matching singleton — never a new instance' }
      ]
    },
    {
      name: 'ThreadPoolRepository',
      description: 'In-memory store of named pools. Pure storage — not-found handling lives in the service, matching RateLimiterRepository\'s split.',
      fields: [],
      methods: [
        { name: 'register(pool)', returns: 'void', description: 'Adds a pool under its own poolId' },
        { name: 'find(poolId)', returns: 'CustomThreadPool', description: 'Returns null for an unknown id — the service decides what that means' }
      ]
    },
    {
      name: 'ThreadPoolService',
      description: 'Facade the controller delegates to wholesale. Owns the production repository plus a completely separate isolated sandbox pool for the /sim/* engine.',
      fields: [],
      methods: [
        { name: 'submitTask(poolId, taskName, durationMillis)', returns: 'SubmitResult', description: 'Wraps durationMillis in a sleeping Runnable and submits it to the named pool' },
        { name: 'getStats(poolId)', returns: 'PoolStats', description: 'Assembles the read-only DTO from the pool\'s own getters' },
        { name: 'listPools()', returns: 'List<PoolStats>', description: 'One PoolStats per registered pool' },
        { name: 'resizePool(poolId, core, max)', returns: 'PoolStats', description: 'Admin operation: changes a pool\'s sizing' },
        { name: 'shutdownPool(poolId)', returns: 'PoolStats', description: 'Admin operation: stops accepting new submissions' }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Strategy',
      used: true,
      explanation: 'RejectionPolicy is the strategy interface; AbortPolicy, CallerRunsPolicy, DiscardPolicy, and DiscardOldestPolicy are interchangeable, stateless-singleton behaviors for what happens when the pool is saturated.'
    },
    {
      name: 'Factory Method',
      used: true,
      explanation: 'RejectionPolicyFactory.create(type) resolves the correct singleton, so CustomThreadPool and its callers never construct a policy directly.'
    },
    {
      name: 'Facade',
      used: true,
      explanation: 'ThreadPoolController never touches a CustomThreadPool, ThreadPoolRepository, or RejectionPolicy directly — every call goes through ThreadPoolService.'
    },
    {
      name: 'Producer-Consumer',
      used: true,
      explanation: 'submit() (producer) enqueues onto the bounded queue; each Worker\'s run loop (consumer) blocks on the same lock/condition to pull the next task — the classic shape, built from a ReentrantLock + Condition rather than a JDK BlockingQueue.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'CustomThreadPool owns sizing/queueing/rejection decisions; Worker only runs its assigned loop; RejectionPolicy implementations only decide an action; ThreadPoolService only orchestrates and shapes DTOs; ThreadPoolController only translates HTTP.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'A fifth rejection behavior plugs in by adding a RejectionAction value, a new RejectionPolicy implementation, and one new switch arm in CustomThreadPool.submit\'s action handling — the core/queue/max assignment logic never changes.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'CustomThreadPool depends on the RejectionPolicy interface, never on AbortPolicy/CallerRunsPolicy/DiscardPolicy/DiscardOldestPolicy directly.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation — lock-guarded pool state',
      description: 'queue, workers, and workerCount are private; every read and mutation happens under CustomThreadPool\'s own lock, whether the caller is submit(), takeTask(), or workerTerminated().',
      alternative: 'Could expose the raw queue for a caller to inspect directly, but that would let a reader observe (or corrupt) state outside the lock — exactly why PoolStats is assembled from synchronized getters instead.'
    },
    {
      name: 'Polymorphism — RejectionPolicy dispatch',
      description: 'CustomThreadPool.submit() calls rejectionPolicy.decide() through the interface without ever checking which concrete policy it holds.',
      alternative: 'Could branch on a RejectionPolicyType field at the point of saturation instead, but that duplicates the branching at every saturation call site rather than once, in the policy itself.'
    }
  ],
  extensibility: [
    {
      area: 'A fifth rejection policy (e.g. exponential-backoff retry)',
      description: 'Add a RejectionAction value, a new RejectionPolicy singleton, and one new case in CustomThreadPool.submit\'s switch — no other file changes.',
      difficulty: 'Easy'
    },
    {
      area: 'Priority-ordered queue',
      description: 'Swapping the ArrayDeque<PoolTask> for a priority-ordered structure would let a higher-priority task jump the queue; submit()\'s core/queue/max decision logic would not need to change, only the enqueue/pollFirst calls.',
      difficulty: 'Medium'
    },
    {
      area: 'Per-task timeout / cancellation',
      description: 'PoolTask has no deadline today; adding one would need takeTask() to also check for expired queued tasks and a worker to support interrupting a task whose deadline passed mid-run.',
      difficulty: 'Hard'
    }
  ],
  tradeoffs: [
    'A worker spawned specifically for a task is handed that task directly rather than through the shared queue — a small extra code path (Worker.firstTask) in exchange for queueSize() never transiently overcounting a task that already has a dedicated worker (a real race this module\'s own tests caught during development).',
    'Submitting after shutdown always throws PoolShutdownException regardless of the configured RejectionPolicy — simpler than the JDK\'s ThreadPoolExecutor, which still runs the rejection handler post-shutdown, at the cost of one less nuance a caller can configure.',
    'CallerRunsPolicy executes the task synchronously on the submitting thread while still holding no pool lock — deliberately unlocked first, so an arbitrarily slow caller-run task can never block submission to the pool for anyone else.',
    'The isolated /sim/* engine gates tasks on an explicit CountDownLatch instead of a real Thread.sleep duration, trading "the demo tasks look like real timed work" for "the 8-step narrative is exactly reproducible regardless of click speed."'
  ],
  solid: [
    { principle: 'Single Responsibility', details: 'CustomThreadPool = sizing/queueing/rejection; Worker = one run loop; RejectionPolicy implementations = one decision each; ThreadPoolService = orchestration; ThreadPoolController = HTTP boundary.' },
    { principle: 'Open/Closed', details: 'New rejection behaviors plug in via RejectionPolicyFactory without modifying CustomThreadPool\'s core/queue/max assignment algorithm.' }
  ]
};
