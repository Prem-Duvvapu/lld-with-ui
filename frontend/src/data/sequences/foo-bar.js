// Sequence diagram content for foo-bar.
// Grounded directly in FooBarService#run / FooBarPrinter (two Semaphores: fooSemaphore
// initialized to 1, barSemaphore initialized to 0) — corrected after an earlier version
// omitted the real POST /run HTTP contract and controller/service layer entirely.
export default {
  title: 'Print FooBar Alternately — Dual Semaphore Handshake',
  description:
    'How FooBarService#run spins up two real threads (foo, bar) against one FooBarPrinter. fooSemaphore starts with 1 permit so the foo thread always goes first; each thread acquires its own semaphore, prints, then releases the OTHER thread\'s semaphore — a strict ping-pong that makes interleaving corruption structurally impossible.',
  flows: [
    {
      id: 'foobar-dual-semaphore-handshake',
      label: 'POST /run — foo and bar threads strictly alternate via two semaphores',
      description:
        'A run request (n=3) starts a foo thread and a bar thread against one FooBarPrinter. The bar thread blocks immediately on barSemaphore (0 permits) while the foo thread acquires fooSemaphore (1 permit), prints "foo", and releases barSemaphore — unblocking bar, which prints "bar" and releases fooSemaphore back, repeating n times to produce "foobarfoobarfoobar" (FooBarServiceTest proves the output never deviates from strict alternation under real thread scheduling).',
      participants: [
        { id: 'client', name: 'Client', kind: 'actor' },
        { id: 'controller', name: 'FooBarController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'FooBarService', kind: 'component', stereotype: 'facade' },
        { id: 'fooTh', name: '"foo-thread"', kind: 'actor' },
        { id: 'barTh', name: '"bar-thread"', kind: 'actor' },
        { id: 'printer', name: 'FooBarPrinter\n(fooSem=1, barSem=0)', kind: 'component', stereotype: 'primitive' },
      ],
      steps: [
        { from: 'client', to: 'controller', text: 'POST /api/concurrency/foo-bar/run {n:3}' },
        { from: 'controller', to: 'service', text: 'run(request)', activate: 'service' },
        { from: 'service', to: 'fooTh', text: 'start "foo-thread" -> printer.foo()' },
        { from: 'service', to: 'barTh', text: 'start "bar-thread" -> printer.bar()' },
        { from: 'barTh', to: 'printer', text: 'barSemaphore.acquire() — BLOCKS (0 permits)' },
        { from: 'fooTh', to: 'printer', text: 'fooSemaphore.acquire() — ACQUIRED (1→0 permits)', activate: 'printer' },
        { from: 'printer', to: 'printer', text: 'append("foo"); record FOO_PRINTED(i=1)' },
        { from: 'printer', to: 'barTh', text: 'barSemaphore.release() — unblocks bar-thread', deactivate: 'printer' },
        { from: 'barTh', to: 'printer', text: 'barSemaphore.acquire() completes; append("bar"); record BAR_PRINTED(i=1)', activate: 'printer' },
        { from: 'printer', to: 'fooTh', text: 'fooSemaphore.release() — unblocks foo-thread for repetition 2', deactivate: 'printer' },
        { type: 'note', over: ['fooTh', 'barTh'], text: 'Repeats 2 more times (n=3). At no point can bar-thread acquire before foo-thread has released exactly once for that repetition.' },
        { from: 'service', to: 'fooTh', text: 'thread.join() on both threads' },
        { from: 'service', to: 'controller', text: 'return RunResult {result: "foobarfoobarfoobar", orderedTrace[]}', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'client', text: '200 OK — full ordered trace for replay', type: 'return' },
      ],
    },
  ],
};
