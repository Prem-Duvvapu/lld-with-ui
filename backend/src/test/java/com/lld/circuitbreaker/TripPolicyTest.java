package com.lld.circuitbreaker;

import com.lld.circuitbreaker.clock.ManualClock;
import com.lld.circuitbreaker.model.CircuitBreaker;
import com.lld.circuitbreaker.strategy.ConsecutiveFailureTripPolicy;
import com.lld.circuitbreaker.strategy.FailureRateTripPolicy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("TripPolicy implementations — Strategy pattern for 'when should CLOSED trip to OPEN'")
class TripPolicyTest {

    @Test
    @DisplayName("ConsecutiveFailureTripPolicy rejects a non-positive threshold")
    void consecutiveFailureRejectsInvalidThreshold() {
        assertThrows(IllegalArgumentException.class, () -> new ConsecutiveFailureTripPolicy(0));
        assertThrows(IllegalArgumentException.class, () -> new ConsecutiveFailureTripPolicy(-1));
    }

    @Test
    @DisplayName("ConsecutiveFailureTripPolicy trips exactly at the threshold, not before")
    void consecutiveFailureTripsExactlyAtThreshold() {
        ManualClock clock = new ManualClock();
        CircuitBreaker breaker = new CircuitBreaker("svc", new ConsecutiveFailureTripPolicy(2), 1_000L, 10, clock);

        breaker.attemptCall(false);
        assertEquals(com.lld.circuitbreaker.model.CircuitPhase.CLOSED, breaker.getPhase());

        breaker.attemptCall(false);
        assertEquals(com.lld.circuitbreaker.model.CircuitPhase.OPEN, breaker.getPhase());
    }

    @Test
    @DisplayName("ConsecutiveFailureTripPolicy.describe() is human-readable")
    void consecutiveFailureDescribe() {
        assertEquals("3 consecutive failures", new ConsecutiveFailureTripPolicy(3).describe());
    }

    @Test
    @DisplayName("FailureRateTripPolicy rejects an out-of-range rate or non-positive minCalls")
    void failureRateRejectsInvalidArgs() {
        assertThrows(IllegalArgumentException.class, () -> new FailureRateTripPolicy(0, 1));
        assertThrows(IllegalArgumentException.class, () -> new FailureRateTripPolicy(1.5, 1));
        assertThrows(IllegalArgumentException.class, () -> new FailureRateTripPolicy(0.5, 0));
    }

    @Test
    @DisplayName("FailureRateTripPolicy does not trip before minCallsInWindow calls have landed, even at 100% failure")
    void failureRateWaitsForMinCalls() {
        ManualClock clock = new ManualClock();
        CircuitBreaker breaker = new CircuitBreaker("svc", new FailureRateTripPolicy(0.5, 4), 1_000L, 10, clock);

        breaker.attemptCall(false);
        breaker.attemptCall(false);
        breaker.attemptCall(false); // 3 failures, 100% rate, but below minCallsInWindow=4

        assertEquals(com.lld.circuitbreaker.model.CircuitPhase.CLOSED, breaker.getPhase());
    }

    @Test
    @DisplayName("FailureRateTripPolicy trips once the rate threshold is reached with enough calls in the window")
    void failureRateTripsOnceThresholdReachedWithEnoughCalls() {
        ManualClock clock = new ManualClock();
        CircuitBreaker breaker = new CircuitBreaker("svc", new FailureRateTripPolicy(0.5, 4), 1_000L, 10, clock);

        breaker.attemptCall(true);
        breaker.attemptCall(false);
        breaker.attemptCall(true);
        breaker.attemptCall(false); // 4 calls, 50% failure rate, meets threshold

        assertEquals(com.lld.circuitbreaker.model.CircuitPhase.OPEN, breaker.getPhase());
    }

    @Test
    @DisplayName("FailureRateTripPolicy.describe() is human-readable")
    void failureRateDescribe() {
        String description = new FailureRateTripPolicy(0.5, 4).describe();
        assertTrue(description.contains("50%"));
        assertTrue(description.contains("4"));
    }
}
