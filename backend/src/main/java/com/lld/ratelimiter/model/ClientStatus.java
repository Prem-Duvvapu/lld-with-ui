package com.lld.ratelimiter.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** A read-only snapshot of one client's current limiter state — the {@code GET /status} shape. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClientStatus {
    private String clientId;
    private RateLimitAlgorithm algorithm;
    private int capacityOrLimit;
    private double refillPerSecondOrWindowSeconds;
    private long remaining;
    private long resetEpochMillis;
    private long totalAllowed;
    private long totalDenied;
}
