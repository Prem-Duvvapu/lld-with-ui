package com.lld.kvstore.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidKvRequestException extends KvStoreException {
    public InvalidKvRequestException(String message) {
        super(message);
    }
}
