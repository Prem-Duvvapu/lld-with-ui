package com.lld.trafficsignal.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown for a malformed or conflicting emergency-override request: an unknown light id, a
 * request to resume when no override is active, or a second override requested for a different
 * light while one is already in force on the same intersection.
 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidOverrideException extends TrafficSignalException {
    public InvalidOverrideException(String message) {
        super(message);
    }
}
