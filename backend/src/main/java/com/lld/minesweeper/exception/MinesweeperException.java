package com.lld.minesweeper.exception;

import com.lld.config.DomainException;

/**
 * Base for every Minesweeper domain failure. Abstract (never thrown directly) so it never needs
 * its own {@code @ResponseStatus} and never has to be added to
 * {@code DomainExceptionContractTest}'s {@code BASES} allowlist.
 */
public abstract class MinesweeperException extends DomainException {
    protected MinesweeperException(String message) {
        super(message);
    }
}
