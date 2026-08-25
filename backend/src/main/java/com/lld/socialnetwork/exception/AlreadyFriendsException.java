package com.lld.socialnetwork.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class AlreadyFriendsException extends SocialException {
    public AlreadyFriendsException(long userId1, long userId2) {
        super("Users " + userId1 + " and " + userId2 + " are already friends");
    }
}
