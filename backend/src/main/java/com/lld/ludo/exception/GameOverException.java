package com.lld.ludo.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** A roll or move was requested on a game that has already produced a winner. */
@ResponseStatus(HttpStatus.CONFLICT)
public class GameOverException extends LudoException {
    public GameOverException(String message) {
        super(message);
    }
}
