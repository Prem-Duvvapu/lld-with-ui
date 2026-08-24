package com.lld.concurrency.ttlcache.model;

import java.time.Instant;
import java.util.List;

/**
 * The full outcome of one synchronous run: the parameters used, timing, the final
 * live entry count (proof of what the background sweeper left behind), and the
 * ordered trace the frontend replays.
 */
public record RunResult(
        String runId,
        long sweepIntervalMillis,
        int totalPuts,
        int totalGets,
        Instant startedAt,
        Instant finishedAt,
        long durationMillis,
        int finalCacheSize,
        List<TraceEvent> trace
) {
}
