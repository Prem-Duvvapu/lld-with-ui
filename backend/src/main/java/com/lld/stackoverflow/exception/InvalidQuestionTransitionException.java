package com.lld.stackoverflow.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** e.g. closing a question that is already closed. */
@ResponseStatus(HttpStatus.CONFLICT)
public class InvalidQuestionTransitionException extends StackOverflowException {
    public InvalidQuestionTransitionException(String message) {
        super(message);
    }
}
