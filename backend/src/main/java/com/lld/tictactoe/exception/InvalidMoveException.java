package com.lld.tictactoe.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** The requested (row, col) is outside the board, or otherwise structurally invalid. */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidMoveException extends TicTacToeException {
    public InvalidMoveException(String message) {
        super(message);
    }
}
