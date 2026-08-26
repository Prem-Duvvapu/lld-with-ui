package com.lld.ludo.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * A requested move (or roll) breaks a Ludo rule — a token still HOME moved without a 6, a
 * FINISHED token asked to move again, a token index out of range, a start/landing square blocked
 * by the mover's own token, a home-entry roll that overshoots the exact count needed, or rolling
 * again before the current roll has been spent. The board is left completely unchanged; the
 * player keeps the same die value and may retry with a different token.
 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidMoveException extends LudoException {
    public InvalidMoveException(String message) {
        super(message);
    }
}
