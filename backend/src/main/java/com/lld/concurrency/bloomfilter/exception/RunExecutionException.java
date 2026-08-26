package com.lld.concurrency.bloomfilter.exception;

/**
 * The adder threads for a run failed to finish within the safety timeout, or were
 * interrupted while the service waited on them. Unlike the blocking queue, adder
 * threads here never park — {@code add()} always makes progress and returns — so
 * this is mathematically unreachable in normal operation and is treated as a
 * server-side fault (plain unchecked exception, not a {@link BloomFilterException}/
 * {@code DomainException}) rather than a caller mistake — it must never be mapped to
 * a 4xx.
 */
public class RunExecutionException extends RuntimeException {
    public RunExecutionException(String message) {
        super(message);
    }
}
