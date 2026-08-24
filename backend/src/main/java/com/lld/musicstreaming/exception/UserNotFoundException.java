package com.lld.musicstreaming.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class UserNotFoundException extends MusicStreamingException {
    public UserNotFoundException(String message) {
        super(message);
    }
}
