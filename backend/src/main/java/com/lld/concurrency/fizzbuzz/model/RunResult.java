package com.lld.concurrency.fizzbuzz.model;

import java.time.Instant;
import java.util.List;

/**
 * The full outcome of one synchronous run: the parameters used, timing, the
 * final printed sequence (space-separated, canonical 1..n FizzBuzz output), and
 * the ordered trace the frontend replays.
 */
public record RunResult(
        String runId,
        int n,
        int threadCount,
        String result,
        Instant startedAt,
        Instant finishedAt,
        long durationMillis,
        long elapsedNanos,
        List<TraceEvent> events
) {
}
