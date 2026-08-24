package com.lld.concurrency.ttlcache.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * A run was requested with parameters that can never produce a valid run —
 * a non-positive sweep interval or TTL, an empty put script, a get scheduled
 * outside the observed window, or values large enough to blow the
 * "seconds, not longer" run-time budget. Always the caller's fault, hence 400.
 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidCacheParametersException extends TtlCacheException {
    public InvalidCacheParametersException(String message) {
        super(message);
    }
}
