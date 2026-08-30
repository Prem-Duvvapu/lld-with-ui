// Sequence diagram content for zero-even-odd.
// Grounded directly in ZeroEvenOddService#run / ZeroEvenOddPrinter (3 Semaphores:
// zeroSemaphore init 1, oddSemaphore and evenSemaphore both init 0) — corrected after an
// earlier version omitted the real POST /run HTTP contract and controller/service layer.
export default {
  title: 'Print Zero Even Odd — Three-Semaphore Coordination',
  description:
    'How ZeroEvenOddService#run spins up three named threads ("zero-thread", "odd-thread", "even-thread") against one ZeroEvenOddPrinter. zeroSemaphore starts with 1 permit so zero always goes first for every number; zero() releases oddSemaphore or evenSemaphore depending on the parity of the NEXT number, and both odd()/even() release zeroSemaphore back after printing — producing the exact interleave "0 1 0 2 0 3 0 4..." up to n.',
  flows: [
    {
      id: 'zero-even-odd-three-semaphore',
      label: 'POST /run — zero-thread gates odd-thread and even-thread via two more semaphores',
      description:
        'A run request (n=4) starts all three threads. zero-thread acquires zeroSemaphore, prints "0", and releases oddSemaphore (since 1 is odd) — unblocking odd-thread to print "1" and release zeroSemaphore back. zero-thread loops, prints "0" again, and this time releases evenSemaphore (since 2 is even) — unblocking even-thread. The cycle repeats until n, producing "0 1 0 2 0 3 0 4" (ZeroEvenOddServiceTest asserts the canonical interleave with no gaps or duplicates for n up to 50).',
      participants: [
        { id: 'client', name: 'Client', kind: 'actor' },
        { id: 'controller', name: 'ZeroEvenOddController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'ZeroEvenOddService', kind: 'component', stereotype: 'facade' },
        { id: 'zeroTh', name: '"zero-thread"', kind: 'actor' },
        { id: 'oddTh', name: '"odd-thread"', kind: 'actor' },
        { id: 'evenTh', name: '"even-thread"', kind: 'actor' },
        { id: 'printer', name: 'ZeroEvenOddPrinter\n(zeroSem=1, oddSem=0, evenSem=0)', kind: 'component', stereotype: 'primitive' },
      ],
      steps: [
        { from: 'client', to: 'controller', text: 'POST /api/concurrency/zero-even-odd/run {n:4}' },
        { from: 'controller', to: 'service', text: 'run(request)', activate: 'service' },
        { from: 'service', to: 'zeroTh', text: 'start "zero-thread" -> printer.zero()' },
        { from: 'service', to: 'oddTh', text: 'start "odd-thread" -> printer.odd() — blocks on oddSemaphore (0 permits)' },
        { from: 'service', to: 'evenTh', text: 'start "even-thread" -> printer.even() — blocks on evenSemaphore (0 permits)' },
        { from: 'zeroTh', to: 'printer', text: 'zeroSemaphore.acquire() (1→0); print "0"', activate: 'printer' },
        { from: 'printer', to: 'oddTh', text: 'next=1 is odd -> oddSemaphore.release() — unblocks odd-thread', deactivate: 'printer' },
        { from: 'oddTh', to: 'printer', text: 'oddSemaphore.acquire() completes; print "1"', activate: 'printer' },
        { from: 'printer', to: 'zeroTh', text: 'zeroSemaphore.release() — unblocks zero-thread for the next number', deactivate: 'printer' },
        { from: 'zeroTh', to: 'printer', text: 'zeroSemaphore.acquire() completes; print "0"', activate: 'printer' },
        { from: 'printer', to: 'evenTh', text: 'next=2 is even -> evenSemaphore.release() — unblocks even-thread', deactivate: 'printer' },
        { from: 'evenTh', to: 'printer', text: 'evenSemaphore.acquire() completes; print "2"; zeroSemaphore.release()', activate: 'printer', deactivate: 'printer' },
        { type: 'note', over: ['zeroTh', 'oddTh', 'evenTh'], text: 'Repeats for 3 and 4. Final assembled output: "0 1 0 2 0 3 0 4".' },
        { from: 'service', to: 'zeroTh', text: 'thread.join() on all three threads' },
        { from: 'service', to: 'controller', text: 'return RunResult {result: "0 1 0 2 0 3 0 4", orderedTrace[]}', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'client', text: '200 OK — full ordered trace for replay', type: 'return' },
      ],
    },
  ],
};
