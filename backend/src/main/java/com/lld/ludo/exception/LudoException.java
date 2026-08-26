package com.lld.ludo.exception;

import com.lld.config.DomainException;

/**
 * Base for every Ludo domain failure. Abstract (never thrown directly) so it never needs its own
 * {@code @ResponseStatus} and never has to be added to {@code DomainExceptionContractTest}'s
 * {@code BASES} allowlist — same shape as {@code SnakeLaddersException}/{@code TaskException}.
 */
public abstract class LudoException extends DomainException {
    protected LudoException(String message) {
        super(message);
    }
}
