package com.lld.musicstreaming.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class PlaylistNotFoundException extends MusicStreamingException {
    public PlaylistNotFoundException(String message) {
        super(message);
    }
}
