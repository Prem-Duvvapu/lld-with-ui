package com.lld.zomato.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidDeliveryOtpException extends ZomatoException {
    public InvalidDeliveryOtpException() {
        super("Invalid delivery OTP. Please verify with customer.");
    }
}
