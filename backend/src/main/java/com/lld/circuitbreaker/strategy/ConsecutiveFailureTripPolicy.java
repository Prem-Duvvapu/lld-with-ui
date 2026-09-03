package com.lld.circuitbreaker.strategy;

import com.lld.circuitbreaker.model.CircuitBreaker;
import lombok.Getter;

/** Trips once {@code threshold} calls have failed in a row, with no intervening success. */
@Getter
public class ConsecutiveFailureTripPolicy implements TripPolicy {
    private final int threshold;

    public ConsecutiveFailureTripPolicy(int threshold) {
        if (threshold < 1) {
            throw new IllegalArgumentException("threshold must be at least 1");
        }
        this.threshold = threshold;
    }

    @Override
    public boolean shouldTrip(CircuitBreaker breaker) {
        return breaker.getConsecutiveFailures() >= threshold;
    }

    @Override
    public String describe() {
        return threshold + " consecutive failures";
    }
}
