// classDiagrams — kvstore
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Key-Value Store — Class Diagram',
  classes: [
    {
      name: 'KvStoreService',
      stereotype: 'service',
      fields: ['- repository: KvStoreRepository', '- simulation: KvStoreSimulation'],
      methods: [
        '+ set(key, value, ttlSeconds): KvEntry',
        '+ get(key): KvEntry',
        '+ delete(key): void',
        '+ cas(key, expectedVersion, newValue): KvEntry',
      ],
    },
    {
      name: 'KvStoreSimulation',
      fields: ['- repository: KvStoreRepository // isolated', '- operation: ReentrantLock', '- eventLock: Object', '- events: List<SimEvent>', '- lastRace: Map'],
      methods: ['~ reset/set/get/replay/ttl/race: snapshot', '~ snapshot(): Map // detached records, counts and last race', '~ events(): List<SimEvent> // detached', '- stopAndJoin(executor): void // before releasing operation gate'],
    },
    {
      name: 'KvStoreRepository',
      stereotype: 'repository',
      fields: [
        '- store: ConcurrentHashMap<String, KvEntry>',
        '- wal: WriteAheadLog',
        '- lifecycle: ReentrantReadWriteLock',
      ],
      methods: [
        '+ set(key, value, ttlMillis): KvEntry',
        '+ get(key): KvEntry',
        '+ delete(key): void',
        '+ cas(key, expectedVersion, newValue): KvEntry  // per-key atomic compute; updates may block',
        '+ replayFromWal(): void',
        '+ snapshot(): Snapshot  // detached map and commands under exclusive gate',
        '+ reset(): void',
      ],
    },
    {
      name: 'KvEntry',
      fields: [
        '- value: String',
        '- version: long',
        '- expiresAtEpoch: Long',
      ],
      methods: [],
    },
    {
      name: 'WriteAheadLog',
      fields: ['- commands: List<Command>'],
      methods: [
        '+ append(command): void',
        '+ replay(state): void',
        '+ getCommands(): List<Command>',
      ],
    },
    {
      name: 'Command',
      stereotype: 'interface',
      fields: [],
      methods: ['+ apply(state: Map<String,KvEntry>): void'],
    },
    {
      name: 'SetCommand',
      fields: ['implements Command', '- key, value, expiresAtEpoch, version'],
      methods: ['+ apply(state): void  // state.put(key, exact entry this write produced)'],
    },
    {
      name: 'DeleteCommand',
      fields: ['implements Command', '- key: String'],
      methods: ['+ apply(state): void  // state.remove(key)'],
    },
    {
      name: 'KvReadTemplate<T>',
      stereotype: 'abstract',
      fields: [],
      methods: [
        '+ read(state, key): T  // template method',
        '# onMissing(key): T',
        '# onFound(entry): T',
      ],
    },
    {
      name: 'GetOperation',
      fields: ['extends KvReadTemplate<KvEntry>'],
      methods: ['# onMissing(key): KvEntry  // throws KeyNotFoundException'],
    },
    {
      name: 'PeekOperation',
      fields: ['extends KvReadTemplate<Optional<KvEntry>>'],
      methods: ['# onMissing(key): Optional<KvEntry>  // returns empty, never throws'],
    },
  ],
  relationships: [
    { from: 'KvStoreService', to: 'KvStoreRepository', label: 'reads/writes' },
    { from: 'KvStoreService', to: 'KvStoreSimulation', label: 'delegates sandbox operations' },
    { from: 'KvStoreSimulation', to: 'KvStoreRepository', label: 'owns isolated instance; real concurrent CAS workers' },
    { from: 'KvStoreRepository', to: 'KvEntry', label: 'stores' },
    { from: 'KvStoreRepository', to: 'WriteAheadLog', label: 'appends every successful write to' },
    { from: 'KvStoreRepository', to: 'GetOperation', label: 'delegates get() to' },
    { from: 'KvStoreRepository', to: 'PeekOperation', label: 'delegates peek() to' },
    { from: 'WriteAheadLog', to: 'Command', label: 'stores and replays' },
    { from: 'SetCommand', to: 'Command', label: 'implements', dashed: true },
    { from: 'DeleteCommand', to: 'Command', label: 'implements', dashed: true },
    { from: 'GetOperation', to: 'KvReadTemplate<T>', label: 'extends' },
    { from: 'PeekOperation', to: 'KvReadTemplate<T>', label: 'extends' },
    { from: 'Command', to: 'KvEntry', label: 'mutates' },
  ],
};
