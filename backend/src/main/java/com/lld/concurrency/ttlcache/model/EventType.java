package com.lld.concurrency.ttlcache.model;

/**
 * Every meaningful thing that happens inside {@link TtlCache} during a run.
 *
 * <p>Recorded in order by {@link TraceRecorder} so the frontend can replay a real
 * execution instead of animating a canned one.
 */
public enum EventType {
    /** A value was stored under a key with a TTL, replacing anything previously there. */
    PUT,
    /** get() found a live, unexpired entry and returned its value. */
    GET_HIT,
    /** get() found no entry for the key at all. */
    GET_MISS_NOT_FOUND,
    /** get() found an entry whose TTL had already elapsed and evicted it on the spot,
     *  before the background sweeper ever got to it — a lazy, read-time expiry. */
    GET_MISS_EXPIRED,
    /** The background {@code ScheduledExecutorService} sweep found this key expired
     *  and evicted it, independent of any get() call. */
    BACKGROUND_EVICTION
}
