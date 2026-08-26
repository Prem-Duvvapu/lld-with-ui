package com.lld.concurrency.mergesort.model;

import java.time.Instant;
import java.util.List;

/**
 * The full outcome of one synchronous run: the array before and after, the
 * parameters used, timing, the number of distinct real JVM threads that actually
 * participated (the proof this was genuine ForkJoin parallelism, not a single
 * thread doing all the work), and the ordered trace the frontend replays.
 */
public record RunResult(
        String runId,
        List<Integer> originalArray,
        List<Integer> sortedArray,
        int size,
        int parallelism,
        int sequentialThreshold,
        int distinctThreadsUsed,
        Instant startedAt,
        Instant finishedAt,
        long durationMillis,
        List<TraceEvent> trace
) {
}
