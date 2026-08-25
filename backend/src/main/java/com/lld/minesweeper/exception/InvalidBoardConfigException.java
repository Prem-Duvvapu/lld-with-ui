package com.lld.minesweeper.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Board dimensions or mine count are structurally invalid — rows/cols not positive, or
 * {@code mines >= rows * cols}. Previously unvalidated: a mine count at or above the cell count
 * spun the placement loop forever (an unhandled hang) since {@code placed < totalMines} could
 * never fail once every cell was a mine — see RCA.
 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidBoardConfigException extends MinesweeperException {
    public InvalidBoardConfigException(String message) {
        super(message);
    }
}
