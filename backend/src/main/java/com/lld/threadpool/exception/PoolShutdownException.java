package com.lld.threadpool.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** Thrown for any submission after {@code shutdown()}/{@code shutdownNow()} — always, regardless
 *  of the pool's configured {@link com.lld.threadpool.strategy.RejectionPolicy}. A deliberate
 *  simplification vs. the JDK's {@code ThreadPoolExecutor} (which still runs the rejection handler
 *  post-shutdown): "the pool is gone" is a distinct, simpler failure mode for this demo than "the
 *  pool is busy." */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class PoolShutdownException extends ThreadPoolException {
    public PoolShutdownException(String message) {
        super(message);
    }
}
