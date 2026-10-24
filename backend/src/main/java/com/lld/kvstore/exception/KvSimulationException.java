package com.lld.kvstore.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** The sandbox experiment did not complete; reset its partial state before continuing. */
@ResponseStatus(HttpStatus.CONFLICT)
public class KvSimulationException extends KvStoreException {
    public KvSimulationException(String message) { super(message); }
    public KvSimulationException(String message, Throwable cause) { super(message); initCause(cause); }
}
