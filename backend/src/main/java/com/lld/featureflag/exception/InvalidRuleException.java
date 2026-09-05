package com.lld.featureflag.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidRuleException extends FeatureFlagException {
    public InvalidRuleException(String message) {
        super(message);
    }
}
