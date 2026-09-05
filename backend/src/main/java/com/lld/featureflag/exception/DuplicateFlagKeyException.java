package com.lld.featureflag.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class DuplicateFlagKeyException extends FeatureFlagException {
    public DuplicateFlagKeyException(String message) {
        super(message);
    }
}
