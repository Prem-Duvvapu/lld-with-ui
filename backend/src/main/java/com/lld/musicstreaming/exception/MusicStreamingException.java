package com.lld.musicstreaming.exception;

import com.lld.config.DomainException;

/**
 * Base for every Music Streaming domain failure. Extends DomainException so
 * GlobalExceptionHandler maps the whole hierarchy to real HTTP statuses.
 */
public class MusicStreamingException extends DomainException {
    public MusicStreamingException(String message) {
        super(message);
    }
}
