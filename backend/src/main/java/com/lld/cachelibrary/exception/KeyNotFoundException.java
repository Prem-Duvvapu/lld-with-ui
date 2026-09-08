package com.lld.cachelibrary.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class KeyNotFoundException extends CacheLibraryException {
    public KeyNotFoundException(String message) {
        super(message);
    }
}
