package com.lld.concurrency.zeroevenodd.model;

/**
 * Callback {@link ZeroEvenOddPrinter} invokes for every event worth recording,
 * right at the moment it happens on the thread it happened on. Kept as a tiny
 * functional interface so the primitive itself has zero knowledge of HTTP, JSON,
 * or how a run is orchestrated — it just narrates what genuinely happened.
 */
@FunctionalInterface
public interface TraceRecorder {

    /**
     * @param type  what happened
     * @param token the token involved ("0", or the number as a string), or
     *              {@code null} when not yet known (an attempt before acquiring)
     * @param n     the 1-based position in the 1..limit sequence this event
     *              belongs to
     */
    void record(EventType type, String token, int n);

    TraceRecorder NOOP = (type, token, n) -> { };
}
