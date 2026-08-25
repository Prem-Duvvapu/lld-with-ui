// designDetails — foo-bar
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Print FooBar Alternately — Design Details',
  tldr: [
    'A genuine two-thread strict-alternation primitive built from scratch on two counting Semaphores (fooSemaphore starts at 1, barSemaphore starts at 0) — the classic interview solution, not a scripted animation',
    'foo() and bar() each loop n times: acquire your own semaphore, append your token, release the OTHER thread\'s semaphore — the ping-pong handoff makes interleaving corruption structurally impossible',
    'A run service spins up two real Thread objects and every attempt/print is recorded with a real timestamp, thread name and repetition number — a genuine execution trace',
    'The frontend replays the exact recorded trace it gets back from POST /run, so what you see on screen is what genuinely happened on the JVM, scaled for pleasant playback'
  ],
  requirements: [
    'Two threads must print "foo" and "bar" respectively, n times each, producing "foobar" repeated exactly n times',
    'Output must never interleave — "foo" and "bar" must always alternate strictly, never "foofoo" or "barbar"',
    'The foo thread always goes first for every repetition',
    'The solution must use real thread synchronization primitives (semaphores), not a shared flag polled in a busy loop',
    'Every meaningful state transition (attempt, printed) must be observable with a timestamp and thread identity for diagnostics/visualization',
    'A run must complete in bounded time (seconds) so it can be driven synchronously over HTTP'
  ],
  entities: [
    {
      name: 'FooBarPrinter',
      description: 'The primitive itself. Two counting Semaphores (fooSemaphore(1), barSemaphore(0)) enforce strict two-thread ping-pong alternation.',
      fields: [
        { name: 'n', type: 'int', description: 'Number of times "foobar" must be printed' },
        { name: 'fooSemaphore', type: 'Semaphore', description: 'Starts with 1 permit — the foo thread always goes first' },
        { name: 'barSemaphore', type: 'Semaphore', description: 'Starts with 0 permits — the bar thread must wait for foo to release it' },
        { name: 'result', type: 'StringBuilder', description: 'The assembled output, appended to under a synchronized method' }
      ],
      methods: [
        { name: 'foo()', returns: 'void', description: 'n times: acquire fooSemaphore, append "foo", release barSemaphore' },
        { name: 'bar()', returns: 'void', description: 'n times: acquire barSemaphore, append "bar", release fooSemaphore' },
        { name: 'getResult()', returns: 'String', description: 'The fully assembled "foobar" x n string once both threads finish' }
      ]
    },
    {
      name: 'TraceRecorder',
      description: 'Functional callback the printer invokes for every attempt/print. Keeps the primitive itself free of any HTTP/JSON/orchestration knowledge.',
      fields: [],
      methods: [
        { name: 'record(type, item, repetition)', returns: 'void', description: 'Appends one fact to the run\'s trace at the exact moment it becomes true' }
      ]
    },
    {
      name: 'TraceEvent',
      description: 'One immutable, ordered, timestamped fact in the trace — the unit the frontend replays.',
      fields: [
        { name: 'sequence', type: 'long', description: 'Assigned from a single shared AtomicLong so cross-thread ordering is unambiguous even on timestamp ties' },
        { name: 'threadName', type: 'String', description: 'The real Java thread that produced this event: foo-thread or bar-thread' },
        { name: 'type', type: 'EventType', description: 'FOO_ATTEMPT / FOO_PRINTED / BAR_ATTEMPT / BAR_PRINTED' }
      ],
      methods: []
    },
    {
      name: 'FooBarService',
      description: 'Orchestrates one run: builds a fresh FooBarPrinter, starts the two real Threads against it, waits for completion, and assembles the ordered RunResult.',
      fields: [
        { name: 'MAX_N', type: 'int', description: 'Safety ceiling so a run always finishes in seconds' },
        { name: 'RUN_TIMEOUT_SECONDS', type: 'long', description: 'Upper bound the service waits on Thread.join() before treating the run as a server-side fault' }
      ],
      methods: [
        { name: 'run(RunRequest)', returns: 'RunResult', description: 'Validates n, starts foo/bar threads, blocks until both finish, returns the full ordered trace plus the assembled string' }
      ]
    },
    {
      name: 'FooBarController',
      description: 'REST facade — POST /api/concurrency/foo-bar/run executes a bounded, synchronous run and returns the RunResult as JSON.',
      fields: [],
      methods: [
        { name: 'run(RunRequest)', returns: 'ResponseEntity<RunResult>', description: 'Delegates to FooBarService.run and returns 200 with the full trace' }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Monitor-style Coordination (Semaphores)',
      used: true,
      explanation: 'Two counting semaphores act as a strict hand-off baton: only one thread can ever hold a permit to proceed at a time, which is what makes interleaving structurally impossible rather than merely unlikely.'
    },
    {
      name: 'Observer (via TraceRecorder callback)',
      used: true,
      explanation: 'The printer never knows who is listening — it just calls TraceRecorder.record() on every event. The service supplies a concrete recorder that appends to a trace list; a test can supply one that just captures the type sequence.'
    },
    {
      name: 'Facade',
      used: true,
      explanation: 'FooBarService hides thread creation, timeout handling and trace assembly behind one run(RunRequest) call; the controller and callers never touch Thread or Semaphore directly.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'FooBarPrinter only implements the alternation contract. FooBarService only orchestrates threads and assembles results. TraceRecorder only records.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'New instrumentation plugs in via the TraceRecorder functional interface without touching FooBarPrinter\'s semaphore logic at all.'
    },
    {
      name: 'Fail Fast',
      description: 'FooBarService validates n up front and throws a typed InvalidFooBarParametersException before a single thread is ever started.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation — semaphore-guarded state',
      description: 'The result StringBuilder is only ever appended to from inside a synchronized method, and only ever by whichever thread currently holds a permit — no caller can observe or corrupt a torn state.',
      alternative: 'Could expose the StringBuilder directly, but that would let a caller mutate it outside the alternation contract.'
    },
    {
      name: 'Immutability — TraceEvent / RunResult',
      description: 'Both are Java records: once an event is appended it can never be mutated, which is what makes "replay the trace" a safe, side-effect-free operation on the frontend.',
      alternative: 'Could use mutable DTOs updated in place, but that would make concurrent recording from two threads unsafe without extra locking.'
    }
  ],
  extensibility: [
    {
      area: 'N-way alternation',
      description: 'The same two-semaphore idea generalizes to a ring of k semaphores, each releasing the next in a cycle, for a k-thread strict round-robin rather than a two-thread ping-pong.',
      difficulty: 'Medium'
    },
    {
      area: 'Timed variants',
      description: 'Add a tryAcquire(timeout) path so a stuck partner thread degrades to a typed timeout error instead of blocking the HTTP call forever.',
      difficulty: 'Easy'
    }
  ],
  tradeoffs: [
    'Built the primitive from scratch on two Semaphores rather than a single shared lock with two Conditions, because the ping-pong handoff is the cleanest expression of "give the other thread exactly one turn."',
    'Runs are synchronous (the HTTP call blocks until the run finishes) rather than streamed, so n is capped (<= 1000) to keep every run in the seconds range.',
    'The trace records both an ATTEMPT and a PRINTED event per repetition per thread — twice the event volume of the bare minimum — because seeing the attempt-then-block-then-proceed shape is what makes the alternation visible in the replay, not just the final string.'
  ],
  solid: [
    { principle: 'Single Responsibility', details: 'FooBarPrinter = alternation primitive; FooBarService = thread orchestration; FooBarController = HTTP boundary.' },
    { principle: 'Open/Closed', details: 'New event consumers (metrics, a different frontend) plug in via TraceRecorder without modifying the printer.' }
  ]
};
