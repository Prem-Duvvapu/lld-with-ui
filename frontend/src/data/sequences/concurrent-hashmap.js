// Sequence diagram content for concurrent-hashmap.
// Grounded directly in ConcurrentHashMapService#run / StripedHashMap — corrected after an
// earlier version invented a "StripedMap"/"StripedConcurrentHashMap" class and a bare
// two-thread put() demo. The real design is a single POST /run that runs two scripted
// phases against a from-scratch StripedHashMap (segment array of independent ReentrantLocks,
// not java.util.concurrent.ConcurrentHashMap): Phase A proves no lost updates under
// concurrent merge()-increment, Phase B proves exactly one thread's mapping function runs
// when many threads computeIfAbsent() the same key at once.
export default {
  title: 'Striped Hash Map — Conservation Under Concurrent Merge & Single-Winner computeIfAbsent',
  description:
    'How ConcurrentHashMapService#run drives a from-scratch StripedHashMap (an array of independent per-segment ReentrantLocks over plain HashMaps) through two scripted phases: many threads merge()-incrementing a handful of shared counter keys with zero lost updates, then several latch-released threads racing computeIfAbsent() on the same absent key with exactly one mapping-function invocation.',
  flows: [
    {
      id: 'striped-map-conservation-and-single-winner',
      label: 'POST /run — Phase A: no lost merge() updates; Phase B: computeIfAbsent() has exactly one winner',
      description:
        'A run request (segments=8, threads=6, incrementsPerThread=20, distinctKeys=4, computeRacers=6) first launches 6 "incrementer" threads that each call merge() 20 times across 4 shared counter keys — every merge() is serialized by that key\'s segment lock, so the sum of the final counters always equals threads*incrementsPerThread. It then launches 6 "racer" threads gated on one CountDownLatch, all released together to computeIfAbsent() the SAME absent key "shared-config" — the segment lock ensures only the first to acquire it invokes the mapping function; every other racer just observes the value already stored (ConcurrentHashMapServiceTest proves both invariants under real threads).',
      participants: [
        { id: 'client', name: 'Client', kind: 'actor' },
        { id: 'controller', name: 'ConcurrentHashMapController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'ConcurrentHashMapService', kind: 'component', stereotype: 'facade' },
        { id: 'inc1', name: 'Thread\n"incrementer-0"', kind: 'actor' },
        { id: 'inc2', name: 'Thread\n"incrementer-1"', kind: 'actor' },
        { id: 'counters', name: 'StripedHashMap<String,Long>\n(counters, 8 segments)', kind: 'component', stereotype: 'primitive' },
        { id: 'racer1', name: 'Thread\n"racer-0"', kind: 'actor' },
        { id: 'racer2', name: 'Thread\n"racer-1"', kind: 'actor' },
        { id: 'config', name: 'StripedHashMap<String,String>\n(config)', kind: 'component', stereotype: 'primitive' },
      ],
      steps: [
        { from: 'client', to: 'controller', text: 'POST /api/concurrency/concurrent-hashmap/run {segments:8, threads:6, incrementsPerThread:20, distinctKeys:4, computeRacers:6}' },
        { from: 'controller', to: 'service', text: 'run(request)', activate: 'service' },
        { type: 'note', over: ['service'], text: 'Phase A — conservation under concurrent merge()' },
        { from: 'service', to: 'inc1', text: 'start "incrementer-0" — loops i=0..19: merge("key-"+(i%4), 1L, Long::sum)' },
        { from: 'service', to: 'inc2', text: 'start "incrementer-1" — same loop, own thread' },
        { from: 'inc1', to: 'counters', text: 'merge("key-0", 1L, sum) — segmentFor("key-0") locks that segment only', activate: 'counters' },
        { from: 'counters', to: 'inc1', text: 'existing=null -> stores 1L; record MERGE_SUCCESS', type: 'return', deactivate: 'counters' },
        { from: 'inc2', to: 'counters', text: 'merge("key-2", 1L, sum) — different segment, proceeds without waiting on inc1', activate: 'counters', deactivate: 'counters' },
        { from: 'service', to: 'inc1', text: 'thread.join() for all 6 incrementer threads' },
        { from: 'service', to: 'counters', text: 'get("key-0")..get("key-3") — sum the 4 final counters', activate: 'counters', deactivate: 'counters' },
        { type: 'note', over: ['service'], text: 'sumOfFinalCounters == threads*incrementsPerThread (120) — no update was ever lost to interleaving.' },
        { type: 'note', over: ['service'], text: 'Phase B — exactly one computeIfAbsent() winner' },
        { from: 'service', to: 'racer1', text: 'start "racer-0" — awaits startGate' },
        { from: 'service', to: 'racer2', text: 'start "racer-1" — awaits startGate' },
        { from: 'service', to: 'service', text: 'startGate.countDown() — releases all 6 racers together for genuine contention' },
        { from: 'racer1', to: 'config', text: 'computeIfAbsent("shared-config", fn) — ACQUIRES the segment lock first', activate: 'config' },
        { from: 'config', to: 'config', text: 'containsKey=false -> invoke fn(); computeCount.incrementAndGet(); store "computed-value"' },
        { from: 'racer2', to: 'config', text: 'computeIfAbsent("shared-config", fn) — BLOCKS on the same segment lock' },
        { from: 'config', to: 'racer1', text: 'return "computed-value"', type: 'return', deactivate: 'config' },
        { from: 'config', to: 'racer2', text: 'lock acquired next: containsKey=true now -> fn NEVER invoked, returns existing "computed-value"', activate: 'config', deactivate: 'config' },
        { from: 'service', to: 'racer1', text: 'thread.join() for all 6 racer threads' },
        { type: 'note', over: ['service'], text: 'computeCount == 1 — exactly one racer ever ran the mapping function, no matter the interleaving.' },
        { from: 'service', to: 'controller', text: 'return RunResult {totalIncrements:120, sumOfFinalCounters:120, computeInvocationCount:1, orderedTrace[]}', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'client', text: '200 OK — full ordered trace for replay', type: 'return' },
      ],
    },
  ],
};
