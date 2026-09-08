// designDetails — kvstore
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Key-Value Store — Design Details',
  requirements: [
    'A toy Redis-shaped KV store: SET/GET/DELETE, optimistic-concurrency CAS (compare-and-swap), TTL expiry, and a write-ahead log (WAL) replayed on demand to demonstrate durability.',
    'Explicitly differentiated from cachelibrary (shipped just before this module): no capacity limit, no eviction policy at all — every key lives until explicitly deleted or TTL-expired. This module leans entirely into versioning and CAS semantics instead.',
    'Command Pattern applied to durability/replay, not the more familiar undo/redo use: every successful write (SET or a winning CAS) appends one Command to the WriteAheadLog; replaying the whole log against an empty map rebuilds identical state from nothing.',
    'Template Method for the two read-only query paths (a throwing GET and a non-throwing peek used by the sim snapshot) — deliberately NOT used for CAS, whose expiry-and-version check must happen atomically inside one ConcurrentHashMap#compute call, not as a separate template-driven pre-read.',
    'The centerpiece: CAS is a genuine, fully LOCK-FREE compare-and-swap — a deliberate, explicit departure from every other module in this repo, all of which close their races with a per-entity ReentrantLock.',
    'Isolated Concurrency Simulation: an isolated /api/kvstore/sim/* sandbox (a second KvStoreRepository instance) with a WAL-replay durability demo, a real TTL expiry wait, and a live multi-worker CAS race.',
  ],
  entities: [
    {
      name: 'KvStoreRepository',
      description: 'The store itself, plus its WriteAheadLog. Every write path (set, delete, cas) is built directly on ConcurrentHashMap\'s own atomic methods — no ReentrantLock anywhere in this module.',
      fields: [
        { name: 'store', type: 'ConcurrentHashMap<String, KvEntry>', description: 'Live key-value state' },
        { name: 'wal', type: 'WriteAheadLog', description: 'Append-only log of every successful write' },
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
      description: 'SetCommand carries the EXACT version and expiry a write produced when first applied, rather than recomputing them at replay time — replay is then a pure "set state to exactly this," with no dependency on command order or what else has already been replayed.',
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
      name: 'Command (applied to durability, not undo/redo)',
      used: true,
      explanation: 'The textbook Command pattern usually backs an undo stack. Here it backs a Write-Ahead Log instead: every successful write becomes a replayable Command, and replaying the whole log from an empty map reconstructs identical state — the same GoF pattern, a genuinely different purpose (durability, not reversal).',
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
    { name: 'Immutable Value Objects', description: 'A KvEntry is never mutated in place — every write (set, cas, or a replayed Command) produces a brand-new KvEntry via the builder, which is exactly what makes it safe to hand a reference out of a ConcurrentHashMap#compute lambda without external synchronization.' },
  ],
  extensibility: [
    { area: 'Range/prefix scans', description: 'Today the store only supports single-key operations; a keys-with-prefix query would need either a sorted structure (ConcurrentSkipListMap) instead of ConcurrentHashMap, or a secondary index — a genuinely different data-structure trade-off, not a drop-in addition.', difficulty: 'Medium' },
    { area: 'WAL compaction', description: 'The WAL never shrinks — replaying 3 SETs to the same key replays all 3, even though only the last matters for final state. A real system would periodically snapshot state and truncate the log; this module keeps the WAL a simple, always-append list for the demo\'s durability story.', difficulty: 'Medium' },
    { area: 'Multi-key transactions', description: 'CAS is deliberately single-key — a multi-key atomic transaction would need either a global lock (defeating this module\'s whole lock-free premise) or a proper MVCC/2PC scheme, well beyond this module\'s toy scope.', difficulty: 'Hard' },
  ],
  tradeoffs: [
    'CAS is lock-free via ConcurrentHashMap#compute rather than an explicit AtomicReference retry loop — compute()\'s remapping function already runs atomically with respect to every other operation on that key (internally synchronized per-bin), which is both simpler and just as genuinely lock-free from this module\'s own code\'s perspective: nowhere does KvStoreRepository create or acquire a ReentrantLock.',
    'A GET (or peek) on an expired key never itself evicts the stale entry — eviction happens lazily, only as a side effect of the next SET/CAS\'s compute() call on that same key (or a WAL replay). This keeps KvReadTemplate a pure, side-effect-free query, at the cost of a truly abandoned expired key lingering in the map until something else touches it.',
    'SetCommand stores the version and expiry a write already computed, rather than recomputing them during replay — this makes replay trivially correct (no risk of replay producing a different version sequence than the original writes did), at the cost of the WAL carrying slightly more per-entry data than the bare "SET key value" a minimal WAL would need.',
  ],
  summary: 'A toy Redis-shaped store whose centerpiece is a genuinely lock-free compare-and-swap: KvStoreRepository#cas drives its version check and its update through one ConcurrentHashMap#compute call, so no other thread can observe or mutate a key between the check and the write — a deliberate, explicit departure from every other module in this repo, which all close their races with a per-entity ReentrantLock. Every successful write also appends a replayable Command to a Write-Ahead Log; replaying that log against an empty map reconstructs identical state, proving durability without any real disk persistence. A shared Template Method governs the store\'s two read-only query paths (throwing GET, non-throwing peek), deliberately kept separate from CAS\'s own atomic expiry-and-version check inside compute().',
  highlights: [
    'The CAS race proven directly, lock-free: a 300-round repeated test has 10 threads race CAS against the same key with the identical expectedVersion, asserting exactly one winner and exactly one version bump every round — never a lost update, never a double-increment.',
    'A second, harder concurrency test proves CAS composes correctly across successive "waves": 5 sequential waves of 6 racing threads each, asserting the version climbs by exactly 1 per wave across 200 rounds — proving the winner of one wave genuinely becomes the new baseline every loser in the NEXT wave must beat, not just that any single race in isolation works.',
    'Durability actually demonstrated, not just claimed: the sim WAL-replay step wipes live sandbox state entirely and rebuilds it purely from the (untouched) WriteAheadLog, and KvStoreRepositoryTest asserts the replayed state\'s value AND version exactly match what existed before the wipe.',
  ],
};
