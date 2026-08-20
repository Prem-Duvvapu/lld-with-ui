package com.lld.uber.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class OtpVerificationException extends UberException {
    public OtpVerificationException(String message) {
        super(message);
    }
}
