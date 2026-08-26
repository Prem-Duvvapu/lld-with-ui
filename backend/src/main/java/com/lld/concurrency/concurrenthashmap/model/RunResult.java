package com.lld.concurrency.concurrenthashmap.model;

import java.time.Instant;
import java.util.List;

/**
 * The full outcome of one synchronous run: the parameters used, timing, and the two
 * correctness proofs the frontend surfaces — {@code sumOfFinalCounters} must equal
 * {@code totalIncrements} (no lost updates under concurrent {@code merge()} calls),
 * and {@code computeExecutions} must equal exactly 1 (only one racing thread's
 * {@code computeIfAbsent()} mapping function ever actually ran) — plus the ordered
 * trace the frontend replays.
 */
public record RunResult(
        String runId,
        int segments,
        int threads,
        int incrementsPerThread,
        int distinctKeys,
        int computeRacers,
        long totalIncrements,
        long sumOfFinalCounters,
        int computeExecutions,
        Instant startedAt,
        Instant finishedAt,
        long durationMillis,
        List<TraceEvent> trace
) {
}
