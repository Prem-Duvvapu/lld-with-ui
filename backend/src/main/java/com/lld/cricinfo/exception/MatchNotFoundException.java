package com.lld.cricinfo.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class MatchNotFoundException extends CricinfoException {
    public MatchNotFoundException(String message) {
        super(message);
    }
}
