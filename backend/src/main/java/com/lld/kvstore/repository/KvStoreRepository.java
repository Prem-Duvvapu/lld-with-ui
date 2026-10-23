package com.lld.kvstore.repository;

import com.lld.kvstore.command.DeleteCommand;
import com.lld.kvstore.command.Command;
import com.lld.kvstore.command.SetCommand;
import com.lld.kvstore.exception.KeyNotFoundException;
import com.lld.kvstore.exception.VersionConflictException;
import com.lld.kvstore.model.KvEntry;
import com.lld.kvstore.template.GetOperation;
import com.lld.kvstore.template.PeekOperation;
import org.springframework.stereotype.Repository;

import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantReadWriteLock;

/**
 * The store itself, plus its {@link WriteAheadLog}. {@link #cas} is the concurrency centerpiece
 * — see its javadoc. It uses a per-key atomic {@link ConcurrentHashMap#compute}
 * operation, including its log append. A shared lifecycle lock permits concurrent
 * key operations; its exclusive side protects replay, reset and coherent snapshots.
 * Contending updates may block; there is no lock-free progress guarantee.
 */
@Repository
public class KvStoreRepository {

    private final ConcurrentHashMap<String, KvEntry> store = new ConcurrentHashMap<>();
    private final WriteAheadLog wal = new WriteAheadLog();
    private final ReentrantReadWriteLock lifecycle = new ReentrantReadWriteLock(true);

    public KvEntry set(String key, String value, Long ttlMillis) {
        lifecycle.readLock().lock();
        try {
            return copy(store.compute(key, (k, existing) -> {
                Long expiresAt = (ttlMillis != null && ttlMillis > 0) ? System.currentTimeMillis() + ttlMillis : null;
                long newVersion = existing == null ? 1 : existing.getVersion() + 1;
                KvEntry updated = KvEntry.builder().value(value).version(newVersion).expiresAtEpoch(expiresAt).build();
                wal.append(new SetCommand(key, value, expiresAt, newVersion));
                return updated;
            }));
        } finally {
            lifecycle.readLock().unlock();
        }
    }

    public KvEntry get(String key) {
        lifecycle.readLock().lock();
        try {
            return copy(new GetOperation().read(store, key));
        } finally {
            lifecycle.readLock().unlock();
        }
    }

    public Optional<KvEntry> peek(String key) {
        lifecycle.readLock().lock();
        try {
            return new PeekOperation().read(store, key).map(KvStoreRepository::copy);
        } finally {
            lifecycle.readLock().unlock();
        }
    }

    public void delete(String key) {
        lifecycle.readLock().lock();
        try {
            store.compute(key, (k, existing) -> {
                if (existing == null) {
                    throw new KeyNotFoundException("No entry for key: " + key);
                }
                wal.append(new DeleteCommand(key));
                return null;
            });
        } finally {
            lifecycle.readLock().unlock();
        }
    }

    /**
     * A genuine compare-and-swap, not a {@code get()} followed by an unconditional
     * {@code set()} — the version check and the update happen inside ONE
     * {@link ConcurrentHashMap#compute} call, so contending updates cannot split this
     * version-check-and-replacement operation. Retrievals can still observe the old mapping
     * while the replacement is being computed. N threads racing this with the same
     * {@code expectedVersion} produce exactly one winner; every loser sees a
     * {@link VersionConflictException} (a genuine version mismatch — the well-formed request
     * simply lost a race) rather than a silently-overwritten or lost update.
     */
    public KvEntry cas(String key, long expectedVersion, String newValue) {
        lifecycle.readLock().lock();
        try {
            return copy(store.compute(key, (k, existing) -> {
                if (existing == null || isExpired(existing)) {
                    // A rejected CAS is not a write: leave even an expired mapping untouched.
                    throw new KeyNotFoundException("No entry for key: " + key);
                }
                if (existing.getVersion() != expectedVersion) {
                    throw new VersionConflictException("Expected version " + expectedVersion + " but was "
                            + existing.getVersion() + " for key: " + key);
                }
                KvEntry updated = KvEntry.builder()
                        .value(newValue)
                        .version(existing.getVersion() + 1)
                        .expiresAtEpoch(existing.getExpiresAtEpoch())
                        .build();
                wal.append(new SetCommand(key, updated.getValue(), updated.getExpiresAtEpoch(), updated.getVersion()));
                return updated;
            }));
        } finally {
            lifecycle.readLock().unlock();
        }
    }

    public Map<String, KvEntry> getAllEntries() {
        return snapshot().entries();
    }

    /** Detached entries and commands from the same committed point, never a partial replay. */
    public Snapshot snapshot() {
        lifecycle.writeLock().lock();
        try {
            Map<String, KvEntry> entries = new HashMap<>();
            store.forEach((key, entry) -> entries.put(key, copy(entry)));
            return new Snapshot(Map.copyOf(entries), List.copyOf(wal.getCommands()));
        } finally {
            lifecycle.writeLock().unlock();
        }
    }

    public record Snapshot(Map<String, KvEntry> entries, List<Command> commands) {}

    /** Rebuilds the map from the retained in-memory WAL; this is not process-crash recovery. */
    public void replayFromWal() {
        lifecycle.writeLock().lock();
        try {
            store.clear();
            wal.replay(store);
        } finally {
            lifecycle.writeLock().unlock();
        }
    }

    /** Wipes everything, WAL included. Used only to reset the isolated {@code /sim/*} sandbox. */
    public void reset() {
        lifecycle.writeLock().lock();
        try {
            store.clear();
            wal.clear();
        } finally {
            lifecycle.writeLock().unlock();
        }
    }

    private static KvEntry copy(KvEntry entry) {
        return new KvEntry(entry.getValue(), entry.getVersion(), entry.getExpiresAtEpoch());
    }

    private boolean isExpired(KvEntry entry) {
        return entry.getExpiresAtEpoch() != null && System.currentTimeMillis() >= entry.getExpiresAtEpoch();
    }
}
