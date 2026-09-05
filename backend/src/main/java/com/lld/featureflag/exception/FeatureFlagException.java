package com.lld.featureflag.exception;

import com.lld.config.DomainException;

/** Base of this module's exception hierarchy. */
public class FeatureFlagException extends DomainException {
    public FeatureFlagException(String message) {
        super(message);
    }
}
