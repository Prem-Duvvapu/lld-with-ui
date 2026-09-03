package com.lld.circuitbreaker.strategy;

import com.lld.circuitbreaker.model.CircuitBreaker;
import lombok.Getter;

import java.util.List;

/**
 * Trips once the failure rate over the breaker's rolling result window reaches
 * {@code failureRateThreshold}, but only once at least {@code minCallsInWindow} calls have landed
 * in that window — otherwise one early failure out of one call would read as a 100% rate and trip
 * instantly.
 */
@Getter
public class FailureRateTripPolicy implements TripPolicy {
    private final double failureRateThreshold;
    private final int minCallsInWindow;

    public FailureRateTripPolicy(double failureRateThreshold, int minCallsInWindow) {
        if (failureRateThreshold <= 0 || failureRateThreshold > 1) {
            throw new IllegalArgumentException("failureRateThreshold must be in (0, 1]");
        }
        if (minCallsInWindow < 1) {
            throw new IllegalArgumentException("minCallsInWindow must be at least 1");
        }
        this.failureRateThreshold = failureRateThreshold;
        this.minCallsInWindow = minCallsInWindow;
    }

    @Override
    public boolean shouldTrip(CircuitBreaker breaker) {
        List<Boolean> window = breaker.getRecentResults();
        if (window.size() < minCallsInWindow) {
            return false;
        }
        long failures = window.stream().filter(success -> !success).count();
        double rate = (double) failures / window.size();
        return rate >= failureRateThreshold;
    }

    @Override
    public String describe() {
        return String.format("failure rate >= %.0f%% over the last %d+ calls", failureRateThreshold * 100, minCallsInWindow);
    }
}
