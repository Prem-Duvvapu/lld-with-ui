package com.lld.blackjack.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Shares its simple name with {@code restaurant.exception.TableNotFoundException} — harmless,
 * since exceptions are plain classes, not Spring beans, so RCA-059's bean-collision lesson does
 * not apply here.
 */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class TableNotFoundException extends BlackjackException {
    public TableNotFoundException(String message) {
        super(message);
    }
}
