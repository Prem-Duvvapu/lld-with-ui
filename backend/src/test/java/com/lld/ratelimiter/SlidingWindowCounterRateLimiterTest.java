package com.lld.ratelimiter;

import com.lld.ratelimiter.model.ClientConfig;
import com.lld.ratelimiter.model.RateLimitAlgorithm;
import com.lld.ratelimiter.model.RateLimitDecision;
import com.lld.ratelimiter.strategy.RateLimiter;
import com.lld.ratelimiter.strategy.SlidingWindowCounterRateLimiter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("SlidingWindowCounterRateLimiter — weighted current+previous window estimate")
class SlidingWindowCounterRateLimiterTest {

    /** windowSeconds is passed via refillPerSecondOrWindowSeconds, per ClientConfig's shared field. */
    private RateLimiter newLimiter(int limit, double windowSeconds, long start) {
        ClientConfig config = ClientConfig.builder()
                .algorithm(RateLimitAlgorithm.SLIDING_WINDOW_COUNTER)
                .capacityOrLimit(limit)
                .refillPerSecondOrWindowSeconds(windowSeconds)
                .build();
        return new SlidingWindowCounterRateLimiter(config, start);
    }

    @Test
    @DisplayName("limit consecutive requests within one window are all allowed")
    void allowsUpToLimitWithinWindow() {
        RateLimiter limiter = newLimiter(3, 10.0, 0L);
        for (int i = 0; i < 3; i++) {
            assertTrue(limiter.tryAcquire(0L).isAllowed(), "request " + i + " should be allowed");
        }
    }

    @Test
    @DisplayName("The request beyond the limit within the same window is denied")
    void deniesBeyondLimitInSameWindow() {
        RateLimiter limiter = newLimiter(2, 10.0, 0L);
        limiter.tryAcquire(0L);
        limiter.tryAcquire(0L);
        assertFalse(limiter.tryAcquire(0L).isAllowed());
    }

    @Test
    @DisplayName("A fully elapsed previous window's weight decays to zero, freeing up the limit")
    void previousWindowWeightDecaysToZero() {
        // 10-second window, limit 2. Fill the window completely.
        RateLimiter limiter = newLimiter(2, 10.0, 0L);
        limiter.tryAcquire(0L);
        limiter.tryAcquire(0L);
        assertFalse(limiter.tryAcquire(0L).isAllowed());

        // Jump exactly 2 full windows ahead: previous window's weight must be zero, current is fresh.
        RateLimitDecision decision = limiter.tryAcquire(20_000L);
        assertTrue(decision.isAllowed(), "two full windows elapsed — no carried-over weight should remain");
    }

    @Test
    @DisplayName("Just after a window boundary, the previous window's decaying weight still limits an immediate burst")
    void justAfterBoundaryPreviousWindowStillLimitsImmediateBurst() {
        RateLimiter limiter = newLimiter(2, 10.0, 0L);
        limiter.tryAcquire(0L);
        limiter.tryAcquire(0L); // window is now full (count=2)

        // 1ms into the next window: previous window's weight is ~0.9999, so a lone new request's
        // estimate (~1.9998) sits just under the limit and is allowed, but an immediate second
        // request pushes the weighted estimate over the limit — the decayed-but-still-heavy
        // previous window is doing real suppression, not just resetting the count to zero.
        assertTrue(limiter.tryAcquire(10_001L).isAllowed(), "estimate is just under the limit right at rollover");
        assertFalse(limiter.tryAcquire(10_001L).isAllowed(), "a second immediate request pushes the weighted estimate over the limit");
    }

    @Test
    @DisplayName("peek() never mutates state — repeated peeks report the same remaining count")
    void peekDoesNotConsume() {
        RateLimiter limiter = newLimiter(3, 10.0, 0L);
        limiter.peek(0L);
        limiter.peek(0L);
        RateLimitDecision decision = limiter.tryAcquire(0L);
        assertTrue(decision.isAllowed());
        assertEquals(2, decision.getRemaining(), "peeking twice must not have consumed any quota");
    }
}
