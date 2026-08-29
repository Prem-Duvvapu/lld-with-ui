// Sequence diagram content for foo-bar.
// Grounded directly in FooBar concurrency primitive (two Semaphores: fooSem initialized to 1, barSem initialized to 0).
export default {
  title: 'Print FooBar Alternately — Dual Semaphore Handshake',
  description:
    'How two threads alternate printing "foo" and "bar" using two Semaphores with alternating permit releases to guarantee strict alternating execution without busy waiting.',
  flows: [
    {
      id: 'foobar-handshake',
      label: 'Strict alternating "foobar" execution via dual semaphores',
      description:
        'Thread A executes foo() and releases barSemaphore. Thread B acquires barSemaphore, prints "bar", and releases fooSemaphore, producing "foobar" repeatedly N times.',
      participants: [
        { id: 'threadA', name: 'Thread A\n(Foo Worker)', kind: 'actor' },
        { id: 'fooSem', name: 'fooSemaphore\n(Init: 1)', kind: 'lock', stereotype: 'Semaphore' },
        { id: 'threadB', name: 'Thread B\n(Bar Worker)', kind: 'actor' },
        { id: 'barSem', name: 'barSemaphore\n(Init: 0)', kind: 'lock', stereotype: 'Semaphore' },
      ],
      steps: [
        { from: 'threadA', to: 'fooSem', text: 'fooSem.acquire() — ACQUIRED (permits: 1→0)', activate: 'fooSem' },
        { from: 'threadB', to: 'barSem', text: 'barSem.acquire() — BLOCKS (permits: 0)' },
        { from: 'threadA', to: 'threadA', text: 'print("foo")' },
        { from: 'threadA', to: 'barSem', text: 'barSem.release() — releases permit to Thread B', activate: 'barSem' },
        { from: 'threadA', to: 'fooSem', text: 'fooSem idle', deactivate: 'fooSem' },
        { from: 'barSem', to: 'threadB', text: 'barSem.acquire() completes (unblocked)', deactivate: 'barSem' },
        { from: 'threadB', to: 'threadB', text: 'print("bar")' },
        { from: 'threadB', to: 'fooSem', text: 'fooSem.release() — releases permit back to Thread A' },
        { type: 'note', over: ['threadA', 'threadB'], text: 'One full "foobar" cycle completed.' },
      ],
    },
  ],
};
