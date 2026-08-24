package com.lld.concurrency.ttlcache.model;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

/**
 * A genuine time-to-live cache: entries live in a {@link ConcurrentHashMap} and are
 * evicted two independent ways —
 *
 * <ol>
 *     <li><b>Lazily, on read:</b> {@link #get(String)} always checks the entry's
 *     expiry against wall-clock time before returning it, so a caller never observes
 *     a stale value even if the background sweep hasn't run yet.</li>
 *     <li><b>Proactively, in the background:</b> a real {@link ScheduledExecutorService}
 *     runs {@link #sweepExpired()} on a fixed period, on its own daemon thread,
 *     independent of whether anyone ever calls {@code get()} for those keys again.</li>
 * </ol>
 *
 * <p>Every put, hit, miss, lazy expiry, and background eviction is reported to a
 * {@link TraceRecorder} at the moment it happens, so a run can be replayed as a real
 * timestamped trace rather than an animation.
 */
public final class TtlCache implements AutoCloseable {

    /** Immutable snapshot of one stored value and the instant it stops being valid. */
    private static final class CacheEntry {
        final String value;
        final long expiresAtEpochMillis;

        CacheEntry(String value, long expiresAtEpochMillis) {
            this.value = value;
            this.expiresAtEpochMillis = expiresAtEpochMillis;
        }

        boolean isExpiredAt(long nowEpochMillis) {
            return nowEpochMillis >= expiresAtEpochMillis;
        }
    }

    private final ConcurrentHashMap<String, CacheEntry> store = new ConcurrentHashMap<>();
    private final TraceRecorder recorder;
    private final long sweepIntervalMillis;
    private final ScheduledExecutorService sweeper;
    private final ScheduledFuture<?> sweepTask;

    public TtlCache(long sweepIntervalMillis) {
        this(sweepIntervalMillis, TraceRecorder.NOOP);
    }

    public TtlCache(long sweepIntervalMillis, TraceRecorder recorder) {
        if (sweepIntervalMillis <= 0) {
            throw new IllegalArgumentException("sweepIntervalMillis must be positive, got " + sweepIntervalMillis);
        }
        this.sweepIntervalMillis = sweepIntervalMillis;
        this.recorder = recorder == null ? TraceRecorder.NOOP : recorder;
        this.sweeper = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "ttl-cache-sweeper");
            t.setDaemon(true);
            return t;
        });
        // First sweep only fires after a full interval has elapsed — this is what
        // makes the "get() catches an expired entry before the sweep runs" scenario
        // deterministic rather than a race against the scheduler.
        this.sweepTask = sweeper.scheduleAtFixedRate(
                this::sweepExpired, sweepIntervalMillis, sweepIntervalMillis, TimeUnit.MILLISECONDS);
    }

    /**
     * Stores {@code value} under {@code key}, replacing anything previously there —
     * both the old value and its old TTL are gone the instant this returns.
     */
    public void put(String key, String value, long ttlMillis) {
        if (key == null) {
            throw new IllegalArgumentException("key must not be null");
        }
        if (ttlMillis <= 0) {
            throw new IllegalArgumentException("ttlMillis must be positive, got " + ttlMillis);
        }
        long expiresAt = System.currentTimeMillis() + ttlMillis;
        store.put(key, new CacheEntry(value, expiresAt));
        recorder.record(EventType.PUT, key, value, ttlMillis, store.size());
    }

    /**
     * Returns the live value for {@code key}, or empty if there is none — either
     * because nothing was ever put there, or because its TTL has elapsed. An
     * elapsed entry is evicted right here, on this call, regardless of whether the
     * background sweeper has gotten to it yet.
     */
    public Optional<String> get(String key) {
        CacheEntry entry = store.get(key);
        if (entry == null) {
            recorder.record(EventType.GET_MISS_NOT_FOUND, key, null, null, store.size());
            return Optional.empty();
        }
        long now = System.currentTimeMillis();
        if (entry.isExpiredAt(now)) {
            // Only remove this exact entry — if a concurrent put() already replaced
            // it with a fresh one, that fresh entry must survive untouched.
            store.remove(key, entry);
            recorder.record(EventType.GET_MISS_EXPIRED, key, null, null, store.size());
            return Optional.empty();
        }
        recorder.record(EventType.GET_HIT, key, entry.value, null, store.size());
        return Optional.of(entry.value);
    }

    /** Current live entry count. Does not itself trigger any expiry check. */
    public int size() {
        return store.size();
    }

    /**
     * Runs on the sweeper's own background thread on a fixed period. Removes every
     * entry that has expired since it was written, independent of any {@code get()}
     * call ever being made for it.
     */
    private void sweepExpired() {
        long now = System.currentTimeMillis();
        for (Map.Entry<String, CacheEntry> e : store.entrySet()) {
            CacheEntry entry = e.getValue();
            if (entry.isExpiredAt(now) && store.remove(e.getKey(), entry)) {
                recorder.record(EventType.BACKGROUND_EVICTION, e.getKey(), entry.value, null, store.size());
            }
        }
    }

    /** Stops the background sweeper cleanly. Safe to call more than once. */
    public void shutdown() {
        sweepTask.cancel(false);
        sweeper.shutdownNow();
        try {
            sweeper.awaitTermination(2, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    @Override
    public void close() {
        shutdown();
    }
}
