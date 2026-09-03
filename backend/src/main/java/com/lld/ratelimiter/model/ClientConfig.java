package com.lld.ratelimiter.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A client's rate-limit policy: which {@link RateLimitAlgorithm} it uses, plus the two numbers
 * that algorithm needs. {@code capacityOrLimit} is the token bucket's capacity (also its refill
 * cap) for {@link RateLimitAlgorithm#TOKEN_BUCKET}, or the permitted request count per window for
 * {@link RateLimitAlgorithm#SLIDING_WINDOW_COUNTER}. {@code refillPerSecondOrWindowSeconds} is the
 * bucket's refill rate (tokens/second) or the window's length in seconds, respectively.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClientConfig {
    private RateLimitAlgorithm algorithm;
    private int capacityOrLimit;
    private double refillPerSecondOrWindowSeconds;
}
