package com.lld.concurrency.h2o.model;

/**
 * Every meaningful thing that happens inside {@link H2OBonder} during a run.
 * Recorded in order by {@link TraceRecorder} so the frontend can replay a real
 * execution instead of animating a canned one.
 */
public enum EventType {
    /** A hydrogen thread is about to attempt {@code hydrogenSemaphore.acquire()}. */
    HYDROGEN_ATTEMPT,
    /** A hydrogen thread acquired its permit and is now waiting at the barrier. */
    HYDROGEN_ACQUIRED,
    /** A hydrogen thread returned from the barrier and released its permit. */
    HYDROGEN_DEPARTED,
    /** An oxygen thread is about to attempt {@code oxygenSemaphore.acquire()}. */
    OXYGEN_ATTEMPT,
    /** An oxygen thread acquired its permit and is now waiting at the barrier. */
    OXYGEN_ACQUIRED,
    /** An oxygen thread returned from the barrier and released its permit. */
    OXYGEN_DEPARTED,
    /** Exactly 2 hydrogen + 1 oxygen arrived at the barrier and bonded into one H2O molecule. */
    MOLECULE_BONDED
}
