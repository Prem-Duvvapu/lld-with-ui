package com.lld.snakeladders.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * A game was requested with fewer than 2 or more than 4 players. Previously unvalidated: a 5th
 * name silently blew up {@code List.subList} with an unhandled {@code IndexOutOfBoundsException}
 * (a bare 500) since only 4 token colors exist — see RCA for the fix.
 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidPlayerCountException extends SnakeLaddersException {
    public InvalidPlayerCountException(String message) {
        super(message);
    }
}
