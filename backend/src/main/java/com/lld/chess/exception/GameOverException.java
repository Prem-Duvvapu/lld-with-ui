package com.lld.chess.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class GameOverException extends ChessException {
    public GameOverException(String message) {
        super(message);
    }
}
