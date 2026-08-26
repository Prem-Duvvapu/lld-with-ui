package com.lld.concurrency.concurrenthashmap.exception;

/**
 * The increment or compute-race threads for a run failed to finish within the
 * safety timeout, or were interrupted while the service waited on them. Every
 * thread in a run does a fixed, bounded amount of work against a non-blocking
 * (never-parks-forever) striped lock, so this is mathematically unreachable in
 * normal operation — it is treated as a server-side fault (plain unchecked
 * exception, not a {@link ConcurrentHashMapException}/{@code DomainException})
 * rather than a caller mistake, so it must never be mapped to a 4xx.
 */
public class RunExecutionException extends RuntimeException {
    public RunExecutionException(String message) {
        super(message);
    }
}
