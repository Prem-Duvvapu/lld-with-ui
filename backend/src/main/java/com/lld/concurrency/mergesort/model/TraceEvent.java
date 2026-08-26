package com.lld.concurrency.mergesort.model;

import java.time.Instant;

/**
 * One timestamped, ordered entry in a run's execution trace — a real recorded fact
 * from a real {@code SortTask}, not an animation keyframe. {@code sequence} is
 * assigned from a single shared {@code AtomicLong} so ordering across ForkJoinPool
 * worker threads is unambiguous even though wall-clock {@link Instant} values can
 * tie.
 */
public record TraceEvent(
        long sequence,
        Instant timestamp,
        long elapsedNanos,
        String threadName,
        EventType type,
        int lo,
        int hi,
        Integer mid,
        Integer position,
        Integer value,
        String sourceSide
) {
}
