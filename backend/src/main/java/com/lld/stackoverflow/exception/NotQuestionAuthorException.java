package com.lld.stackoverflow.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** Only the question's author may accept an answer or close the question. */
@ResponseStatus(HttpStatus.FORBIDDEN)
public class NotQuestionAuthorException extends StackOverflowException {
    public NotQuestionAuthorException(String message) {
        super(message);
    }
}
