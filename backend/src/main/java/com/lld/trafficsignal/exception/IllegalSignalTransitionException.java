package com.lld.trafficsignal.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when a requested phase change is not the one legal next phase for a light's current
 * state — e.g. asking a RED light to jump straight to YELLOW instead of GREEN. See
 * {@code com.lld.trafficsignal.state.SignalState} for the declared legal-transition table.
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class IllegalSignalTransitionException extends TrafficSignalException {
    public IllegalSignalTransitionException(String message) {
        super(message);
    }
}
