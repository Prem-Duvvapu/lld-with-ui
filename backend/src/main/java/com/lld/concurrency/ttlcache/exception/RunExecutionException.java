package com.lld.concurrency.ttlcache.exception;

/**
 * The run driver thread failed to finish within the safety timeout, or was
 * interrupted while the service waited on it. Treated as a server-side fault
 * (plain unchecked exception, not a {@link TtlCacheException}/{@code DomainException})
 * rather than a caller mistake — it must never be mapped to a 4xx.
 */
public class RunExecutionException extends RuntimeException {
    public RunExecutionException(String message) {
        super(message);
    }
}
