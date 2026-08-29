// Sequence diagram content for fizz-buzz.
// Grounded directly in Multithreaded FizzBuzz (4 threads synchronized via Semaphores or ReentrantLock).
export default {
  title: 'FizzBuzz Multithreaded — 4-Thread Coordination & Barrier Signaling',
  description:
    'How 4 specialized threads (FizzThread, BuzzThread, FizzBuzzThread, NumberThread) coordinate across sequential numbers 1..N using synchronization barriers to produce the canonical interleaved output without race conditions.',
  flows: [
    {
      id: 'fizzbuzz-cycle-flow',
      label: 'Cyclic synchronization across 4 threads for numbers 1 to 5',
      description:
        'Controller cycles current number from 1 to 5. NumberThread prints 1 and 2, FizzThread awakens on 3 to print "fizz", NumberThread prints 4, and BuzzThread awakens on 5 to print "buzz".',
      participants: [
        { id: 'coord', name: 'Coordinator', kind: 'component', stereotype: 'controller' },
        { id: 'numTh', name: 'NumberThread', kind: 'component', stereotype: 'thread' },
        { id: 'fizzTh', name: 'FizzThread\n(div by 3)', kind: 'component', stereotype: 'thread' },
        { id: 'buzzTh', name: 'BuzzThread\n(div by 5)', kind: 'component', stereotype: 'thread' },
        { id: 'fizzBuzzTh', name: 'FizzBuzzThread\n(div by 15)', kind: 'component', stereotype: 'thread' },
      ],
      steps: [
        { from: 'coord', to: 'numTh', text: 'signal(num=1) — not divisible by 3 or 5', activate: 'numTh' },
        { from: 'numTh', to: 'coord', text: 'printNumber(1) ; notifyNext()', type: 'return', deactivate: 'numTh' },
        { from: 'coord', to: 'numTh', text: 'signal(num=2) — not divisible by 3 or 5', activate: 'numTh' },
        { from: 'numTh', to: 'coord', text: 'printNumber(2) ; notifyNext()', type: 'return', deactivate: 'numTh' },
        { from: 'coord', to: 'fizzTh', text: 'signal(num=3) — 3 % 3 == 0', activate: 'fizzTh' },
        { from: 'fizzTh', to: 'coord', text: 'printFizz("fizz") ; notifyNext()', type: 'return', deactivate: 'fizzTh' },
        { from: 'coord', to: 'numTh', text: 'signal(num=4) — not divisible by 3 or 5', activate: 'numTh' },
        { from: 'numTh', to: 'coord', text: 'printNumber(4) ; notifyNext()', type: 'return', deactivate: 'numTh' },
        { from: 'coord', to: 'buzzTh', text: 'signal(num=5) — 5 % 5 == 0', activate: 'buzzTh' },
        { from: 'buzzTh', to: 'coord', text: 'printBuzz("buzz") ; notifyNext()', type: 'return', deactivate: 'buzzTh' },
        { type: 'note', over: ['coord'], text: 'Sequence produced: [1, 2, "fizz", 4, "buzz"] without gaps or duplicates.' },
      ],
    },
  ],
};
