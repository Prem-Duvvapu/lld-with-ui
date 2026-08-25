package com.lld.minesweeper.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** A reveal or flag was requested on a game that has already been won or lost. */
@ResponseStatus(HttpStatus.CONFLICT)
public class GameOverException extends MinesweeperException {
    public GameOverException(String message) {
        super(message);
    }
}
