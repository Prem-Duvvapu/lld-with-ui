package com.lld.minesweeper.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * The requested (row, col) is outside the board. Previously unvalidated: an out-of-range reveal
 * or flag threw a bare, unhandled {@code ArrayIndexOutOfBoundsException} (a 500) — see RCA.
 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidCellException extends MinesweeperException {
    public InvalidCellException(String message) {
        super(message);
    }
}
