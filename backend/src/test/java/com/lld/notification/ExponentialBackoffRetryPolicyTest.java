package com.lld.notification;

import com.lld.notification.retry.ExponentialBackoffRetryPolicy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Exponential Backoff Retry Policy")
class ExponentialBackoffRetryPolicyTest {

    @Test
    @DisplayName("shouldRetry allows exactly maxAttempts total attempts, then stops")
    void shouldRetryStopsAtMaxAttempts() {
        ExponentialBackoffRetryPolicy policy = new ExponentialBackoffRetryPolicy(3, Duration.ofMillis(100));

        assertTrue(policy.shouldRetry(1));
        assertTrue(policy.shouldRetry(2));
        assertFalse(policy.shouldRetry(3), "attempt 3 exhausts the budget for maxAttempts=3");
        assertFalse(policy.shouldRetry(4));
    }

    @Test
    @DisplayName("backoffFor doubles with each attempt: baseDelay * 2^attemptCount")
    void realExponentialSequence() {
        ExponentialBackoffRetryPolicy policy =
                new ExponentialBackoffRetryPolicy(5, Duration.ofMillis(100), Duration.ofSeconds(30));

        assertEquals(Duration.ofMillis(200), policy.backoffFor(1));
        assertEquals(Duration.ofMillis(400), policy.backoffFor(2));
        assertEquals(Duration.ofMillis(800), policy.backoffFor(3));
        assertEquals(Duration.ofMillis(1600), policy.backoffFor(4));
    }

    @Test
    @DisplayName("backoffFor is capped at maxDelay once the exponential sequence exceeds it")
    void backoffIsCapped() {
        ExponentialBackoffRetryPolicy policy =
                new ExponentialBackoffRetryPolicy(10, Duration.ofMillis(100), Duration.ofSeconds(2));

        // Uncapped attempt 5 would be 100ms * 2^5 = 3200ms, well past the 2000ms cap.
        assertEquals(Duration.ofMillis(2000), policy.backoffFor(5));
        assertEquals(Duration.ofMillis(2000), policy.backoffFor(9));
    }

    @Test
    @DisplayName("Not just a fixed retry count: successive delays are strictly increasing until the cap")
    void delaysStrictlyIncreaseUntilCapped() {
        ExponentialBackoffRetryPolicy policy =
                new ExponentialBackoffRetryPolicy(6, Duration.ofMillis(50), Duration.ofSeconds(10));

        long previous = -1;
        for (int attempt = 1; attempt <= 5; attempt++) {
            long millis = policy.backoffFor(attempt).toMillis();
            assertTrue(millis > previous, "attempt " + attempt + " (" + millis + "ms) did not increase from " + previous);
            previous = millis;
        }
    }

    @Test
    @DisplayName("Rejects a non-positive maxAttempts at construction")
    void rejectsInvalidMaxAttempts() {
        assertThrows(IllegalArgumentException.class,
                () -> new ExponentialBackoffRetryPolicy(0, Duration.ofMillis(100)));
    }

    @Test
    @DisplayName("Default constructor gives a usable demo policy")
    void defaultConstructorIsUsable() {
        ExponentialBackoffRetryPolicy policy = new ExponentialBackoffRetryPolicy();
        assertEquals(3, policy.getMaxAttempts());
        assertTrue(policy.backoffFor(1).toMillis() > 0);
    }
}
