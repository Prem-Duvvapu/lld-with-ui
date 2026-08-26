package com.lld.socialnetwork.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class DuplicateFriendRequestException extends SocialException {
    public DuplicateFriendRequestException(long fromUserId, long toUserId) {
        super("A pending friend request already exists between " + fromUserId + " and " + toUserId);
    }
}
