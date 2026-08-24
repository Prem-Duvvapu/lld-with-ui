package com.lld.stackoverflow.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** A user may not vote on their own question or answer. */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class SelfVoteException extends StackOverflowException {
    public SelfVoteException(String message) {
        super(message);
    }
}
