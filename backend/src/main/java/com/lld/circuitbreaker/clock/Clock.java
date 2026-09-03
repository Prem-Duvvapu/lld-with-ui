package com.lld.circuitbreaker.clock;

/**
 * Abstraction over "the current time", used only to measure how long a breaker has been OPEN
 * against its cooldown. Same purpose as {@code trafficsignal.clock.SignalTicker}: production
 * wiring uses {@link SystemClock}; tests and the isolated {@code /sim/*} sandbox use
 * {@link ManualClock} so a cooldown-elapsed assertion never has to sleep for a real duration.
 */
public interface Clock {
    long millis();
}
