package com.lld.chess.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** The piece cannot reach the target square under its movement rules (blocked, wrong shape, etc). */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidMoveException extends ChessException {
    public InvalidMoveException(String message) {
        super(message);
    }
}
