package com.lld.tictactoe.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** The game already ended (won/draw) — no further moves are accepted. */
@ResponseStatus(HttpStatus.CONFLICT)
public class GameOverException extends TicTacToeException {
    public GameOverException(String message) {
        super(message);
    }
}
