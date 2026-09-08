package com.lld.coupon.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class CouponExpiredException extends CouponException {
    public CouponExpiredException(String message) {
        super(message);
    }
}
