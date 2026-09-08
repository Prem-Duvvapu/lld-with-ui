package com.lld.payment.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidRefundException extends PaymentException {
    public InvalidRefundException(String message) {
        super(message);
    }
}
