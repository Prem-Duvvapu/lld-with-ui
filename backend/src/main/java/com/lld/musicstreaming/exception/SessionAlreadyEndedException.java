package com.lld.musicstreaming.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class SessionAlreadyEndedException extends MusicStreamingException {
    public SessionAlreadyEndedException(String message) {
        super(message);
    }
}
