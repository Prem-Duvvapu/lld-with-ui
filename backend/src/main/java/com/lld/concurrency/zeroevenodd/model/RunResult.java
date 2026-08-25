package com.lld.concurrency.zeroevenodd.model;

import java.time.Instant;
import java.util.List;

/**
 * The full outcome of one synchronous run: the parameters used, timing, the
 * final printed sequence (space-separated, e.g. "0 1 0 2 0 3 0 4"), and the
 * ordered trace the frontend replays.
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
