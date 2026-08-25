package com.lld.concurrency.foobar.model;

import java.util.concurrent.Semaphore;

/**
 * A genuine two-thread strict-alternation primitive built from scratch on two
 * counting {@link Semaphore}s — the classic "Print FooBar Alternately" solution.
 *
 * <p>{@code fooSemaphore} starts with 1 permit (the foo thread goes first);
 * {@code barSemaphore} starts with 0 (the bar thread must wait). Each thread
 * acquires its own semaphore, does its work, then releases the OTHER thread's
 * semaphore — a strict ping-pong that makes interleaving corruption structurally
 * impossible: the bar thread can never acquire before the foo thread has released
 * it exactly once per repetition, and vice versa.
 *
 * <p>Every attempt and print is reported to a {@link TraceRecorder} immediately
 * before/after the semaphore operation that makes it true, so the reported
 * repetition number is always exactly what that thread observed.
 */
public final class FooBarPrinter {

    private final int n;
    private final Semaphore fooSemaphore = new Semaphore(1);
    private final Semaphore barSemaphore = new Semaphore(0);
    private final StringBuilder result = new StringBuilder();
    private final TraceRecorder recorder;

    public FooBarPrinter(int n) {
        this(n, TraceRecorder.NOOP);
    }

    public FooBarPrinter(int n, TraceRecorder recorder) {
        if (n <= 0) {
            throw new IllegalArgumentException("n must be positive, got " + n);
        }
        this.n = n;
        this.recorder = recorder == null ? TraceRecorder.NOOP : recorder;
    }

    /**
     * Prints "foo" exactly {@code n} times, each time waiting for its turn on
     * {@code fooSemaphore} and handing the turn to bar afterwards.
     */
    public void foo() throws InterruptedException {
        for (int i = 1; i <= n; i++) {
            recorder.record(EventType.FOO_ATTEMPT, "foo", i);
            fooSemaphore.acquire();
            append("foo");
            recorder.record(EventType.FOO_PRINTED, "foo", i);
            barSemaphore.release();
        }
    }

    /**
     * Prints "bar" exactly {@code n} times, each time waiting for its turn on
     * {@code barSemaphore} and handing the turn back to foo afterwards.
     */
    public void bar() throws InterruptedException {
        for (int i = 1; i <= n; i++) {
            recorder.record(EventType.BAR_ATTEMPT, "bar", i);
            barSemaphore.acquire();
            append("bar");
            recorder.record(EventType.BAR_PRINTED, "bar", i);
            fooSemaphore.release();
        }
    }

    private synchronized void append(String token) {
        result.append(token);
    }

    /** The fully assembled output once both threads have finished. */
    public String getResult() {
        return result.toString();
    }

    public int getN() {
        return n;
    }
}
