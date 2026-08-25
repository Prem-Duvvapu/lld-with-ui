package com.lld.snakeladders.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** A roll was requested on a game that has already produced a winner. */
@ResponseStatus(HttpStatus.CONFLICT)
public class GameAlreadyFinishedException extends SnakeLaddersException {
    public GameAlreadyFinishedException(String message) {
        super(message);
    }
}
