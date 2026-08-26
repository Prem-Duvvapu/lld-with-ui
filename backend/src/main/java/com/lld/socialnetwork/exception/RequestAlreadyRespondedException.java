package com.lld.socialnetwork.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

import com.lld.socialnetwork.model.FriendRequest;

/** A friend request was already accepted or rejected — responding again is a conflict, not a 404/400. */
@ResponseStatus(HttpStatus.CONFLICT)
public class RequestAlreadyRespondedException extends SocialException {
    public RequestAlreadyRespondedException(long requestId, FriendRequest.Status status) {
        super("Friend request " + requestId + " was already " + status);
    }
}
