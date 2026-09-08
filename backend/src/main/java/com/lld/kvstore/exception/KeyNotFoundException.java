package com.lld.kvstore.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Shares its simple name with {@code cachelibrary.exception.KeyNotFoundException} — harmless,
 * since exceptions are plain classes, not Spring beans, so RCA-059's bean-name collision lesson
 * (which applies only to {@code @Component}/{@code @Service}/{@code @Repository}) does not apply here.
 */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class KeyNotFoundException extends KvStoreException {
    public KeyNotFoundException(String message) {
        super(message);
    }
}
