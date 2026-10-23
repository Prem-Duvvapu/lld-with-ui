// designDetails — kvstore
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Key-Value Store — Design Details',
  requirements: [
    'A toy Redis-shaped KV store: SET/GET/DELETE, optimistic-concurrency CAS (compare-and-swap), TTL expiry, and an in-memory write-ahead log (WAL) replayed on demand to demonstrate state reconstruction, not disk durability.',
    'Explicitly differentiated from cachelibrary (shipped just before this module): no capacity limit, no eviction policy at all — every key lives until explicitly deleted or TTL-expired. This module leans entirely into versioning and CAS semantics instead.',
    'Command Pattern applied to in-memory replay, not undo/redo: successful writes append commands to the WriteAheadLog, whose recorded order reconstructs state. Process restart loses both the map and this in-memory log.',
    'Template Method for the two read-only query paths (a throwing GET and a non-throwing peek used by the sim snapshot) — deliberately NOT used for CAS, whose expiry-and-version check must happen atomically inside one ConcurrentHashMap#compute call, not as a separate template-driven pre-read.',
    'The centerpiece: version validation, log append and replacement share one per-key atomic ConcurrentHashMap#compute operation. Contending updates may block. A shared lifecycle gate lets independent keys proceed; replay, reset and coherent snapshots take its exclusive side.',
    'Isolated Concurrency Simulation: an isolated /api/kvstore/sim/* sandbox (a second KvStoreRepository instance) with an in-memory WAL replay demo, a real TTL expiry wait, and a live multi-worker CAS race.',
  ],
  entities: [
    {
      name: 'KvStoreRepository',
      description: 'Owns the map, command log and lifecycle lock. SET, CAS and DELETE append inside compute before publishing the mapping. Replay, reset and snapshots exclude key operations using the exclusive lifecycle gate.',
      fields: [
        { name: 'store', type: 'ConcurrentHashMap<String, KvEntry>', description: 'Live key-value state' },
        { name: 'wal', type: 'WriteAheadLog', description: 'Append-only log of every successful write' },
        { name: 'lifecycle', type: 'ReentrantReadWriteLock', description: 'Shared for key operations; exclusive for replay, reset and snapshots' },
      ],
      methods: [
        { name: 'cas(key, expectedVersion, newValue)', returns: 'KvEntry', description: 'The concurrency centerpiece — see Concurrency below' },
      ],
    },
    {
      name: 'KvEntry',
      description: 'value, version (starts at 1, +1 on every successful write), expiresAtEpoch (null = no TTL).',
      fields: [],
      methods: [],
    },
    {
      name: 'Command / SetCommand / DeleteCommand',
      description: 'SetCommand carries the exact version and expiry a write produced. Replay applies commands in recorded order: a later SET or DELETE supersedes an earlier command for the same key. Versions restart at 1 after DELETE, so sorting commands by version would be incorrect.',
      fields: [],
      methods: [
        { name: 'apply(state)', returns: 'void', description: 'Mutates a raw Map<String,KvEntry> directly, bypassing KvStoreService\'s validation entirely — WAL replay is a low-level operation, not a user request' },
      ],
    },
    {
      name: 'KvReadTemplate<T> / GetOperation / PeekOperation',
      description: 'Template Method: identical "look up a key, decide if it\'s live" flow, varying only in what happens on a miss. Both are pure queries — neither ever mutates the store, even for an expired entry.',
      fields: [],
      methods: [],
    },
  ],
  designPatterns: [
    {
      name: 'Command (applied to in-memory replay, not undo/redo)',
      used: true,
      explanation: 'Each logged write is a replayable Command. Replaying the recorded sequence against an empty map reconstructs state. This demonstrates the operation-as-object pattern, not crash durability: the log is in memory and disappears on process restart.',
    },
    {
      name: 'Template Method',
      used: true,
      explanation: 'KvReadTemplate#read is the template: look up the key, then delegate to onMissing/onFound. GetOperation and PeekOperation are the two concrete variations. CAS deliberately does NOT go through this template — its expiry-and-version check must be atomic with the compute() call itself, and a separate template-driven pre-read would reintroduce the exact check-then-act race this module exists to close.',
    },
  ],
  principles: [
    { name: 'Single Responsibility Principle (SRP)', description: 'WriteAheadLog only appends/replays; Command implementations only know how to mutate raw state; KvReadTemplate subclasses only decide success/failure shape; KvStoreRepository owns the actual atomic operations.' },
    { name: 'Open/Closed Principle (OCP)', description: 'A third Command (e.g. an ExpireCommand for explicit TTL-driven removals logged separately from user DELETEs) is one new Command implementation — WriteAheadLog#replay never changes.' },
    { name: 'Liskov Substitution Principle (LSP)', description: 'Every Command honors the same apply(state) contract; WriteAheadLog#replay never needs to know which concrete command it\'s replaying. Every KvReadTemplate subclass honors the same read(state,key) contract.' },
  ],
  oopConcepts: [
    { name: 'Encapsulation', description: 'The raw ConcurrentHashMap is private to KvStoreRepository; every external caller goes through set/get/delete/cas, never the map directly.' },
    { name: 'Polymorphism', description: 'WriteAheadLog#replay calls command.apply(state) without knowing whether it holds a SetCommand or a DeleteCommand.' },
    { name: 'Replacement on Write', description: 'Repository writes build replacement KvEntry objects rather than updating the current entry in place. KvEntry itself is mutable because Lombok @Data generates setters; replacement discipline is not a type-enforced immutability guarantee.' },
  ],
  extensibility: [
    { area: 'Range/prefix scans', description: 'Today the store only supports single-key operations; a keys-with-prefix query would need either a sorted structure (ConcurrentSkipListMap) instead of ConcurrentHashMap, or a secondary index — a genuinely different data-structure trade-off, not a drop-in addition.', difficulty: 'Medium' },
    { area: 'WAL compaction', description: 'The in-memory WAL retains superseded writes. A production persistence design would need durable storage, ordering, recovery and compaction guarantees beyond this replay demonstration.', difficulty: 'Medium' },
    { area: 'Multi-key transactions', description: 'CAS is deliberately single-key. Multi-key atomicity needs an additional coordination design, such as ordered locks or versioned transaction validation; ConcurrentHashMap.compute does not supply it.', difficulty: 'Hard' },
  ],
  tradeoffs: [
    'CAS uses a per-key atomic ConcurrentHashMap#compute operation, not an explicit AtomicReference retry loop. Contending updates may block inside the map or at the lifecycle gate. Independent keys can proceed concurrently; replay, reset and full snapshots briefly exclude all key operations.',
    'GET, peek and rejected CAS leave expired mappings untouched. SET replaces a mapping and DELETE removes it. Reads enforce the original absolute expiry, including after replay; there is no background eviction or renewed TTL during reconstruction.',
    'Each successful write appends its command inside compute before publishing its replacement or removal. The lifecycle gate prevents replay/reset from splitting this operation. Snapshot entries and command lists come from one committed point; returned mutable entries are detached copies. The log is in memory, so these guarantees do not provide disk durability.',
  ],
  summary: 'A toy Redis-shaped store with per-key atomic compare-and-swap: version validation and replacement occur in one ConcurrentHashMap#compute operation, whose internal coordination may block contending updates. Logged commands demonstrate in-memory replay, not persistence across a process restart. KvReadTemplate governs throwing GET and non-throwing peek; it stays separate from the atomic write-path check. Repository writes replace values, but the KvEntry model remains mutable.',
  highlights: [
    'The CAS race is tested directly: 10 threads contend with the same expectedVersion across 300 rounds, asserting one winner and one version bump. This establishes the tested atomicity invariant, not a lock-free progress guarantee.',
    'A second, harder concurrency test proves CAS composes correctly across successive "waves": 5 sequential waves of 6 racing threads each, asserting the version climbs by exactly 1 per wave across 200 rounds — proving the winner of one wave genuinely becomes the new baseline every loser in the NEXT wave must beat, not just that any single race in isolation works.',
    'Latch-controlled tests pause SET, CAS and DELETE at append and race subsequent writes, replay, reset and snapshot reads. They verify command order, detached responses, original TTL, failure recovery and independent-key concurrency. Neither map nor log survives a process restart.',
  ],
};
