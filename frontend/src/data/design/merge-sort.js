// designDetails — merge-sort
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Multi-threaded Merge Sort — Design Details',
  tldr: [
    'A genuine parallel merge sort built on java.util.concurrent.ForkJoinPool + RecursiveAction — not a simulated animation of divide-and-conquer',
    'Each SortTask.compute() partitions its range, forks the right half onto the pool (right.fork()), sorts the left half on the current thread, then joins — real fork/join work-stealing, so different halves genuinely execute on different worker threads',
    'A sequentialThreshold stops forking once a subrange is small enough that fork/join bookkeeping would outweigh the work — the classic ForkJoin tuning knob',
    'The pool is built with an explicit parallelism level (new ForkJoinPool(n)) instead of ForkJoinPool.commonPool(), so a run\'s behavior is reproducible regardless of how many cores the CI machine happens to have',
    'Every partition, fork, merge-start, individual merge write and merge-complete is recorded with a real timestamp and thread name, so the frontend replays the actual recorded recursion tree — including genuine cross-thread parallelism — rather than a canned example'
  ],
  requirements: [
    'Sort an array of integers into ascending order using the merge sort algorithm',
    'The divide phase must genuinely run in parallel across multiple threads when the array is large enough to justify it',
    'Small subranges must be sorted without the overhead of forking a new task per element',
    'The result must be provably correct: sorting a random array with this sorter must match sorting the same array with a reference sort',
    'The original input array must not be mutated by a sort call',
    'A run must be reproducible in its degree of parallelism (explicit ForkJoinPool size, not the shared common pool)',
    'Every meaningful recursion event (partition, fork, merge start/write/complete) must be observable with a timestamp and real thread identity for diagnostics/visualization',
    'A run must complete in bounded time (seconds) so it can be driven synchronously over HTTP'
  ],
  entities: [
    {
      name: 'ParallelMergeSorter',
      description: 'The primitive itself. Clones the input, builds a same-length scratch buffer, submits one root SortTask to a purpose-built ForkJoinPool, and blocks (with a timeout) until it completes.',
      fields: [
        { name: 'parallelism', type: 'int', description: 'Explicit size passed to new ForkJoinPool(parallelism) — never the shared common pool' },
        { name: 'sequentialThreshold', type: 'int', description: 'Subranges at or below this size are sorted directly (left.compute(); right.compute();) instead of forking' },
        { name: 'recorder', type: 'TraceRecorder', description: 'Callback invoked from whichever real thread produced the event' }
      ],
      methods: [
        { name: 'sort(int[])', returns: 'int[]', description: 'Clones the input, runs the ForkJoin sort to completion, returns the sorted array; the original array passed in is left untouched' }
      ]
    },
    {
      name: 'SortTask (extends RecursiveAction)',
      description: 'One divide-and-conquer step over an inclusive range [lo, hi] of the shared array, merging through the shared scratch buffer. A non-static inner class of ParallelMergeSorter so it can read sequentialThreshold/recorder without duplicating them per task.',
      fields: [
        { name: 'array', type: 'int[]', description: 'The shared array being sorted in place — the same reference across every task in the tree' },
        { name: 'lo / hi', type: 'int', description: 'Inclusive bounds of this task\'s range' },
        { name: 'buffer', type: 'int[]', description: 'Shared scratch array used during merges, avoiding a fresh allocation per merge' }
      ],
      methods: [
        { name: 'compute()', returns: 'void', description: 'Base case if lo>=hi; else partitions at mid, forks the right half or runs both directly under the threshold, then merges' }
      ]
    },
    {
      name: 'TraceRecorder',
      description: 'Functional callback the sorter invokes for every partition/fork/merge event, on whichever thread produced it. Keeps the sorter itself free of any HTTP/JSON/orchestration knowledge.',
      fields: [],
      methods: [
        { name: 'record(type, lo, hi, mid, position, value, sourceSide)', returns: 'void', description: 'Appends one fact to the run\'s trace; nullable fields are only meaningful for specific event types' }
      ]
    },
    {
      name: 'TraceEvent',
      description: 'One immutable, ordered, timestamped fact in the trace — the unit the frontend replays.',
      fields: [
        { name: 'sequence', type: 'long', description: 'Assigned from a single shared AtomicLong so cross-thread ordering is unambiguous even on timestamp ties' },
        { name: 'timestamp / elapsedNanos', type: 'Instant / long', description: 'Wall-clock and run-relative timing' },
        { name: 'threadName', type: 'String', description: 'The real ForkJoinPool worker (or submitting) thread that produced this event' },
        { name: 'type', type: 'EventType', description: 'PARTITION / BASE_CASE / FORK_RIGHT / MERGE_START / MERGE_WRITE / MERGE_COMPLETE' },
        { name: 'lo / hi / mid', type: 'int / int / Integer', description: 'The range this event concerns, and its split point where applicable' },
        { name: 'position / value / sourceSide', type: 'Integer / Integer / String', description: 'For MERGE_WRITE: the scratch-buffer index written, the value written, and whether it came from the LEFT or RIGHT sub-range' }
      ],
      methods: []
    },
    {
      name: 'MergeSortService',
      description: 'Orchestrates one run: resolves an effective array (caller-supplied or freshly random), validates parameters, runs a ParallelMergeSorter, and assembles the ordered RunResult.',
      fields: [
        { name: 'MAX_SIZE / MAX_PARALLELISM / MAX_SEQUENTIAL_THRESHOLD', type: 'int', description: 'Safety ceilings so a run always finishes in seconds, not longer' }
      ],
      methods: [
        { name: 'run(RunRequest)', returns: 'RunResult', description: 'Validates parameters, runs the sort, returns the sorted array plus the full ordered trace' }
      ]
    },
    {
      name: 'MergeSortController',
      description: 'REST facade — POST /api/concurrency/merge-sort/run executes a bounded, synchronous run and returns the RunResult as JSON.',
      fields: [],
      methods: [
        { name: 'run(RunRequest)', returns: 'ResponseEntity<RunResult>', description: 'Delegates to MergeSortService.run and returns 200 with the full trace' }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Fork/Join (Divide and Conquer)',
      used: true,
      explanation: 'SortTask.compute() is the textbook fork/join shape: split the problem, fork one half onto the pool so it can run on another worker thread, solve the other half on the current thread, join, then combine (merge) the results.'
    },
    {
      name: 'Observer (via TraceRecorder callback)',
      used: true,
      explanation: 'SortTask never knows who is listening — it just calls TraceRecorder.record() on every event. The service supplies a concrete recorder that appends to a trace list; a test can supply one that just counts distinct thread names.'
    },
    {
      name: 'Facade',
      used: true,
      explanation: 'MergeSortService hides ForkJoinPool construction, timeout handling and trace assembly behind one run(RunRequest) call; the controller and callers never touch ForkJoinPool or RecursiveAction directly.'
    },
    {
      name: 'Template-ish recursive step',
      used: true,
      explanation: 'Every SortTask follows the same shape (base case check, partition, recurse-or-fork, merge) regardless of depth, which is what makes the frontend able to draw the whole recursion tree structurally, ahead of replay.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'ParallelMergeSorter/SortTask only implement the sort. MergeSortService only orchestrates a run and assembles results. TraceRecorder only records. Nobody mixes concurrency primitives with HTTP concerns.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'New instrumentation (e.g. a recorder that also emits metrics) plugs in via the TraceRecorder functional interface without touching SortTask\'s fork/join logic at all.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'SortTask depends on the TraceRecorder abstraction, not on how or whether events are stored — tests inject a NOOP or a trace-collecting recorder without changing the sorter.'
    },
    {
      name: 'Fail Fast',
      description: 'MergeSortService validates size/parallelism/sequentialThreshold (and an array/size mismatch) up front and throws a typed InvalidSortParametersException before a single SortTask is ever submitted.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation — the scratch buffer never escapes',
      description: 'The buffer array is only ever touched inside compute()/merge(); callers of sort() only ever see the final sorted int[], never the intermediate scratch state.',
      alternative: 'Could allocate a fresh buffer per merge call for a simpler mental model, but sharing one scratch array across the whole tree avoids O(n log n) extra allocations.'
    },
    {
      name: 'Composition — inner class over inheritance',
      description: 'SortTask is a non-static inner class of ParallelMergeSorter, giving it access to sequentialThreshold/recorder by composition rather than by subclassing RecursiveAction with duplicated fields per instantiation site.',
      alternative: 'Could make SortTask a static top-level class taking sequentialThreshold/recorder as constructor arguments — slightly more boilerplate per task but decouples it from the outer sorter entirely.'
    },
    {
      name: 'Immutability — TraceEvent / RunResult',
      description: 'Both are Java records: once an event is appended it can never be mutated, which is what makes "replay the trace" a safe, side-effect-free operation on the frontend.',
      alternative: 'Could use mutable DTOs updated in place, but that would make concurrent recording from multiple ForkJoinPool worker threads unsafe without extra locking.'
    }
  ],
  extensibility: [
    {
      area: 'Pluggable comparator',
      description: 'The sorter is hardcoded to int[] with natural ordering; a generic ParallelMergeSorter<T> taking a Comparator<T> would generalize it to arbitrary types.',
      difficulty: 'Medium'
    },
    {
      area: 'Adaptive threshold',
      description: 'sequentialThreshold is currently a fixed caller-supplied constant; it could instead be derived from parallelism and array size (e.g. size / (parallelism * 4)) so callers do not have to hand-tune it.',
      difficulty: 'Easy'
    },
    {
      area: 'In-place merge',
      description: 'Swapping the O(n) auxiliary-buffer merge for an in-place merge would trade code complexity for lower memory use, at the cost of losing the simple two-pointer merge\'s clarity.',
      difficulty: 'Hard'
    },
    {
      area: 'Streaming trace instead of batch',
      description: 'Replace the synchronous "wait for the whole run, return the trace" contract with Server-Sent Events so a much larger or slower run could be watched live instead of replayed after the fact.',
      difficulty: 'Hard'
    }
  ],
  tradeoffs: [
    'Built on ForkJoinPool + RecursiveAction with an explicit parallelism level instead of ForkJoinPool.commonPool(), trading a small amount of extra setup/shutdown code for run-to-run determinism regardless of the host machine\'s core count.',
    'sequentialThreshold stops the recursion from forking a new task per single-element range — trading a little manual tuning for avoiding fork/join bookkeeping dominating tiny subranges.',
    'The merge phase allocates one O(n) scratch buffer shared across the whole tree rather than doing an in-place merge, trading O(n) extra memory for a much simpler, easier-to-verify two-pointer merge.',
    'Runs are synchronous (the HTTP call blocks until the sort finishes) rather than streamed, so parameters are capped (size <= 5000, parallelism <= 16) to keep every run in the seconds range.',
    'Time complexity is O(n log n) regardless of parallelism (parallelism reduces wall-clock time, not comparison count); space is O(n) for the scratch buffer plus O(log n) stack depth for the recursion.'
  ],
  solid: [
    { principle: 'Single Responsibility', details: 'ParallelMergeSorter/SortTask = the sort itself; MergeSortService = run orchestration and validation; MergeSortController = HTTP boundary.' },
    { principle: 'Open/Closed', details: 'New event consumers (metrics, a different frontend) plug in via TraceRecorder without modifying SortTask.' }
  ]
};
