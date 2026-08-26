package com.lld.concurrency.bloomfilter.model;

import java.time.Instant;
import java.util.List;

/**
 * The full outcome of one synchronous run: the parameters used, timing, the items
 * genuinely added, the query outcomes (true positives, true negatives, and — when
 * found — the deterministically-hunted false positive), and the ordered trace the
 * frontend replays.
 */
public record RunResult(
        String runId,
        int bitSize,
        int hashCount,
        int addThreads,
        List<String> itemsAdded,
        List<QueryOutcome> queries,
        int bitsSetCount,
        boolean falsePositiveDemonstrated,
        Instant startedAt,
        Instant finishedAt,
        long durationMillis,
        List<TraceEvent> trace
) {
}
