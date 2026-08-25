// designDetails — fizz-buzz
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Multithreaded FizzBuzz — Design Details',
  tldr: [
    'A genuine four-thread monitor coordination primitive built from scratch on one ReentrantLock + one Condition — the classic interview solution, not a scripted animation',
    'All four threads (number, fizz, buzz, fizzbuzz) share one lock guarding a single counter; each loops, and while the counter does not match its own predicate it await()s, releasing the lock so the correct thread can proceed',
    'The four predicates (divisible by 15; by 3 only; by 5 only; by neither) are mutually exclusive and collectively exhaustive over every integer, so exactly one thread\'s predicate ever matches — no busy-waiting, no possibility of two threads printing the same number',
    'A run service spins up four real Thread objects and every attempt/print is recorded with a real timestamp, thread name and number — a genuine execution trace, replayed exactly as recorded on the frontend'
  ],
  requirements: [
    'Four threads must jointly produce the canonical FizzBuzz sequence for 1..n: multiples of 15 -> "FizzBuzz", multiples of 3 (not 15) -> "Fizz", multiples of 5 (not 15) -> "Buzz", everything else -> the number itself',
    'No number may be printed twice; no number may be skipped',
    'Each of the four categories must be handled by its own dedicated thread',
    'The solution must use real thread synchronization primitives (lock + condition), not a shared flag polled in a busy loop',
    'Every meaningful state transition (attempt, printed) must be observable with a timestamp and thread identity for diagnostics/visualization',
    'A run must complete in bounded time (seconds) so it can be driven synchronously over HTTP'
  ],
  entities: [
    {
      name: 'FizzBuzzPrinter',
      description: 'The primitive itself. One ReentrantLock + Condition monitor shared by all four threads, guarding a single "current number" counter.',
      fields: [
        { name: 'n', type: 'int', description: 'Upper bound of the 1..n sequence to print' },
        { name: 'lock', type: 'ReentrantLock', description: 'Single lock guarding the current counter and the output buffer' },
        { name: 'condition', type: 'Condition', description: 'Threads await() here while it is not their turn; signalAll() on every successful print' },
        { name: 'current', type: 'int', description: 'The next number to be claimed, 1..n+1 (guarded by lock)' },
        { name: 'result', type: 'StringBuilder', description: 'The assembled space-separated output, appended to only under the lock' }
      ],
      methods: [
        { name: 'number()', returns: 'void', description: 'Claims and prints every number divisible by neither 3 nor 5' },
        { name: 'fizz()', returns: 'void', description: 'Claims and prints "Fizz" for every number divisible by 3 but not 5' },
        { name: 'buzz()', returns: 'void', description: 'Claims and prints "Buzz" for every number divisible by 5 but not 3' },
        { name: 'fizzbuzz()', returns: 'void', description: 'Claims and prints "FizzBuzz" for every number divisible by both 3 and 5' },
        { name: 'getResult()', returns: 'String', description: 'The fully assembled canonical FizzBuzz string once every thread finishes' }
      ]
    },
    {
      name: 'TraceRecorder',
      description: 'Functional callback the printer invokes, still holding its lock, for every attempt/print. Keeps the primitive itself free of any HTTP/JSON/orchestration knowledge.',
      fields: [],
      methods: [
        { name: 'record(type, token, n)', returns: 'void', description: 'Appends one fact to the run\'s trace; called from inside the critical section so the reported counter value is never racy' }
      ]
    },
    {
      name: 'TraceEvent',
      description: 'One immutable, ordered, timestamped fact in the trace — the unit the frontend replays.',
      fields: [
        { name: 'sequence', type: 'long', description: 'Assigned from a single shared AtomicLong so cross-thread ordering is unambiguous even on timestamp ties' },
        { name: 'threadName', type: 'String', description: 'The real Java thread that produced this event: number-thread, fizz-thread, buzz-thread or fizzbuzz-thread' },
        { name: 'type', type: 'EventType', description: 'NUMBER/FIZZ/BUZZ/FIZZBUZZ, each with an _ATTEMPT and a _PRINTED variant' }
      ],
      methods: []
    },
    {
      name: 'FizzBuzzService',
      description: 'Orchestrates one run: builds a fresh FizzBuzzPrinter, starts the four real Threads against it, waits for completion, and assembles the ordered RunResult.',
      fields: [
        { name: 'MAX_N', type: 'int', description: 'Safety ceiling so a run always finishes in seconds' },
        { name: 'RUN_TIMEOUT_SECONDS', type: 'long', description: 'Upper bound the service waits on Thread.join() before treating the run as a server-side fault' }
      ],
      methods: [
        { name: 'run(RunRequest)', returns: 'RunResult', description: 'Validates n, starts all four threads, blocks until every thread finishes, returns the full ordered trace plus the assembled sequence' }
      ]
    },
    {
      name: 'FizzBuzzController',
      description: 'REST facade — POST /api/concurrency/fizz-buzz/run executes a bounded, synchronous run and returns the RunResult as JSON.',
      fields: [],
      methods: [
        { name: 'run(RunRequest)', returns: 'ResponseEntity<RunResult>', description: 'Delegates to FizzBuzzService.run and returns 200 with the full trace' }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Monitor Object (Lock + Condition)',
      used: true,
      explanation: 'FizzBuzzPrinter is a textbook monitor: one ReentrantLock guards the shared counter, and every thread waits on the same Condition, re-checking its own predicate on every wakeup rather than assuming it is its turn.'
    },
    {
      name: 'Strategy (per-thread predicate + formatter)',
      used: true,
      explanation: 'A single private worker(matches, formatter, ...) method is parameterized per thread with an IntPredicate and a Function<Integer,String> — the four public methods are thin one-line configurations of the same generic loop.'
    },
    {
      name: 'Observer (via TraceRecorder callback)',
      used: true,
      explanation: 'The printer never knows who is listening — it just calls TraceRecorder.record() on every event, from inside the lock so the reported counter is never racy.'
    },
    {
      name: 'Facade',
      used: true,
      explanation: 'FizzBuzzService hides thread creation, timeout handling and trace assembly behind one run(RunRequest) call.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'FizzBuzzPrinter only implements the monitor/dispatch contract. FizzBuzzService only orchestrates threads and assembles results.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'A fifth category (e.g. "Buzz-Fizz-7" for multiples of 7) plugs in as one more worker(...) call with its own predicate/formatter, without touching the other three threads.'
    },
    {
      name: 'Fail Fast',
      description: 'FizzBuzzService validates n up front and throws a typed InvalidFizzBuzzParametersException before a single thread is ever started.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation — lock-guarded state',
      description: 'current and the output buffer are private; every read and write happens under the same ReentrantLock.',
      alternative: 'Could use an AtomicInteger for current with CAS-based busy-spinning threads instead of a monitor, but that trades clean blocking for wasted CPU cycles.'
    },
    {
      name: 'Higher-order functions — Strategy without a class hierarchy',
      description: 'Each thread\'s "which numbers am I responsible for" and "what do I print" are passed as an IntPredicate and a Function<Integer,String> rather than four separate worker subclasses.',
      alternative: 'Could define four small classes implementing a common Worker interface, but that is more ceremony for four one-line rules.'
    }
  ],
  extensibility: [
    {
      area: 'Additional categories',
      description: 'Adding a fifth divisor rule is one more worker(...) call plus one more thread — the monitor\'s mutual-exclusion-and-signal-all shape does not change.',
      difficulty: 'Easy'
    },
    {
      area: 'Fairness',
      description: 'new ReentrantLock(true) gives FIFO lock acquisition among the four waiting threads, trading a little throughput for predictable wake order.',
      difficulty: 'Easy'
    }
  ],
  tradeoffs: [
    'Chose one shared Condition with signalAll() over four dedicated per-role Conditions, because a wrong-predicate thread waking up and immediately re-await()ing is cheap, and one condition keeps the worker() method identical for all four roles.',
    'Runs are synchronous (the HTTP call blocks until the run finishes) rather than streamed, so n is capped (<= 3000) to keep every run in the seconds range.',
    'Records an _ATTEMPT event on every wakeup (not just the first check), so the trace visibly shows threads repeatedly checking and losing before the one whose turn it is finally wins — this is what makes the "monitor, not magic" mechanism visible in the replay.'
  ],
  solid: [
    { principle: 'Single Responsibility', details: 'FizzBuzzPrinter = monitor primitive; FizzBuzzService = thread orchestration; FizzBuzzController = HTTP boundary.' },
    { principle: 'Open/Closed', details: 'New categories plug in via an additional predicate/formatter pair without modifying the existing three.' }
  ]
};
