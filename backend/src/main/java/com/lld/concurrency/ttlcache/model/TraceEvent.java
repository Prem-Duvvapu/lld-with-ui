package com.lld.concurrency.ttlcache.model;

import java.time.Instant;

/**
 * One timestamped, ordered entry in a run's execution trace — a real recorded fact,
 * not an animation keyframe. {@code sequence} is assigned by a single shared
 * {@code AtomicLong} so ordering across the main thread and the background sweeper
 * thread is unambiguous even though wall-clock {@link Instant} values can tie.
 */
public record TraceEvent(
        long sequence,
        Instant timestamp,
        long elapsedNanos,
        String threadName,
        EventType type,
        String key,
        String value,
        Long ttlMillis,
        int cacheSize
) {
}
