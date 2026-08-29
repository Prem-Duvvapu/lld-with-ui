// Sequence diagram content for zero-even-odd.
// Grounded directly in ZeroEvenOdd concurrency primitive (3-thread Semaphore coordination for 010203... output).
export default {
  title: 'Print Zero Even Odd — 3-Thread Semaphore Coordination',
  description:
    'How 3 threads (ZeroThread, EvenThread, OddThread) coordinate using 3 Semaphores to produce the strict canonical sequence "0 1 0 2 0 3 0 4..." up to N.',
  flows: [
    {
      id: 'zero-even-odd-cycle',
      label: 'ZeroThread alternates with OddThread and EvenThread',
      description:
        'ZeroThread prints 0 and releases oddSemaphore. OddThread prints 1 and releases zeroSemaphore. ZeroThread prints 0 and releases evenSemaphore. EvenThread prints 2 and releases zeroSemaphore.',
      participants: [
        { id: 'zeroTh', name: 'ZeroThread', kind: 'actor' },
        { id: 'zeroSem', name: 'zeroSem\n(Init: 1)', kind: 'lock', stereotype: 'Semaphore' },
        { id: 'oddTh', name: 'OddThread', kind: 'actor' },
        { id: 'oddSem', name: 'oddSem\n(Init: 0)', kind: 'lock', stereotype: 'Semaphore' },
        { id: 'evenTh', name: 'EvenThread', kind: 'actor' },
        { id: 'evenSem', name: 'evenSem\n(Init: 0)', kind: 'lock', stereotype: 'Semaphore' },
      ],
      steps: [
        { from: 'zeroTh', to: 'zeroSem', text: 'zeroSem.acquire() — ACQUIRED (permits: 1→0)', activate: 'zeroSem' },
        { from: 'zeroTh', to: 'zeroTh', text: 'printNumber(0)' },
        { from: 'zeroTh', to: 'oddSem', text: 'oddSem.release() — release permit to OddThread', activate: 'oddSem' },
        { from: 'zeroTh', to: 'zeroSem', text: 'zeroSem idle', deactivate: 'zeroSem' },
        { from: 'oddSem', to: 'oddTh', text: 'oddSem.acquire() completes', deactivate: 'oddSem' },
        { from: 'oddTh', to: 'oddTh', text: 'printNumber(1)' },
        { from: 'oddTh', to: 'zeroSem', text: 'zeroSem.release() — release permit back to ZeroThread', activate: 'zeroSem' },
        { from: 'zeroSem', to: 'zeroTh', text: 'zeroSem.acquire() completes' },
        { from: 'zeroTh', to: 'zeroTh', text: 'printNumber(0)' },
        { from: 'zeroTh', to: 'evenSem', text: 'evenSem.release() — release permit to EvenThread', activate: 'evenSem' },
        { from: 'zeroTh', to: 'zeroSem', text: 'zeroSem idle', deactivate: 'zeroSem' },
        { from: 'evenSem', to: 'evenTh', text: 'evenSem.acquire() completes', deactivate: 'evenSem' },
        { from: 'evenTh', to: 'evenTh', text: 'printNumber(2)' },
        { from: 'evenTh', to: 'zeroSem', text: 'zeroSem.release() — release permit back to ZeroThread' },
        { type: 'note', over: ['zeroTh', 'oddTh', 'evenTh'], text: 'Sequence produced: "0 1 0 2" with zero interleaving violations.' },
      ],
    },
  ],
};
