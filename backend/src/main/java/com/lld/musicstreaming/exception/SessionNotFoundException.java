package com.lld.musicstreaming.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class SessionNotFoundException extends MusicStreamingException {
    public SessionNotFoundException(String message) {
        super(message);
    }
}
