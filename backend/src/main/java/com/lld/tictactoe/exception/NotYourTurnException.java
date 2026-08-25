package com.lld.tictactoe.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** A player tried to move out of turn. */
@ResponseStatus(HttpStatus.CONFLICT)
public class NotYourTurnException extends TicTacToeException {
    public NotYourTurnException(String message) {
        super(message);
    }
}
