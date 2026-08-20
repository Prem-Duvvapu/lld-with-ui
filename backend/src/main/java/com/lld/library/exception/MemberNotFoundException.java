package com.lld.library.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class MemberNotFoundException extends LibraryException {
    public MemberNotFoundException(String message) {
        super(message);
    }
}
