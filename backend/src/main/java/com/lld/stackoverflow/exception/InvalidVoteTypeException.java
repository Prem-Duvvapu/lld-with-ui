package com.lld.stackoverflow.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** The caller sent a vote-type string that is neither UPVOTE nor DOWNVOTE. */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidVoteTypeException extends StackOverflowException {
    public InvalidVoteTypeException(String message) {
        super(message);
    }
}
