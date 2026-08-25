package com.lld.trafficsignal.exception;

import com.lld.config.DomainException;

/** Base of the traffic-signal domain exception hierarchy. Never thrown directly. */
public class TrafficSignalException extends DomainException {
    public TrafficSignalException(String message) {
        super(message);
    }
}
