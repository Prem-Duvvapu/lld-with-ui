package com.lld.circuitbreaker;

import com.lld.circuitbreaker.clock.ManualClock;
import com.lld.circuitbreaker.exception.CircuitOpenException;
import com.lld.circuitbreaker.model.CallOutcome;
import com.lld.circuitbreaker.model.CircuitBreaker;
import com.lld.circuitbreaker.model.CircuitPhase;
import com.lld.circuitbreaker.strategy.ConsecutiveFailureTripPolicy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("CircuitBreaker — State machine transitions, driven by a deterministic ManualClock")
class CircuitBreakerTest {

    private ManualClock clock;
    private CircuitBreaker breaker;

    @BeforeEach
    void setUp() {
        clock = new ManualClock();
        breaker = new CircuitBreaker("test-service", new ConsecutiveFailureTripPolicy(3), 5_000L, 10, clock);
    }

    @Test
    @DisplayName("A fresh breaker starts CLOSED and allows calls")
    void freshBreakerStartsClosed() {
        assertEquals(CircuitPhase.CLOSED, breaker.getPhase());
        assertEquals(0, breaker.getConsecutiveFailures());
    }

    @Test
    @DisplayName("Failures below the threshold keep the breaker CLOSED")
    void failuresBelowThresholdStayClosed() {
        breaker.attemptCall(false);
        breaker.attemptCall(false);
        assertEquals(CircuitPhase.CLOSED, breaker.getPhase());
        assertEquals(2, breaker.getConsecutiveFailures());
    }

    @Test
    @DisplayName("A success resets the consecutive-failure count")
    void successResetsConsecutiveFailures() {
        breaker.attemptCall(false);
        breaker.attemptCall(false);
        breaker.attemptCall(true);
        assertEquals(0, breaker.getConsecutiveFailures());
        assertEquals(CircuitPhase.CLOSED, breaker.getPhase());
    }

    @Test
    @DisplayName("Reaching the threshold trips the breaker to OPEN")
    void reachingThresholdTripsToOpen() {
        breaker.attemptCall(false);
        breaker.attemptCall(false);
        CallOutcome outcome = breaker.attemptCall(false);

        assertEquals(CircuitPhase.OPEN, breaker.getPhase());
        assertEquals(CircuitPhase.OPEN, outcome.getPhase());
        assertTrue(outcome.isAttempted());
    }

    @Test
    @DisplayName("A call while OPEN is rejected without being attempted, and does not reset the cooldown")
    void callWhileOpenIsRejected() {
        breaker.attemptCall(false);
        breaker.attemptCall(false);
        breaker.attemptCall(false); // trips OPEN at clock=0

        clock.advanceMillis(1_000L);
        CircuitOpenException ex = assertThrows(CircuitOpenException.class, () -> breaker.attemptCall(true));
        assertTrue(ex.getMessage().contains("test-service"));
        assertEquals(CircuitPhase.OPEN, breaker.getPhase());
        assertEquals(1, breaker.getTotalRejections());
        // The cooldown must still be counted from the original trip, not reset by the rejection.
        assertEquals(4_000L, breaker.getRemainingCooldownMillis());
    }

    @Test
    @DisplayName("Once the cooldown elapses, the next call becomes the HALF_OPEN trial; success closes the circuit")
    void cooldownElapsedThenSuccessfulTrialCloses() {
        breaker.attemptCall(false);
        breaker.attemptCall(false);
        breaker.attemptCall(false); // OPEN at clock=0

        clock.advanceMillis(5_000L); // exactly the cooldown
        CallOutcome outcome = breaker.attemptCall(true);

        assertEquals(CircuitPhase.CLOSED, outcome.getPhase());
        assertEquals(CircuitPhase.CLOSED, breaker.getPhase());
        assertEquals(0, breaker.getConsecutiveFailures());
    }

    @Test
    @DisplayName("A failing HALF_OPEN trial reopens the breaker and restarts the cooldown")
    void failingTrialReopensAndRestartsCooldown() {
        breaker.attemptCall(false);
        breaker.attemptCall(false);
        breaker.attemptCall(false); // OPEN at clock=0

        clock.advanceMillis(5_000L);
        CallOutcome outcome = breaker.attemptCall(false); // the trial fails

        assertEquals(CircuitPhase.OPEN, outcome.getPhase());
        assertEquals(CircuitPhase.OPEN, breaker.getPhase());
        // Cooldown restarted from clock=5000, so the full 5s is remaining again, not 0.
        assertEquals(5_000L, breaker.getRemainingCooldownMillis());
    }

    @Test
    @DisplayName("A call before the cooldown elapses is rejected, even one millisecond short")
    void callJustBeforeCooldownElapsesIsRejected() {
        breaker.attemptCall(false);
        breaker.attemptCall(false);
        breaker.attemptCall(false); // OPEN at clock=0

        clock.advanceMillis(4_999L);
        assertThrows(CircuitOpenException.class, () -> breaker.attemptCall(true));
        assertEquals(CircuitPhase.OPEN, breaker.getPhase());
    }

    @Test
    @DisplayName("getRecentResults() is capped at the configured window capacity")
    void recentResultsCappedAtWindowCapacity() {
        CircuitBreaker capped = new CircuitBreaker("capped", new ConsecutiveFailureTripPolicy(100), 1_000L, 3, clock);
        capped.attemptCall(true);
        capped.attemptCall(false);
        capped.attemptCall(true);
        capped.attemptCall(false); // 4th push, capacity is 3

        assertEquals(3, capped.getRecentResults().size());
        assertEquals(java.util.List.of(false, true, false), capped.getRecentResults());
    }

    @Test
    @DisplayName("getFailureRate() reflects the recent-results window")
    void failureRateReflectsWindow() {
        breaker.attemptCall(true);
        breaker.attemptCall(false);
        breaker.attemptCall(true);
        breaker.attemptCall(false);
        assertEquals(0.5, breaker.getFailureRate(), 1e-9);
    }

    @Test
    @DisplayName("getRemainingCooldownMillis() is 0 while CLOSED")
    void remainingCooldownIsZeroWhileClosed() {
        assertEquals(0L, breaker.getRemainingCooldownMillis());
    }
}
