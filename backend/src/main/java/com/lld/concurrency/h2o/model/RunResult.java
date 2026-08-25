package com.lld.concurrency.h2o.model;

import java.time.Instant;
import java.util.List;

/**
 * The full outcome of one synchronous run: the parameters used, timing, the
 * final bonded output (space-separated H/O tokens, always groupable into
 * moleculeCount triples of exactly 2 H + 1 O), and the ordered trace the
 * frontend replays.
 */
public record RunResult(
        String runId,
        int moleculeCount,
        int hydrogenCount,
        int oxygenCount,
        int threadCount,
        String result,
        Instant startedAt,
        Instant finishedAt,
        long durationMillis,
        long elapsedNanos,
        List<TraceEvent> events
) {
}
