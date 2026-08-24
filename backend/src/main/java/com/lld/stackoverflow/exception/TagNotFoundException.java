package com.lld.stackoverflow.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** Thrown when a question is posted referencing a tag that was never registered. */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class TagNotFoundException extends StackOverflowException {
    public TagNotFoundException(String message) {
        super(message);
    }
}
