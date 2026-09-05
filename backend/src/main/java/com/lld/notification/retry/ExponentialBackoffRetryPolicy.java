package com.lld.notification.retry;

import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Real exponential backoff: {@code backoffFor(attemptCount) = baseDelay * 2^attemptCount},
 * capped at {@code maxDelay} — not a fixed retry count with a flat delay. {@code shouldRetry}
 * allows up to {@code maxAttempts} total attempts (so with {@code maxAttempts = 3}, attempts 1
 * and 2 may retry; attempt 3 exhausts the budget and the notification moves to {@code FAILED}).
 */
@Component
public class ExponentialBackoffRetryPolicy implements RetryPolicy {
    private static final Duration DEFAULT_MAX_DELAY = Duration.ofSeconds(5);

    private final int maxAttempts;
    private final Duration baseDelay;
    private final Duration maxDelay;

    /** Spring-wired default: 3 attempts, 300ms base delay — small enough that a demo retry
     * sequence resolves in well under a second. */
    public ExponentialBackoffRetryPolicy() {
        this(3, Duration.ofMillis(300));
    }

    public ExponentialBackoffRetryPolicy(int maxAttempts, Duration baseDelay) {
        this(maxAttempts, baseDelay, DEFAULT_MAX_DELAY);
    }

    public ExponentialBackoffRetryPolicy(int maxAttempts, Duration baseDelay, Duration maxDelay) {
        if (maxAttempts < 1) {
            throw new IllegalArgumentException("maxAttempts must be >= 1");
        }
        this.maxAttempts = maxAttempts;
        this.baseDelay = baseDelay;
        this.maxDelay = maxDelay;
    }

    @Override
    public boolean shouldRetry(int attemptCount) {
        return attemptCount < maxAttempts;
    }

    @Override
    public Duration backoffFor(int attemptCount) {
        if (attemptCount < 0) {
            throw new IllegalArgumentException("attemptCount must be >= 0");
        }
        // Guard the shift against overflow for pathological input; any realistic attemptCount
        // (< 20) never gets near this cap before maxDelay itself caps the result below.
        int shiftExponent = Math.min(attemptCount, 32);
        long multiplier = 1L << shiftExponent;
        long millis = baseDelay.toMillis() * multiplier;
        if (millis < 0 || millis > maxDelay.toMillis()) {
            millis = maxDelay.toMillis();
        }
        return Duration.ofMillis(millis);
    }

    public int getMaxAttempts() {
        return maxAttempts;
    }
}
