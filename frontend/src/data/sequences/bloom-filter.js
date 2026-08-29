// Sequence diagram content for bloom-filter.
// Grounded directly in BloomFilter primitive (k Murmur3 hash functions + thread-safe BitSet).
export default {
  title: 'Bloom Filter — Multi-Hash Bit Allocation & Probabilistic Membership Test',
  description:
    'How BloomFilter performs constant-time element addition and probabilistic membership queries across independent hash functions and a bit array.',
  flows: [
    {
      id: 'bloom-filter-insert-and-query',
      label: 'Add element (set k bits) → Query membership (verify all k bits)',
      description:
        'Element "user@example.com" is added to BloomFilter. k=3 hash functions compute bit indices [14, 42, 89] and set them in the BitSet. A subsequent query verifies if all 3 bits are 1 to return true (might contain).',
      participants: [
        { id: 'client', name: 'Client Thread', kind: 'actor' },
        { id: 'controller', name: 'Concurrency\nController', kind: 'component', stereotype: 'controller' },
        { id: 'filter', name: 'BloomFilter\n(Primitive)', kind: 'component', stereotype: 'primitive' },
        { id: 'hash', name: 'HashEngine\n(k=3 Hashes)', kind: 'component' },
        { id: 'bitset', name: 'BitSet\n(Bit Array)', kind: 'store' },
      ],
      steps: [
        { from: 'client', to: 'controller', text: 'POST /api/concurrency/bloom-filter/run {action: "ADD", item: "user@example.com"}' },
        { from: 'controller', to: 'filter', text: 'add("user@example.com")', activate: 'filter' },
        { from: 'filter', to: 'hash', text: 'computeHashes("user@example.com")' },
        { from: 'hash', to: 'filter', text: 'indices = [14, 42, 89]', type: 'return' },
        { from: 'filter', to: 'bitset', text: 'bitSet.set(14) ; bitSet.set(42) ; bitSet.set(89)' },
        { from: 'filter', to: 'controller', text: 'AddResult {item: "user@example.com", bitIndices: [14, 42, 89]}', type: 'return', deactivate: 'filter' },
        { from: 'controller', to: 'client', text: '200 OK — 3 bits set in bit array', type: 'return' },
        { from: 'client', to: 'controller', text: 'POST /api/concurrency/bloom-filter/run {action: "CONTAINS", item: "user@example.com"}' },
        { from: 'controller', to: 'filter', text: 'mightContain("user@example.com")', activate: 'filter' },
        { from: 'filter', to: 'hash', text: 'computeHashes("user@example.com") → [14, 42, 89]' },
        { from: 'filter', to: 'bitset', text: 'bitSet.get(14) && bitSet.get(42) && bitSet.get(89)' },
        { from: 'bitset', to: 'filter', text: 'All 3 bits are 1 (TRUE)', type: 'return' },
        { from: 'filter', to: 'controller', text: 'return true (MIGHT_CONTAIN)', type: 'return', deactivate: 'filter' },
        { from: 'controller', to: 'client', text: '200 OK — Element probably in set (0 false negatives)', type: 'return' },
      ],
    },
  ],
};
