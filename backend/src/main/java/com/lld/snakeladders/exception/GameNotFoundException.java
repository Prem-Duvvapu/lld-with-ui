package com.lld.snakeladders.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** No game exists for the given id. */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class GameNotFoundException extends SnakeLaddersException {
    public GameNotFoundException(String message) {
        super(message);
    }
}
