package com.lld.circuitbreaker.clock;

/** Real wall-clock time. What every live (non-simulation) {@code CircuitBreaker} is built with. */
public class SystemClock implements Clock {
    @Override
    public long millis() {
        return System.currentTimeMillis();
    }
}
