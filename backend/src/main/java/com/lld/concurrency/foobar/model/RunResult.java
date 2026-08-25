package com.lld.concurrency.foobar.model;

import java.time.Instant;
import java.util.List;

/**
 * The full outcome of one synchronous run: the parameters used, timing, the
 * final printed string, and the ordered trace the frontend replays.
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
