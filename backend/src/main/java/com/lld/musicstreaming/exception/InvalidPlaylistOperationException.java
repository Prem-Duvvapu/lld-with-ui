package com.lld.musicstreaming.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidPlaylistOperationException extends MusicStreamingException {
    public InvalidPlaylistOperationException(String message) {
        super(message);
    }
}
