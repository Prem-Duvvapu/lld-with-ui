// Sequence diagram content for cachelibrary.
// Grounded directly in Shard#put and
// CacheLibraryConcurrencyTest#repeatedSingleShardCapacityRaceNeverExceedsCapacity: many workers
// concurrently PUT distinct keys into a single shard already at capacity. A class diagram shows
// Shard owns a lock and an EvictionPolicy; it does not show why the whole
// check-capacity/evict/insert sequence has to run under ONE lock acquisition, not two.
export default {
  title: 'Generic Cache Library — Concurrent Puts Racing a Full Shard',
  description:
    'A shard at capacity=5 already holds 5 entries. Two workers concurrently PUT distinct new keys. Shard#put holds its lock across the ENTIRE "is this a new key? are we at capacity? evict one if so, THEN insert" sequence. Whichever worker acquires the lock first sees the shard at capacity, asks its EvictionPolicy for a victim, evicts it, and inserts its own key -- one net eviction for one net insertion. The second worker blocks on the SAME lock, and only sees the post-eviction state once it gets in -- it correctly finds the shard back at exactly capacity-1 free slot... no: back at capacity again after the first insert, so IT must also evict once. A naive implementation that checked capacity and evicted in two SEPARATE locked steps would let both workers each observe "at capacity" before either evicted, overshooting by inserting 2 new entries for only 1 net eviction.',
  flows: [
    {
      id: 'concurrent-put-full-shard',
      label: 'Two workers PUT distinct keys into a shard already at capacity',
      description:
        'Shard capacity=5, currently holding {a,b,c,d,e}. Worker 1 puts "f", Worker 2 puts "g" -- both NEW keys, started together via a CountDownLatch (see CacheLibraryConcurrencyTest, 300 rounds). Correct behavior: shard ends at exactly 5 entries, with "f" and "g" both present and exactly two of the original five evicted.',
      participants: [
        { id: 'worker1', name: 'Worker 1\n(put "f")', kind: 'actor' },
        { id: 'worker2', name: 'Worker 2\n(put "g")', kind: 'actor' },
        { id: 'shard', name: 'Shard\n(capacity=5)', kind: 'component' },
        { id: 'lock', name: 'shard.lock\n(ReentrantLock)', kind: 'component', stereotype: 'lock' },
        { id: 'policy', name: 'EvictionPolicy\n(e.g. LRU)', kind: 'component' },
      ],
      steps: [
        { type: 'note', over: ['shard'], text: 'Shard already holds exactly 5 entries {a,b,c,d,e} -- at capacity.' },
        { from: 'worker1', to: 'shard', text: 'put("f", ...)' },
        { from: 'worker2', to: 'shard', text: 'put("g", ...)  — arrives ~simultaneously' },
        { from: 'shard', to: 'lock', text: '[Worker 1] lock.lock()  — acquired', activate: 'lock' },
        { from: 'shard', to: 'lock', text: '[Worker 2] lock.lock()  — BLOCKS, Worker 1 holds it' },
        { from: 'shard', to: 'shard', text: '[W1] isNewKey=true, entries.size()==5 >= capacity(5)' },
        { from: 'shard', to: 'policy', text: '[W1] evictionCandidate()' },
        { from: 'policy', to: 'shard', text: 'return "a"  (least-recently-used)', type: 'return' },
        { from: 'shard', to: 'shard', text: '[W1] entries.remove("a"); entries.put("f", ...)' },
        { from: 'shard', to: 'lock', text: '[W1] lock.unlock()', deactivate: 'lock' },
        { from: 'shard', to: 'worker1', text: 'return evictedKey="a"', type: 'return' },
        { from: 'lock', to: 'shard', text: '[Worker 2] lock() finally returns — W2 is now inside', activate: 'lock' },
        { type: 'note', over: ['shard'], text: 'This is the step a two-locked-steps design would get wrong: W2 must re-check size NOW (back at 5, after W1\'s insert), not the size it might have seen before blocking.' },
        { from: 'shard', to: 'shard', text: '[W2] isNewKey=true, entries.size()==5 >= capacity(5)  — evaluated fresh, under the SAME lock' },
        { from: 'shard', to: 'policy', text: '[W2] evictionCandidate()' },
        { from: 'policy', to: 'shard', text: 'return "b"  (now the least-recently-used)', type: 'return' },
        { from: 'shard', to: 'shard', text: '[W2] entries.remove("b"); entries.put("g", ...)' },
        { from: 'shard', to: 'lock', text: '[W2] lock.unlock()', deactivate: 'lock' },
        { from: 'shard', to: 'worker2', text: 'return evictedKey="b"', type: 'return' },
        { type: 'note', over: ['worker1', 'worker2'], text: 'Shard ends at exactly 5 entries {c,d,e,f,g} -- two evictions for two insertions, never overshooting. See CacheLibraryConcurrencyTest#repeatedSingleShardCapacityRaceNeverExceedsCapacity, run for 300 rounds.' },
      ],
    },
  ],
};
