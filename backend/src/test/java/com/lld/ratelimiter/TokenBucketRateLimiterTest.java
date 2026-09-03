package com.lld.ratelimiter;

import com.lld.ratelimiter.model.ClientConfig;
import com.lld.ratelimiter.model.RateLimitAlgorithm;
import com.lld.ratelimiter.model.RateLimitDecision;
import com.lld.ratelimiter.strategy.RateLimiter;
import com.lld.ratelimiter.strategy.TokenBucketRateLimiter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("TokenBucketRateLimiter — capacity cap, continuous refill, deterministic virtual clock")
class TokenBucketRateLimiterTest {

    private RateLimiter newBucket(int capacity, double refillPerSecond, long start) {
        ClientConfig config = ClientConfig.builder()
                .algorithm(RateLimitAlgorithm.TOKEN_BUCKET)
                .capacityOrLimit(capacity)
                .refillPerSecondOrWindowSeconds(refillPerSecond)
                .build();
        return new TokenBucketRateLimiter(config, start);
    }

    @Test
    @DisplayName("Bucket starts full: capacity consecutive requests are all allowed")
    void bucketStartsFull() {
        RateLimiter limiter = newBucket(3, 1.0, 0L);
        for (int i = 0; i < 3; i++) {
            assertTrue(limiter.tryAcquire(0L).isAllowed(), "request " + i + " should be allowed");
        }
    }

    @Test
    @DisplayName("The request beyond capacity is denied, with zero remaining")
    void requestBeyondCapacityIsDenied() {
        RateLimiter limiter = newBucket(2, 1.0, 0L);
        limiter.tryAcquire(0L);
        limiter.tryAcquire(0L);
        RateLimitDecision decision = limiter.tryAcquire(0L);
        assertFalse(decision.isAllowed());
        assertEquals(0, decision.getRemaining());
    }

    @Test
    @DisplayName("Tokens refill continuously: after enough elapsed time, a denied bucket allows again")
    void bucketRefillsOverTime() {
        RateLimiter limiter = newBucket(1, 1.0, 0L); // 1 token, refills 1/sec
        assertTrue(limiter.tryAcquire(0L).isAllowed());
        assertFalse(limiter.tryAcquire(0L).isAllowed(), "no time has passed — still empty");

        assertTrue(limiter.tryAcquire(1000L).isAllowed(), "1 full second elapsed — exactly one token refilled");
    }

    @Test
    @DisplayName("Refill never exceeds capacity, even after a very long idle period")
    void refillIsCappedAtCapacity() {
        RateLimiter limiter = newBucket(2, 5.0, 0L);
        limiter.tryAcquire(0L);
        limiter.tryAcquire(0L);
        // A huge amount of time passes — refill must cap at capacity, not overflow.
        RateLimitDecision peek = limiter.peek(1_000_000L);
        assertEquals(2, peek.getRemaining());
    }

    @Test
    @DisplayName("peek() never mutates state — repeated peeks report the same remaining count")
    void peekDoesNotConsume() {
        RateLimiter limiter = newBucket(3, 1.0, 0L);
        limiter.peek(0L);
        limiter.peek(0L);
        RateLimitDecision decision = limiter.tryAcquire(0L);
        assertTrue(decision.isAllowed());
        assertEquals(2, decision.getRemaining(), "peeking twice must not have consumed any tokens");
    }

    @Test
    @DisplayName("totalAllowed/totalDenied track real outcomes")
    void countersTrackOutcomes() {
        RateLimiter limiter = newBucket(1, 1.0, 0L);
        limiter.tryAcquire(0L); // allowed
        limiter.tryAcquire(0L); // denied
        assertEquals(1, limiter.getTotalAllowed());
        assertEquals(1, limiter.getTotalDenied());
    }
}
