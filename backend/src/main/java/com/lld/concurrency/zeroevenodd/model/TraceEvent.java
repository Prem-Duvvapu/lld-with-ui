package com.lld.concurrency.zeroevenodd.model;

import java.time.Instant;

/**
 * One timestamped, ordered entry in a run's execution trace — a real recorded fact,
 * not an animation keyframe. {@code sequence} is assigned by a single shared
 * {@code AtomicLong} so ordering across threads is unambiguous even though wall-clock
 * {@link Instant} values can tie.
 */
public record TraceEvent(
        long sequence,
        Instant timestamp,
        long elapsedNanos,
        String threadName,
        EventType type,
        String token,
        int n
) {
}
