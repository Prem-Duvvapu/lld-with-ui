// Sequence diagram content for kvstore.
// Grounded directly in KvStoreRepository#cas and
// KvStoreConcurrencyTest#repeatedCasRaceProducesExactlyOneWinnerPerVersionBump: N threads racing
// CAS against the same key with the identical expectedVersion. A class diagram shows
// KvStoreRepository owns a ConcurrentHashMap; it does not show why the version check and the
// log append have to happen inside the SAME compute() call. The lifecycle gate also
// excludes replay/reset while any key operation is in progress.
export default {
  title: 'Key-Value Store — Atomic CAS and Ordered In-Memory Replay',
  description:
    'CAS workers share the lifecycle gate, then contend inside ConcurrentHashMap.compute for the same key. The winner checks the version and appends its command before publishing the replacement. A later contender sees the updated version and throws a typed conflict without appending. Replay and reset take the exclusive lifecycle gate; they wait until active key operations finish. Contending calls may block, and the log remains in memory.',
  flows: [
    {
      id: 'atomic-cas-race',
      label: 'Two threads racing CAS on the same key with the same expectedVersion',
      description:
        'Key "contended-key" starts at version 1. Thread A and Thread B both call cas("contended-key", 1, ...) at the same instant, started together via a CountDownLatch (see KvStoreConcurrencyTest, run for 300 rounds). Exactly one succeeds and bumps the version to 2; the other cleanly receives a VersionConflictException.',
      participants: [
        { id: 'threadA', name: 'Thread A\ncas(key, v=1, "A")', kind: 'actor' },
        { id: 'threadB', name: 'Thread B\ncas(key, v=1, "B")', kind: 'actor' },
        { id: 'repository', name: 'KvStoreRepository', kind: 'component' },
        { id: 'gate', name: 'Lifecycle gate\nReentrantReadWriteLock', kind: 'component' },
        { id: 'map', name: 'ConcurrentHashMap\n(internal per-bin sync)', kind: 'component' },
        { id: 'wal', name: 'WriteAheadLog', kind: 'component' },
      ],
      steps: [
        { type: 'note', over: ['map'], text: '"contended-key" currently holds KvEntry(value="seed", version=1).' },
        { from: 'threadA', to: 'repository', text: 'cas("contended-key", expectedVersion=1, "A")' },
        { from: 'threadB', to: 'repository', text: 'cas("contended-key", expectedVersion=1, "B")  — arrives ~simultaneously' },
        { from: 'repository', to: 'gate', text: '[A and B] readLock.lock() — both can acquire the shared gate' },
        { from: 'repository', to: 'map', text: '[A] compute("contended-key", remappingFn)  — CHM serializes this key\'s bin, A wins entry', activate: 'map' },
        { from: 'repository', to: 'map', text: '[B] compute("contended-key", remappingFn) — waits for A on the same bin' },
        { from: 'map', to: 'repository', text: '[A] remappingFn sees version==1 == expectedVersion(1) -> builds KvEntry(value="A", version=2)' },
        { from: 'repository', to: 'wal', text: '[A] append(SetCommand(key, "A", null, 2)) INSIDE compute' },
        { from: 'map', to: 'map', text: '[A] return replacement — map publishes KvEntry(value="A", version=2)', deactivate: 'map' },
        { from: 'repository', to: 'gate', text: '[A] readLock.unlock() in finally' },
        { from: 'repository', to: 'threadA', text: 'return detached KvEntry(value="A", version=2)', type: 'return' },
        { from: 'map', to: 'repository', text: '[B] remappingFn finally runs — sees version==2 (NOT expectedVersion 1)', activate: 'map' },
        { type: 'note', over: ['map'], text: 'This is the step a get()-then-set() design would get wrong: B must see the version AS IT IS NOW, inside the same atomic call, not a value it read moments earlier.' },
        { from: 'map', to: 'repository', text: '[B] throw VersionConflictException inside compute — mapping unchanged, no append', deactivate: 'map' },
        { from: 'repository', to: 'gate', text: '[B] readLock.unlock() in finally' },
        { from: 'repository', to: 'threadB', text: 'throw VersionConflictException("expected 1 but was 2")', type: 'return' },
        { type: 'note', over: ['threadA', 'threadB'], text: 'Exactly one CAS succeeds, one clean VersionConflictException, key ends at version 2 -- never silently overwritten, never lost. See KvStoreConcurrencyTest, 300 rounds.' },
      ],
    },
    {
      id: 'replay-waits-for-write',
      label: 'Replay waits for an unfinished append',
      description: 'A writer pauses before appending its command. Replay cannot clear or reconstruct the map until that write has both appended and published. Reset and coherent snapshots use the same exclusive gate.',
      participants: [
        { id: 'writer', name: 'Writer', kind: 'actor' },
        { id: 'reader', name: 'Replay request', kind: 'actor' },
        { id: 'repo', name: 'KvStoreRepository', kind: 'component' },
        { id: 'gate', name: 'Lifecycle gate', kind: 'component' },
        { id: 'wal', name: 'WriteAheadLog', kind: 'component' },
      ],
      steps: [
        { from: 'writer', to: 'repo', text: 'set("key", "latest", null)' },
        { from: 'repo', to: 'gate', text: 'readLock.lock() — shared admission', activate: 'gate' },
        { from: 'repo', to: 'repo', text: 'compute(key): build replacement; keep key serialized' },
        { from: 'reader', to: 'repo', text: 'replayFromWal()' },
        { from: 'repo', to: 'gate', text: 'writeLock.lock() — waits for the unfinished key operation' },
        { from: 'repo', to: 'wal', text: 'append SetCommand inside compute' },
        { from: 'repo', to: 'repo', text: 'publish replacement; compute returns' },
        { from: 'repo', to: 'gate', text: 'readLock.unlock() in finally', deactivate: 'gate' },
        { from: 'repo', to: 'writer', text: 'return detached entry', type: 'return' },
        { from: 'gate', to: 'repo', text: 'exclusive gate acquired; key reads and writes now wait', activate: 'gate' },
        { from: 'repo', to: 'repo', text: 'store.clear()' },
        { from: 'repo', to: 'wal', text: 'replay(store) — apply retained commands in recorded order' },
        { from: 'repo', to: 'gate', text: 'writeLock.unlock() in finally', deactivate: 'gate' },
        { from: 'repo', to: 'reader', text: 'reconstruction complete', type: 'return' },
        { type: 'note', over: ['repo', 'wal'], text: 'No stale command can append across reset/replay. Independent keys can share admission during normal writes. Map and log still disappear on process restart.' },
      ],
    },
  ],
};
