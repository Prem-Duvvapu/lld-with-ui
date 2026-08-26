package com.lld.ludo.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** A move was submitted for a player who is not {@code Game#currentPlayerIndex}. */
@ResponseStatus(HttpStatus.CONFLICT)
public class NotYourTurnException extends LudoException {
    public NotYourTurnException(String message) {
        super(message);
    }
}
