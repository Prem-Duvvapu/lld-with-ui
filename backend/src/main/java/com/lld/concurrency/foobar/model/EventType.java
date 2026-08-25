package com.lld.concurrency.foobar.model;

/**
 * Every meaningful thing that happens inside {@link FooBarPrinter} during a run.
 *
 * <p>Recorded in order by {@link TraceRecorder} so the frontend can replay a real
 * execution instead of animating a canned one.
 */
public enum EventType {
    /** The foo thread is about to attempt {@code fooSemaphore.acquire()}. */
    FOO_ATTEMPT,
    /** The foo thread appended "foo" to the output after acquiring its permit. */
    FOO_PRINTED,
    /** The bar thread is about to attempt {@code barSemaphore.acquire()}. */
    BAR_ATTEMPT,
    /** The bar thread appended "bar" to the output after acquiring its permit. */
    BAR_PRINTED
}
