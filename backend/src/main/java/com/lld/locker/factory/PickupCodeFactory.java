package com.lld.locker.factory;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.Set;

/**
 * Generates 6-digit numeric pickup codes, guaranteed unique against whatever set of codes is
 * currently active (every {@code AWAITING_PICKUP} package's code) at generation time — a stale
 * or already-consumed code is fine to reuse, an active one is not.
 */
@Component
public class PickupCodeFactory {

    private final SecureRandom random = new SecureRandom();

    public String generate(Set<String> activeCodes) {
        String code;
        do {
            code = String.format("%06d", random.nextInt(1_000_000));
        } while (activeCodes.contains(code));
        return code;
    }
}
