package com.lld.tictactoe.exception;

import com.lld.config.DomainException;

/**
 * Base for every Tic-Tac-Toe domain failure. Abstract (never thrown directly) so it never
 * needs its own {@code @ResponseStatus} and never has to be added to
 * {@code DomainExceptionContractTest}'s {@code BASES} allowlist — every concrete subclass below
 * carries its own status instead.
 */
public abstract class TicTacToeException extends DomainException {
    protected TicTacToeException(String message) {
        super(message);
    }
}
