package com.lld.kvstore.repository;

import com.lld.kvstore.command.DeleteCommand;
import com.lld.kvstore.command.SetCommand;
import com.lld.kvstore.exception.KeyNotFoundException;
import com.lld.kvstore.exception.VersionConflictException;
import com.lld.kvstore.model.KvEntry;
import com.lld.kvstore.template.GetOperation;
import com.lld.kvstore.template.PeekOperation;
import org.springframework.stereotype.Repository;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

/**
 * The store itself, plus its {@link WriteAheadLog}. {@link #cas} is the concurrency centerpiece
 * — see its javadoc. Every other module shipped in this repo closes its races with a per-entity
 * {@code ReentrantLock}; this one is deliberately lock-free, driven entirely by
 * {@link ConcurrentHashMap#compute}, whose remapping function for a given key runs atomically
 * with respect to every other operation on that same key.
 */
@Repository
public class KvStoreRepository {

    private final ConcurrentHashMap<String, KvEntry> store = new ConcurrentHashMap<>();
    private final WriteAheadLog wal = new WriteAheadLog();

    public KvEntry set(String key, String value, Long ttlMillis) {
        Long expiresAt = (ttlMillis != null && ttlMillis > 0) ? System.currentTimeMillis() + ttlMillis : null;
        KvEntry result = store.compute(key, (k, existing) -> {
            long newVersion = existing == null ? 1 : existing.getVersion() + 1;
            return KvEntry.builder().value(value).version(newVersion).expiresAtEpoch(expiresAt).build();
        });
        wal.append(new SetCommand(key, value, expiresAt, result.getVersion()));
        return result;
    }

    public KvEntry get(String key) {
        return new GetOperation().read(store, key);
    }

    public Optional<KvEntry> peek(String key) {
        return new PeekOperation().read(store, key);
    }

    public void delete(String key) {
        if (store.remove(key) == null) {
            throw new KeyNotFoundException("No entry for key: " + key);
        }
        wal.append(new DeleteCommand(key));
    }

    /**
     * A genuine compare-and-swap, not a {@code get()} followed by an unconditional
     * {@code set()} — the version check and the update happen inside ONE
     * {@link ConcurrentHashMap#compute} call, so no other thread can observe or mutate this
     * key between the check and the write. N threads racing this with the same
     * {@code expectedVersion} produce exactly one winner; every loser sees a
     * {@link VersionConflictException} (a genuine version mismatch — the well-formed request
     * simply lost a race) rather than a silently-overwritten or lost update.
     */
    public KvEntry cas(String key, long expectedVersion, String newValue) {
        AtomicReference<KvEntry> resultHolder = new AtomicReference<>();
        AtomicBoolean notFound = new AtomicBoolean(false);
        AtomicBoolean versionMismatch = new AtomicBoolean(false);

        store.compute(key, (k, existing) -> {
            if (existing == null || isExpired(existing)) {
                notFound.set(true);
                return null; // lazily evict if it was merely expired
            }
            if (existing.getVersion() != expectedVersion) {
                versionMismatch.set(true);
                resultHolder.set(existing);
                return existing; // unchanged -- this thread lost the race
            }
            KvEntry updated = KvEntry.builder()
                    .value(newValue)
                    .version(existing.getVersion() + 1)
                    .expiresAtEpoch(existing.getExpiresAtEpoch())
                    .build();
            resultHolder.set(updated);
            return updated;
        });

        if (notFound.get()) {
            throw new KeyNotFoundException("No entry for key: " + key);
        }
        if (versionMismatch.get()) {
            throw new VersionConflictException("Expected version " + expectedVersion + " but was "
                    + resultHolder.get().getVersion() + " for key: " + key);
        }
        KvEntry result = resultHolder.get();
        wal.append(new SetCommand(key, result.getValue(), result.getExpiresAtEpoch(), result.getVersion()));
        return result;
    }

    public Map<String, KvEntry> getAllEntries() {
        return new HashMap<>(store);
    }

    public WriteAheadLog getWal() {
        return wal;
    }

    /** Wipes live state and rebuilds it purely by replaying the (untouched) WAL — proves durability. */
    public void replayFromWal() {
        store.clear();
        wal.replay(store);
    }

    /** Wipes everything, WAL included. Used only to reset the isolated {@code /sim/*} sandbox. */
    public void reset() {
        store.clear();
        wal.clear();
    }

    private boolean isExpired(KvEntry entry) {
        return entry.getExpiresAtEpoch() != null && System.currentTimeMillis() >= entry.getExpiresAtEpoch();
    }
}
