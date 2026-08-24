package com.lld.musicstreaming.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.FORBIDDEN)
public class DownloadNotAllowedException extends MusicStreamingException {
    public DownloadNotAllowedException(String message) {
        super(message);
    }
}
