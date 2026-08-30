// Sequence diagram content for bloom-filter.
// Grounded directly in BloomFilterService#run / BloomFilter (double hashing over BitSet) —
// corrected after an earlier version invented a per-call ADD/CONTAINS HTTP action and a
// separate "HashEngine" class. The real endpoint is a single POST /run that spins up several
// adder Threads concurrently against one BloomFilter, joins them, then deterministically
// hunts a false positive and queries every item on the calling thread — there is no HashEngine;
// h1/h2/position are private methods on BloomFilter itself, combined via Kirsch–Mitzenmacher
// double hashing (String#hashCode + a from-scratch FNV-1a), not k independent hash functions.
export default {
  title: 'Bloom Filter — Concurrent Adds via Double Hashing & Deterministic False-Positive Hunt',
  description:
    'How BloomFilterService#run spins up real adder threads that race to set bits on one shared BitSet under a single ReentrantLock, then — once every thread has joined — deterministically probes for a genuine false positive and queries every added item and every true-negative candidate, returning the complete ordered trace for the frontend to replay.',
  flows: [
    {
      id: 'bloom-filter-concurrent-add-and-query',
      label: 'POST /run — 4 adder threads race to set bits → false-positive hunt → query every item',
      description:
        'A run request (bitSize=28, hashCount=3, addThreads=4) splits the fixed 10-item batch round-robin across 4 threads. Each thread calls BloomFilter#add, which computes h1/h2 once and derives hashCount bit positions by double hashing, setting each under the filter\'s single lock — the lock is what keeps the shared BitSet from corrupting as threads race. After every thread joins, the service probes "probe-0".."probe-999" in order on the calling thread for the first genuine false positive, then queries every batch item (always true, never a false negative) and every true-negative candidate (BloomFilterServiceTest proves zero false negatives and a bounded false-positive rate).',
      participants: [
        { id: 'client', name: 'Client', kind: 'actor' },
        { id: 'controller', name: 'BloomFilterController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'BloomFilterService', kind: 'component', stereotype: 'facade' },
        { id: 'adder1', name: 'Thread\n"adder-1"', kind: 'actor' },
        { id: 'adder2', name: 'Thread\n"adder-2"', kind: 'actor' },
        { id: 'filter', name: 'BloomFilter\n(BitSet + lock)', kind: 'component', stereotype: 'primitive' },
      ],
      steps: [
        { from: 'client', to: 'controller', text: 'POST /api/concurrency/bloom-filter/run {bitSize:28, hashCount:3, addThreads:4}' },
        { from: 'controller', to: 'service', text: 'run(request)', activate: 'service' },
        { from: 'service', to: 'service', text: 'validate params; split 10-item ITEM_BATCH round-robin across 4 threads; new BloomFilter(28, 3, recorder)' },
        { from: 'service', to: 'adder1', text: 'start "adder-1" — assigned {"apple","elderberry","kiwi"}' },
        { from: 'service', to: 'adder2', text: 'start "adder-2" — assigned {"banana","fig","lemon"}' },
        { from: 'adder1', to: 'filter', text: 'add("apple") — lock.lock()', activate: 'filter' },
        { from: 'filter', to: 'filter', text: 'h1=hashCode("apple"), h2=FNV1a("apple"); for i in 0..2: pos=floorMod(h1+i*h2, 28); bits.set(pos); record BIT_NEWLY_SET/BIT_ALREADY_SET' },
        { from: 'filter', to: 'adder1', text: 'lock.unlock() — add() returns', type: 'return', deactivate: 'filter' },
        { from: 'adder2', to: 'filter', text: 'add("banana") — BLOCKS on lock.lock() until adder-1 releases, then proceeds identically', activate: 'filter', deactivate: 'filter' },
        { type: 'note', over: ['adder1', 'adder2'], text: 'Every add() is fully serialized by the filter\'s single ReentrantLock — the BitSet is never observed mid-mutation, so the recorded bits-set-count is always exactly what that thread just did.' },
        { from: 'service', to: 'adder1', text: 'thread.join() — waits for all 4 threads to finish' },
        { from: 'service', to: 'adder2', text: 'thread.join()' },
        { from: 'service', to: 'filter', text: 'for probe in "probe-0".."probe-999": mightContain(probe) — stop at first true', activate: 'filter' },
        { from: 'filter', to: 'service', text: 'return e.g. "probe-217" as the deterministic false positive (or none found)', type: 'return', deactivate: 'filter' },
        { from: 'service', to: 'filter', text: 'mightContain(item) for all 10 ITEM_BATCH items — every one true (zero false negatives)', activate: 'filter', deactivate: 'filter' },
        { from: 'service', to: 'filter', text: 'mightContain(candidate) for each TRUE_NEGATIVE_CANDIDATE ("zephyr", "quokka", ...)', activate: 'filter', deactivate: 'filter' },
        { from: 'service', to: 'controller', text: 'return RunResult {bitsSetCount, falsePositiveFound, queries[], orderedTrace[]}', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'client', text: '200 OK — full ordered trace for replay', type: 'return' },
      ],
    },
  ],
};
