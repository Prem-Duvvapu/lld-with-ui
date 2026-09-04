package com.lld.threadpool.model;

/** A read-only snapshot of one pool's live state — the {@code GET /stats} shape. */
public record PoolStats(
        String poolId,
        int corePoolSize,
        int maxPoolSize,
        int queueCapacity,
        String rejectionPolicy,
        int currentWorkerCount,
        int queueSize,
        long submittedCount,
        long completedCount,
        long rejectedCount,
        long callerRunCount,
        boolean shuttingDown,
        boolean terminated
) {
}
