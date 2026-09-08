package com.lld.payment.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.PAYMENT_REQUIRED)
public class FraudCheckFailedException extends PaymentException {
    public FraudCheckFailedException(String message) {
        super(message);
    }
}
