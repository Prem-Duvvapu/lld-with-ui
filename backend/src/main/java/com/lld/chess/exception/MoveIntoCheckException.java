package com.lld.chess.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** The move is otherwise legal for the piece but would leave the mover's own king in check. */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class MoveIntoCheckException extends ChessException {
    public MoveIntoCheckException(String message) {
        super(message);
    }
}
