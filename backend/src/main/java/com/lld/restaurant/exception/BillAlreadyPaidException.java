package com.lld.restaurant.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class BillAlreadyPaidException extends RestaurantException {
    public BillAlreadyPaidException(String message) {
        super(message);
    }
}
