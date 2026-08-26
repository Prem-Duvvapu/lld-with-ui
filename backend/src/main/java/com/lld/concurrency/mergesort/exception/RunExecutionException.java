package com.lld.concurrency.mergesort.exception;

/**
 * The ForkJoinPool sort task for a run failed to finish within the safety timeout,
 * or the submitting thread was interrupted while waiting on it. A well-formed
 * request (validated size/parallelism/sequentialThreshold within the module's
 * ceilings) makes this unreachable in normal operation, so it is treated as a
 * server-side fault (plain unchecked exception, not a {@link MergeSortException}/
 * {@code DomainException}) rather than a caller mistake — it must never be mapped
 * to a 4xx.
 */
public class RunExecutionException extends RuntimeException {
    public RunExecutionException(String message) {
        super(message);
    }

    public RunExecutionException(String message, Throwable cause) {
        super(message, cause);
    }
}
