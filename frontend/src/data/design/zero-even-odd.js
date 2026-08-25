// designDetails — zero-even-odd
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Print Zero Even Odd — Design Details',
  tldr: [
    'A genuine three-thread coordination primitive built from scratch on three counting Semaphores — zeroSemaphore(1), oddSemaphore(0), evenSemaphore(0) — the classic interview solution, not a scripted animation',
    'The zero thread always goes first for every number: it prints "0", then releases exactly one of oddSemaphore/evenSemaphore based on parity, so zero structurally cannot be skipped or reordered',
    'A run service spins up three real Thread objects and every attempt/print is recorded with a real timestamp, thread name and position — a genuine execution trace',
    'The frontend replays the exact recorded trace it gets back from POST /run, so what you see on screen is what genuinely happened on the JVM'
  ],
  requirements: [
    'Three threads (zero, odd, even) must jointly produce the exact interleave 0 1 0 2 0 3 0 4 ... up to n',
    'The zero thread must print "0" immediately before every single number, with no exceptions',
    'The odd thread prints only odd numbers, in increasing order; the even thread prints only even numbers, in increasing order',
    'The solution must use real thread synchronization primitives (semaphores), not a shared flag polled in a busy loop',
    'Every meaningful state transition (attempt, printed) must be observable with a timestamp and thread identity for diagnostics/visualization',
    'A run must complete in bounded time (seconds) so it can be driven synchronously over HTTP'
  ],
  entities: [
    {
      name: 'ZeroEvenOddPrinter',
      description: 'The primitive itself. Three counting Semaphores enforce that zero always precedes each number, and that odd/even threads only ever get a turn when zero explicitly hands it to them.',
      fields: [
        { name: 'n', type: 'int', description: 'Upper bound of the 1..n sequence to print' },
        { name: 'zeroSemaphore', type: 'Semaphore', description: 'Starts with 1 permit — the zero thread always goes first for each number' },
        { name: 'oddSemaphore', type: 'Semaphore', description: 'Starts at 0; released by zero only when the next number is odd' },
        { name: 'evenSemaphore', type: 'Semaphore', description: 'Starts at 0; released by zero only when the next number is even' },
        { name: 'result', type: 'StringBuilder', description: 'The assembled space-separated output, appended to under a synchronized method' }
      ],
      methods: [
        { name: 'zero()', returns: 'void', description: 'n times: acquire zeroSemaphore, append "0", release oddSemaphore or evenSemaphore based on parity' },
        { name: 'odd()', returns: 'void', description: 'For each odd i in 1..n: acquire oddSemaphore, append i, release zeroSemaphore' },
        { name: 'even()', returns: 'void', description: 'For each even i in 1..n: acquire evenSemaphore, append i, release zeroSemaphore' },
        { name: 'getResult()', returns: 'String', description: 'The fully assembled "0 1 0 2 0 3 ..." string once all three threads finish' }
      ]
    },
    {
      name: 'TraceRecorder',
      description: 'Functional callback the printer invokes for every attempt/print. Keeps the primitive itself free of any HTTP/JSON/orchestration knowledge.',
      fields: [],
      methods: [
        { name: 'record(type, token, n)', returns: 'void', description: 'Appends one fact to the run\'s trace at the exact moment it becomes true' }
      ]
    },
    {
      name: 'TraceEvent',
      description: 'One immutable, ordered, timestamped fact in the trace — the unit the frontend replays.',
      fields: [
        { name: 'sequence', type: 'long', description: 'Assigned from a single shared AtomicLong so cross-thread ordering is unambiguous even on timestamp ties' },
        { name: 'threadName', type: 'String', description: 'The real Java thread that produced this event: zero-thread, odd-thread or even-thread' },
        { name: 'type', type: 'EventType', description: 'ZERO_ATTEMPT / ZERO_PRINTED / ODD_ATTEMPT / ODD_PRINTED / EVEN_ATTEMPT / EVEN_PRINTED' }
      ],
      methods: []
    },
    {
      name: 'ZeroEvenOddService',
      description: 'Orchestrates one run: builds a fresh ZeroEvenOddPrinter, starts the three real Threads against it, waits for completion, and assembles the ordered RunResult.',
      fields: [
        { name: 'MAX_N', type: 'int', description: 'Safety ceiling so a run always finishes in seconds' },
        { name: 'RUN_TIMEOUT_SECONDS', type: 'long', description: 'Upper bound the service waits on Thread.join() before treating the run as a server-side fault' }
      ],
      methods: [
        { name: 'run(RunRequest)', returns: 'RunResult', description: 'Validates n, starts zero/odd/even threads, blocks until all three finish, returns the full ordered trace plus the assembled sequence' }
      ]
    },
    {
      name: 'ZeroEvenOddController',
      description: 'REST facade — POST /api/concurrency/zero-even-odd/run executes a bounded, synchronous run and returns the RunResult as JSON.',
      fields: [],
      methods: [
        { name: 'run(RunRequest)', returns: 'ResponseEntity<RunResult>', description: 'Delegates to ZeroEvenOddService.run and returns 200 with the full trace' }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Monitor-style Coordination (Semaphores)',
      used: true,
      explanation: 'Three counting semaphores act as a strict dispatcher: zero always holds the initiative and hands it to exactly one of odd/even per number, which is what makes "zero always precedes each number" structurally guaranteed rather than merely likely.'
    },
    {
      name: 'Observer (via TraceRecorder callback)',
      used: true,
      explanation: 'The printer never knows who is listening — it just calls TraceRecorder.record() on every event. The service supplies a concrete recorder that appends to a trace list.'
    },
    {
      name: 'Facade',
      used: true,
      explanation: 'ZeroEvenOddService hides thread creation, timeout handling and trace assembly behind one run(RunRequest) call; the controller and callers never touch Thread or Semaphore directly.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'ZeroEvenOddPrinter only implements the dispatch contract. ZeroEvenOddService only orchestrates threads and assembles results. TraceRecorder only records.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'New instrumentation plugs in via the TraceRecorder functional interface without touching ZeroEvenOddPrinter\'s semaphore logic at all.'
    },
    {
      name: 'Fail Fast',
      description: 'ZeroEvenOddService validates n up front and throws a typed InvalidZeroEvenOddParametersException before a single thread is ever started.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation — semaphore-guarded state',
      description: 'The result StringBuilder is only ever appended to from inside a synchronized method, and only ever by whichever thread currently holds the relevant permit.',
      alternative: 'Could expose the StringBuilder directly, but that would let a caller mutate it outside the dispatch contract.'
    },
    {
      name: 'Immutability — TraceEvent / RunResult',
      description: 'Both are Java records: once an event is appended it can never be mutated, which is what makes "replay the trace" a safe, side-effect-free operation on the frontend.',
      alternative: 'Could use mutable DTOs updated in place, but that would make concurrent recording from three threads unsafe without extra locking.'
    }
  ],
  extensibility: [
    {
      area: 'K-way modular dispatch',
      description: 'The same "one dispatcher semaphore plus k worker semaphores" shape generalizes to k threads each responsible for numbers matching i mod k, with the dispatcher choosing which permit to release.',
      difficulty: 'Medium'
    },
    {
      area: 'Timed variants',
      description: 'Add a tryAcquire(timeout) path so a stuck partner thread degrades to a typed timeout error instead of blocking the HTTP call forever.',
      difficulty: 'Easy'
    }
  ],
  tradeoffs: [
    'Built the primitive from scratch on three Semaphores rather than one lock with three Conditions, because a dedicated permit per role makes the "who goes next" decision explicit at every release site.',
    'Runs are synchronous (the HTTP call blocks until the run finishes) rather than streamed, so n is capped (<= 2000) to keep every run in the seconds range.',
    'odd() and even() each loop only over their own numbers (i += 2), relying entirely on zero\'s dispatch to hand them exactly the right count of turns — this is what keeps the thread bodies simple instead of needing a shared "whose turn" check inside odd/even themselves.'
  ],
  solid: [
    { principle: 'Single Responsibility', details: 'ZeroEvenOddPrinter = dispatch primitive; ZeroEvenOddService = thread orchestration; ZeroEvenOddController = HTTP boundary.' },
    { principle: 'Open/Closed', details: 'New event consumers (metrics, a different frontend) plug in via TraceRecorder without modifying the printer.' }
  ]
};
