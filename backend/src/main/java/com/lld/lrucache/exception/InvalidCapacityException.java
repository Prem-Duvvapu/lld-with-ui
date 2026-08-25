package com.lld.lrucache.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** A cache capacity of zero or less was requested — a cache must hold at least one entry. */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidCapacityException extends LruCacheException {
    public InvalidCapacityException(String message) {
        super(message);
    }
}
