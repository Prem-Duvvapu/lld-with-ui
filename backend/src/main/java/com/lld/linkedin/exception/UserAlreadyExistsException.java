package com.lld.linkedin.exception;

public class UserAlreadyExistsException extends LinkedInException {
    public UserAlreadyExistsException(String message) {
        super(message);
    }
}
