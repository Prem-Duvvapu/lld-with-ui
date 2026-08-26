package com.lld.socialnetwork.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class UserNotFoundException extends SocialException {
    public UserNotFoundException(long userId) {
        super("User not found: " + userId);
    }
}
