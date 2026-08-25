package com.lld.tictactoe.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** The target cell is already occupied by a symbol — a game-rule violation, not bad input. */
@ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
public class CellOccupiedException extends TicTacToeException {
    public CellOccupiedException(String message) {
        super(message);
    }
}
