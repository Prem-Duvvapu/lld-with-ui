package com.lld.threadpool.model;

/**
 * The response shape for a successful {@code submit} call — a plain, fully immutable record with
 * no internal pool/worker state reachable through it (RCA-049).
 *
 * @param evictedTaskId the id of the queued task {@link com.lld.threadpool.strategy.DiscardOldestPolicy}
 *                       evicted to make room, or {@code null} for every other outcome.
 */
public record SubmitResult(String taskId, String taskName, SubmitOutcome outcome, String evictedTaskId) {
}
