package com.lld.circuitbreaker.clock;

import java.util.concurrent.atomic.AtomicLong;

/**
 * A controllable {@link Clock}: time only moves when {@link #advanceMillis(long)} is called.
 * Backs deterministic cooldown tests and the isolated {@code /sim/*} engine — a demo step can
 * jump the clock past a breaker's cooldown instantly instead of a test sleeping for real
 * milliseconds.
 */
public class ManualClock implements Clock {
    private final AtomicLong currentMillis;

    public ManualClock() {
        this(0L);
    }

    public ManualClock(long startMillis) {
        this.currentMillis = new AtomicLong(startMillis);
    }

    @Override
    public long millis() {
        return currentMillis.get();
    }

    public void advanceMillis(long delta) {
        if (delta < 0) {
            throw new IllegalArgumentException("delta must not be negative");
        }
        currentMillis.addAndGet(delta);
    }
}
