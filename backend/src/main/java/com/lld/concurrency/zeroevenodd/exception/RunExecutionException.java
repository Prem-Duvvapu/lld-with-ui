package com.lld.concurrency.zeroevenodd.exception;

/**
 * The zero/odd/even threads for a run failed to finish within the safety
 * timeout, or were interrupted while the service waited on them. The three-permit
 * handoff makes this mathematically unreachable in normal operation, so it is
 * treated as a server-side fault (plain unchecked exception, not a
 * {@link ZeroEvenOddException}/{@code DomainException}) rather than a caller
 * mistake — it must never be mapped to a 4xx.
 */
public class RunExecutionException extends RuntimeException {
    public RunExecutionException(String message) {
        super(message);
    }
}
