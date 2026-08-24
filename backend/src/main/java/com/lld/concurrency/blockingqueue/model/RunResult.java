package com.lld.concurrency.blockingqueue.model;

import java.time.Instant;
import java.util.List;

/**
 * The full outcome of one synchronous run: the parameters used, timing, the
 * highest occupancy ever actually observed (proof the bound held), and the
 * ordered trace the frontend replays.
 */
public record RunResult(
        String runId,
        int capacity,
        int producers,
        int consumers,
        int itemsPerProducer,
        int totalItems,
        Instant startedAt,
        Instant finishedAt,
        long durationMillis,
        int maxObservedSize,
        List<TraceEvent> trace
) {
}
