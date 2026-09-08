package com.lld.workflow.exception;

import com.lld.config.DomainException;

/**
 * Abstract — matches {@code blackjack.exception.BlackjackException}'s precedent, so the base
 * class needs no {@code @ResponseStatus} of its own and never has to be added to
 * {@code DomainExceptionContractTest}'s hardcoded {@code BASES} allowlist.
 */
public abstract class WorkflowException extends DomainException {
    protected WorkflowException(String message) {
        super(message);
    }
}
