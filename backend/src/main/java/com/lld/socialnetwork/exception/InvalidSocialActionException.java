package com.lld.socialnetwork.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** Catch-all validation failure: blank content, self-friend-request, malformed input. */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidSocialActionException extends SocialException {
    public InvalidSocialActionException(String message) {
        super(message);
    }
}
