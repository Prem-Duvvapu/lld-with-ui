package com.lld.minesweeper.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** No game exists for the given id. */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class GameNotFoundException extends MinesweeperException {
    public GameNotFoundException(String message) {
        super(message);
    }
}
