package com.lld.splitwise.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class GroupNotFoundException extends SplitwiseException {
    public GroupNotFoundException(long groupId) {
        super("Splitwise group not found: " + groupId);
    }
}
