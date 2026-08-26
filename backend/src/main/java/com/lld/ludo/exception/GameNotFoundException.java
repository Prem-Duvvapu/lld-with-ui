package com.lld.ludo.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** No game exists for the requested id. */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class GameNotFoundException extends LudoException {
    public GameNotFoundException(String message) {
        super(message);
    }
}
