package com.lld.coupon.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** 409, not 400 — the request was well-formed, the coupon simply ran out of redemptions. */
@ResponseStatus(HttpStatus.CONFLICT)
public class RedemptionLimitExceededException extends CouponException {
    public RedemptionLimitExceededException(String message) {
        super(message);
    }
}
