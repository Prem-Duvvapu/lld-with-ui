// Sequence diagram content for fizz-buzz.
// Grounded directly in FizzBuzzService#run / FizzBuzzPrinter — corrected after an earlier
// version invented a "Coordinator" component pushing signal(num) to threads over
// Semaphores. The real primitive is ONE ReentrantLock + ONE Condition shared by all four
// threads guarding a single counter: each thread loops acquiring the lock, awaiting on the
// condition while the counter doesn't match its own mutually-exclusive predicate, then
// prints, advances the counter, and signalAll()s every other thread to re-check.
export default {
  title: 'Multithreaded FizzBuzz — Shared Lock + Condition, Mutually Exclusive Predicates',
  description:
    'How FizzBuzzService#run spins up four named threads ("number-thread", "fizz-thread", "buzz-thread", "fizzbuzz-thread") against one FizzBuzzPrinter. All four share a single ReentrantLock and Condition guarding one counter; each thread awaits while the counter does not match its own predicate (divisible-by-15, by-3-only, by-5-only, or neither), then prints, advances the counter, and signalAll()s so the others re-check — the four predicates are mutually exclusive and exhaustive, so exactly one thread ever matches a given counter value.',
  flows: [
    {
      id: 'fizzbuzz-shared-lock-condition',
      label: 'POST /run — four threads await/signal on one shared Condition to interleave 1..n correctly',
      description:
        'A run request (n=5) starts all four threads immediately; each blocks on the shared Condition until the counter matches its predicate. counter=1 and 2 only match "number"; 3 matches "fizz" (div by 3, not 5); 4 matches "number" again; 5 matches "buzz" (div by 5, not 3) — producing "1 2 Fizz 4 Buzz" (FizzBuzzServiceTest asserts the canonical output for n up to 30 with no duplicates or gaps).',
      participants: [
        { id: 'client', name: 'Client', kind: 'actor' },
        { id: 'controller', name: 'FizzBuzzController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'FizzBuzzService', kind: 'component', stereotype: 'facade' },
        { id: 'numTh', name: '"number-thread"', kind: 'actor' },
        { id: 'fizzTh', name: '"fizz-thread"', kind: 'actor' },
        { id: 'buzzTh', name: '"buzz-thread"', kind: 'actor' },
        { id: 'printer', name: 'FizzBuzzPrinter\n(lock + condition, counter=1)', kind: 'component', stereotype: 'primitive' },
      ],
      steps: [
        { from: 'client', to: 'controller', text: 'POST /api/concurrency/fizz-buzz/run {n:5}' },
        { from: 'controller', to: 'service', text: 'run(request)', activate: 'service' },
        { from: 'service', to: 'numTh', text: 'start "number-thread" -> printer.number()' },
        { from: 'service', to: 'fizzTh', text: 'start "fizz-thread" -> printer.fizz()' },
        { from: 'service', to: 'buzzTh', text: 'start "buzz-thread" -> printer.buzz() (fizzbuzz-thread also started, not pictured)' },
        { from: 'numTh', to: 'printer', text: 'lock.lock() — counter=1 matches number\'s predicate (not div 3 or 5)', activate: 'printer' },
        { from: 'printer', to: 'printer', text: 'print "1"; counter=2; condition.signalAll()' },
        { from: 'printer', to: 'numTh', text: 'lock.unlock() — number() loops, re-acquires', deactivate: 'printer' },
        { from: 'fizzTh', to: 'printer', text: 'lock.lock() — counter=2 does NOT match fizz\'s predicate -> condition.await() (releases lock)', activate: 'printer', deactivate: 'printer' },
        { from: 'numTh', to: 'printer', text: 'lock.lock() — counter=2 matches number again', activate: 'printer' },
        { from: 'printer', to: 'printer', text: 'print "2"; counter=3; condition.signalAll() — wakes every waiter to re-check' },
        { from: 'printer', to: 'numTh', text: 'lock.unlock()', deactivate: 'printer' },
        { from: 'fizzTh', to: 'printer', text: 'wakes, re-acquires lock — counter=3 now matches fizz (div 3, not 5)', activate: 'printer' },
        { from: 'printer', to: 'printer', text: 'print "Fizz"; counter=4; condition.signalAll()' },
        { from: 'printer', to: 'fizzTh', text: 'lock.unlock()', deactivate: 'printer' },
        { type: 'note', over: ['numTh', 'fizzTh', 'buzzTh'], text: 'number-thread prints "4" next (counter=4), then buzz-thread wakes for counter=5 -> "Buzz". Final: "1 2 Fizz 4 Buzz".' },
        { from: 'service', to: 'numTh', text: 'thread.join() on all four threads' },
        { from: 'service', to: 'controller', text: 'return RunResult {result: "1 2 Fizz 4 Buzz", orderedTrace[]}', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'client', text: '200 OK — full ordered trace for replay', type: 'return' },
      ],
    },
  ],
};
