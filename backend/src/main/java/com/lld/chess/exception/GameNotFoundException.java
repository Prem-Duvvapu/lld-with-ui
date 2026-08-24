package com.lld.chess.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class GameNotFoundException extends ChessException {
    public GameNotFoundException(String message) {
        super(message);
    }
}
