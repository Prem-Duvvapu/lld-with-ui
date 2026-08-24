package com.lld.concurrency.ttlcache.model;

/**
 * Callback {@link TtlCache} invokes for every event worth recording — a put, a hit,
 * a miss, a lazy expiry, or a background sweep eviction. Kept as a tiny functional
 * interface so the cache itself has zero knowledge of HTTP, JSON, or how a run is
 * orchestrated — it just narrates what genuinely happened, on the thread (main
 * thread or the sweeper's own background thread) it happened on.
 */
@FunctionalInterface
public interface TraceRecorder {

    /**
     * @param type         what happened
     * @param key          the cache key involved
     * @param value        the value involved, or {@code null} when there wasn't one
     *                     (a miss, or a background eviction where only the key matters)
     * @param ttlMillis    the TTL just applied, only non-null for {@link EventType#PUT} —
     *                     carried on the trace so a replay can render a real countdown
     *                     without recomputing anything client-side
     * @param cacheSizeNow the cache's entry count at this instant
     */
    void record(EventType type, String key, String value, Long ttlMillis, int cacheSizeNow);

    TraceRecorder NOOP = (type, key, value, ttlMillis, cacheSizeNow) -> { };
}
