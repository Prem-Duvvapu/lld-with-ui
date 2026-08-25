package com.lld.concurrency.h2o.exception;

/**
 * The hydrogen/oxygen threads for a run failed to finish within the safety
 * timeout, or were interrupted while the service waited on them. The
 * semaphore-bounded barrier design makes this mathematically unreachable in
 * normal operation (exactly 2 hydrogen + 1 oxygen permit ever exist, so the
 * barrier can never starve), so it is treated as a server-side fault (plain
 * unchecked exception, not an {@link H2OException}/{@code DomainException})
 * rather than a caller mistake — it must never be mapped to a 4xx.
 */
public class RunExecutionException extends RuntimeException {
    public RunExecutionException(String message) {
        super(message);
    }
}
