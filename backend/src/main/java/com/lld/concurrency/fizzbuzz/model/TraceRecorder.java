package com.lld.concurrency.fizzbuzz.model;

/**
 * Callback {@link FizzBuzzPrinter} invokes, still holding its lock, for every
 * event worth recording. Kept as a tiny functional interface so the primitive
 * itself has zero knowledge of HTTP, JSON, or how a run is orchestrated — it
 * just narrates what genuinely happened, on the thread it happened on.
 */
@FunctionalInterface
public interface TraceRecorder {

    /**
     * @param type  what happened
     * @param token the token printed ("Fizz"/"Buzz"/"FizzBuzz"/the number as a
     *              string), or {@code null} for an attempt that has not yet
     *              resolved
     * @param n     the number in 1..limit this event concerns
     */
    void record(EventType type, String token, int n);

    TraceRecorder NOOP = (type, token, n) -> { };
}
