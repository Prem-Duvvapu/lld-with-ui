// Sequence diagram content for kvstore.
// Grounded directly in KvStoreRepository#cas and
// KvStoreConcurrencyTest#repeatedCasRaceProducesExactlyOneWinnerPerVersionBump: N threads racing
// CAS against the same key with the identical expectedVersion. A class diagram shows
// KvStoreRepository owns a ConcurrentHashMap; it does not show why the version check and the
// write have to happen inside the SAME compute() call, or why that is enough on its own --
// with no ReentrantLock anywhere -- to close the race.
export default {
  title: 'Key-Value Store — Lock-Free CAS Race, No ReentrantLock Anywhere',
  description:
    'Two threads both call cas("key", expectedVersion=1, ...) at the same instant. Both invoke store.compute("key", remappingFunction) -- ConcurrentHashMap guarantees only ONE thread\'s remapping function runs at a time for a given key\'s bin, so the two calls are serialized by the map itself, not by any lock this module creates. Whichever thread\'s remapping function runs first sees version==1 (matches expectedVersion), builds a new KvEntry at version 2, and that becomes the map\'s new value for "key". The second thread\'s remapping function then runs against the ALREADY-UPDATED entry: it sees version==2, which does not match its own expectedVersion=1, so it returns the entry UNCHANGED and flags a version mismatch for its caller to throw.',
  flows: [
    {
      id: 'lock-free-cas-race',
      label: 'Two threads racing CAS on the same key with the same expectedVersion',
      description:
        'Key "contended-key" starts at version 1. Thread A and Thread B both call cas("contended-key", 1, ...) at the same instant, started together via a CountDownLatch (see KvStoreConcurrencyTest, run for 300 rounds). Exactly one succeeds and bumps the version to 2; the other cleanly receives a VersionConflictException.',
      participants: [
        { id: 'threadA', name: 'Thread A\ncas(key, v=1, "A")', kind: 'actor' },
        { id: 'threadB', name: 'Thread B\ncas(key, v=1, "B")', kind: 'actor' },
        { id: 'repository', name: 'KvStoreRepository', kind: 'component' },
        { id: 'map', name: 'ConcurrentHashMap\n(internal per-bin sync)', kind: 'component', stereotype: 'lock-free' },
        { id: 'wal', name: 'WriteAheadLog', kind: 'component' },
      ],
      steps: [
        { type: 'note', over: ['map'], text: '"contended-key" currently holds KvEntry(value="seed", version=1).' },
        { from: 'threadA', to: 'repository', text: 'cas("contended-key", expectedVersion=1, "A")' },
        { from: 'threadB', to: 'repository', text: 'cas("contended-key", expectedVersion=1, "B")  — arrives ~simultaneously' },
        { from: 'repository', to: 'map', text: '[A] compute("contended-key", remappingFn)  — CHM serializes this key\'s bin, A wins entry', activate: 'map' },
        { from: 'repository', to: 'map', text: '[B] compute("contended-key", remappingFn)  — BLOCKS on the same bin, not a repository-owned lock' },
        { from: 'map', to: 'repository', text: '[A] remappingFn sees version==1 == expectedVersion(1) -> builds KvEntry(value="A", version=2)' },
        { from: 'map', to: 'map', text: '[A] map now holds KvEntry(value="A", version=2)', deactivate: 'map' },
        { from: 'repository', to: 'wal', text: '[A] append(SetCommand(key, "A", null, 2))' },
        { from: 'repository', to: 'threadA', text: 'return KvEntry(value="A", version=2)', type: 'return' },
        { from: 'map', to: 'repository', text: '[B] remappingFn finally runs — sees version==2 (NOT expectedVersion 1)', activate: 'map' },
        { type: 'note', over: ['map'], text: 'This is the step a get()-then-set() design would get wrong: B must see the version AS IT IS NOW, inside the same atomic call, not a value it read moments earlier.' },
        { from: 'map', to: 'repository', text: '[B] remappingFn returns the entry UNCHANGED, flags versionMismatch', deactivate: 'map' },
        { from: 'repository', to: 'threadB', text: 'throw VersionConflictException("expected 1 but was 2")', type: 'return' },
        { type: 'note', over: ['threadA', 'threadB'], text: 'Exactly one CAS succeeds, one clean VersionConflictException, key ends at version 2 -- never silently overwritten, never lost. See KvStoreConcurrencyTest, 300 rounds.' },
      ],
    },
  ],
};
