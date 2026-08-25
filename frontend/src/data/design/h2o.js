// designDetails — h2o
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Building H2O — Design Details',
  tldr: [
    'A genuine hydrogen/oxygen bonding primitive built from scratch on two counting Semaphores (2 permits for H, 1 for O) plus a CyclicBarrier(3) — the classic "Building H2O" interview solution, not a scripted animation',
    'Because the system-wide permit supply exactly matches one molecule\'s composition (2 H + 1 O), the barrier can only ever trip with exactly that composition — never 3 of the same element',
    'The barrier\'s action (which CyclicBarrier guarantees runs to completion before any of the 3 waiting threads are released) is the single place the H/O tokens are appended, in a fixed canonical order (H, O, H) — this is what additionally guarantees no run of 3 identical atoms can appear anywhere in the output, including across a trio boundary, not just within one trio',
    'A run service spins up 2 * moleculeCount hydrogen threads and moleculeCount oxygen threads in randomised start order, and every attempt/acquire/departure/bond is recorded with a real timestamp — a genuine execution trace, replayed exactly as recorded on the frontend'
  ],
  requirements: [
    'Hydrogen and oxygen threads must jointly emit a stream where every 3 consecutive outputs are exactly 2 H\'s and 1 O — never 3 H\'s or 3 O\'s adjacent, for any window, not just aligned trio boundaries',
    'The 2:1 hydrogen-to-oxygen ratio must be enforced by the coordination itself, not by the caller supplying a pre-shuffled correct sequence',
    'The solution must use real thread synchronization primitives (semaphores + a barrier), not a shared counter polled in a busy loop',
    'The system must remain correct under a randomised, large number of atoms and an arbitrary thread start order',
    'Every meaningful state transition (attempt, acquired, departed, bonded) must be observable with a timestamp and thread identity for diagnostics/visualization',
    'A run must complete in bounded time (seconds) so it can be driven synchronously over HTTP'
  ],
  entities: [
    {
      name: 'H2OBonder',
      description: 'The primitive itself. Two Semaphores cap the system-wide in-flight atom count at exactly one molecule\'s worth; a CyclicBarrier(3) with a bonding action forms and prints each molecule atomically.',
      fields: [
        { name: 'hydrogenSemaphore', type: 'Semaphore', description: 'Exactly 2 permits — the entire system-wide hydrogen supply' },
        { name: 'oxygenSemaphore', type: 'Semaphore', description: 'Exactly 1 permit — the entire system-wide oxygen supply' },
        { name: 'barrier', type: 'CyclicBarrier', description: 'Parties = 3; its action (bond()) runs once per trip, before any of the 3 are released' },
        { name: 'output', type: 'List<String>', description: 'The bonded token sequence ("H"/"O"), mutated only inside bond()' },
        { name: 'moleculeCount', type: 'AtomicInteger', description: 'How many H2O molecules have bonded so far' }
      ],
      methods: [
        { name: 'hydrogen()', returns: 'void', description: 'Acquire hydrogenSemaphore, await the barrier, release hydrogenSemaphore' },
        { name: 'oxygen()', returns: 'void', description: 'Acquire oxygenSemaphore, await the barrier, release oxygenSemaphore' },
        { name: 'bond()', returns: 'void', description: 'Barrier action: appends H, O, H in fixed canonical order — runs exactly once per trip, synchronized against concurrent trace reads' },
        { name: 'getResult()', returns: 'String', description: 'The fully assembled space-separated H/O output once every thread finishes' }
      ]
    },
    {
      name: 'TraceRecorder',
      description: 'Functional callback H2OBonder invokes for every attempt/acquire/departure/bond. Keeps the primitive itself free of any HTTP/JSON/orchestration knowledge.',
      fields: [],
      methods: [
        { name: 'record(type, item, outputLengthNow)', returns: 'void', description: 'Appends one fact to the run\'s trace at the exact moment it becomes true' }
      ]
    },
    {
      name: 'TraceEvent',
      description: 'One immutable, ordered, timestamped fact in the trace — the unit the frontend replays.',
      fields: [
        { name: 'sequence', type: 'long', description: 'Assigned from a single shared AtomicLong so cross-thread ordering is unambiguous even on timestamp ties' },
        { name: 'threadName', type: 'String', description: 'The real Java thread that produced this event, e.g. H-7 or O-3' },
        { name: 'type', type: 'EventType', description: 'HYDROGEN_ATTEMPT / HYDROGEN_ACQUIRED / HYDROGEN_DEPARTED / OXYGEN_* / MOLECULE_BONDED' }
      ],
      methods: []
    },
    {
      name: 'H2OService',
      description: 'Orchestrates one run: builds a fresh H2OBonder, starts 2*moleculeCount hydrogen threads and moleculeCount oxygen threads in shuffled order, waits for completion, and assembles the ordered RunResult.',
      fields: [
        { name: 'MAX_MOLECULE_COUNT', type: 'int', description: 'Safety ceiling so a run (and its up to 3x MAX_MOLECULE_COUNT threads) always finishes in seconds' },
        { name: 'RUN_TIMEOUT_SECONDS', type: 'long', description: 'Upper bound the service waits on Thread.join() before treating the run as a server-side fault' }
      ],
      methods: [
        { name: 'run(RunRequest)', returns: 'RunResult', description: 'Validates moleculeCount, starts all H/O threads in randomised order, blocks until every thread finishes, returns the full ordered trace plus the assembled output' }
      ]
    },
    {
      name: 'H2OController',
      description: 'REST facade — POST /api/concurrency/h2o/run executes a bounded, synchronous run and returns the RunResult as JSON.',
      fields: [],
      methods: [
        { name: 'run(RunRequest)', returns: 'ResponseEntity<RunResult>', description: 'Delegates to H2OService.run and returns 200 with the full trace' }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Rendezvous (CyclicBarrier)',
      used: true,
      explanation: 'The barrier forces exactly 3 threads to arrive before any of them proceeds — combined with the permit caps, this makes "exactly 2H+1O per trip" a structural guarantee, not a probabilistic one.'
    },
    {
      name: 'Command executed by the trip-triggering thread (CyclicBarrier action)',
      used: true,
      explanation: 'bond() is guaranteed by CyclicBarrier\'s contract to run to completion, on the triggering thread, before any of the 3 waiting threads are released — this is what lets one thread perform the entire "append H, O, H" sequence without a race against its own trio-mates.'
    },
    {
      name: 'Observer (via TraceRecorder callback)',
      used: true,
      explanation: 'The bonder never knows who is listening — it just calls TraceRecorder.record() on every event.'
    },
    {
      name: 'Facade',
      used: true,
      explanation: 'H2OService hides thread creation, shuffled start order, timeout handling and trace assembly behind one run(RunRequest) call.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'H2OBonder only implements the bonding contract. H2OService only orchestrates threads and assembles results.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'New instrumentation plugs in via the TraceRecorder functional interface without touching H2OBonder\'s semaphore/barrier logic at all.'
    },
    {
      name: 'Fail Fast',
      description: 'H2OService validates moleculeCount up front and throws a typed InvalidH2OParametersException before a single thread is ever started.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation — dual-monitor guarded state',
      description: 'output is only ever mutated inside the synchronized bond() method, and only ever read externally through the equally-synchronized currentOutputLength() — no caller can observe a torn (partially-appended) trio.',
      alternative: 'Could skip synchronizing bond() since CyclicBarrier itself is thread-safe, but that would leave a genuine race against concurrent trace reads from a different trio\'s threads — verified and fixed during development (see RCA log).'
    },
    {
      name: 'Immutability — TraceEvent / RunResult',
      description: 'Both are Java records: once an event is appended it can never be mutated.',
      alternative: 'Could use mutable DTOs updated in place, but that would make concurrent recording from many H/O threads unsafe without extra locking.'
    }
  ],
  extensibility: [
    {
      area: 'Other stoichiometries',
      description: 'The same "permits == exact molecule composition, barrier parties == total atom count" shape generalizes to any A_xB_y compound by setting the semaphore permits to x and y and the barrier parties to x+y.',
      difficulty: 'Medium'
    },
    {
      area: 'Streaming bonding events',
      description: 'Replace the synchronous "wait for the whole run" contract with Server-Sent Events so a much larger atom count could be watched bonding live.',
      difficulty: 'Hard'
    }
  ],
  tradeoffs: [
    'Chose to have the barrier action itself perform the canonical H,O,H append (rather than let each of the 3 released threads print independently) specifically to eliminate any possibility of a 3-in-a-row run at a trio boundary — the simpler "each thread prints itself" variant is correct per-trio but not correct for every sliding window.',
    'Threads are started in shuffled order (not "all H then all O") specifically to stress-test the coordination under a genuinely randomised arrival pattern rather than a convenient one.',
    'Runs are synchronous (the HTTP call blocks until the run finishes) rather than streamed, so moleculeCount is capped (<= 150, i.e. <= 450 threads) to keep every run in the seconds range.'
  ],
  solid: [
    { principle: 'Single Responsibility', details: 'H2OBonder = bonding primitive; H2OService = thread orchestration; H2OController = HTTP boundary.' },
    { principle: 'Open/Closed', details: 'New event consumers (metrics, a different frontend) plug in via TraceRecorder without modifying the bonder.' }
  ]
};
