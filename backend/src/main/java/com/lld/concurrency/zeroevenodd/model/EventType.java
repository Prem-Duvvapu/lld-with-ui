package com.lld.concurrency.zeroevenodd.model;

/**
 * Every meaningful thing that happens inside {@link ZeroEvenOddPrinter} during a
 * run. Recorded in order by {@link TraceRecorder} so the frontend can replay a
 * real execution instead of animating a canned one.
 */
public enum EventType {
    /** The zero thread is about to attempt {@code zeroSemaphore.acquire()}. */
    ZERO_ATTEMPT,
    /** The zero thread appended "0" and dispatched to the odd or even thread. */
    ZERO_PRINTED,
    /** The odd thread is about to attempt {@code oddSemaphore.acquire()}. */
    ODD_ATTEMPT,
    /** The odd thread appended its number after acquiring its permit. */
    ODD_PRINTED,
    /** The even thread is about to attempt {@code evenSemaphore.acquire()}. */
    EVEN_ATTEMPT,
    /** The even thread appended its number after acquiring its permit. */
    EVEN_PRINTED
}
