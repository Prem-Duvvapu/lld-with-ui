package com.lld.stackoverflow.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** A closed question no longer accepts new answers or an accepted-answer change. */
@ResponseStatus(HttpStatus.CONFLICT)
public class QuestionClosedException extends StackOverflowException {
    public QuestionClosedException(String message) {
        super(message);
    }
}
