package com.lld.kvstore.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** 409, not 400 — the request was well-formed, it simply lost a race against a fresher write. */
@ResponseStatus(HttpStatus.CONFLICT)
public class VersionConflictException extends KvStoreException {
    public VersionConflictException(String message) {
        super(message);
    }
}
