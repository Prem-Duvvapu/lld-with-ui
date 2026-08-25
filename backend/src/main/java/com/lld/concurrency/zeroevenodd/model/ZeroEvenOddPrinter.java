package com.lld.concurrency.zeroevenodd.model;

import java.util.concurrent.Semaphore;

/**
 * A genuine three-thread coordination primitive built from scratch on three
 * counting {@link Semaphore}s — the classic "Print Zero Even Odd" solution.
 *
 * <p>{@code zeroSemaphore} starts with 1 permit (the zero thread always goes
 * first for every number); {@code oddSemaphore} and {@code evenSemaphore} both
 * start at 0. The zero thread prints "0", then releases exactly one of
 * oddSemaphore/evenSemaphore depending on the parity of the number about to be
 * printed. Whichever thread it released prints its number and hands control back
 * to zeroSemaphore. This produces the exact interleave 0 1 0 2 0 3 0 4 ... up to
 * {@code n}, with zero structurally guaranteed to precede every number.
 *
 * <p>Every attempt and print is reported to a {@link TraceRecorder} immediately
 * before/after the semaphore operation that makes it true.
 */
public final class ZeroEvenOddPrinter {

    private final int n;
    private final Semaphore zeroSemaphore = new Semaphore(1);
    private final Semaphore oddSemaphore = new Semaphore(0);
    private final Semaphore evenSemaphore = new Semaphore(0);
    private final StringBuilder result = new StringBuilder();
    private final TraceRecorder recorder;

    public ZeroEvenOddPrinter(int n) {
        this(n, TraceRecorder.NOOP);
    }

    public ZeroEvenOddPrinter(int n, TraceRecorder recorder) {
        if (n <= 0) {
            throw new IllegalArgumentException("n must be positive, got " + n);
        }
        this.n = n;
        this.recorder = recorder == null ? TraceRecorder.NOOP : recorder;
    }

    /** Prints "0" once per number from 1..n, dispatching to odd or even each time. */
    public void zero() throws InterruptedException {
        for (int i = 1; i <= n; i++) {
            recorder.record(EventType.ZERO_ATTEMPT, "0", i);
            zeroSemaphore.acquire();
            append("0");
            recorder.record(EventType.ZERO_PRINTED, "0", i);
            if (i % 2 == 1) {
                oddSemaphore.release();
            } else {
                evenSemaphore.release();
            }
        }
    }

    /** Prints every odd number from 1..n, in order, each time zero hands it a turn. */
    public void odd() throws InterruptedException {
        for (int i = 1; i <= n; i += 2) {
            recorder.record(EventType.ODD_ATTEMPT, String.valueOf(i), i);
            oddSemaphore.acquire();
            append(String.valueOf(i));
            recorder.record(EventType.ODD_PRINTED, String.valueOf(i), i);
            zeroSemaphore.release();
        }
    }

    /** Prints every even number from 1..n, in order, each time zero hands it a turn. */
    public void even() throws InterruptedException {
        for (int i = 2; i <= n; i += 2) {
            recorder.record(EventType.EVEN_ATTEMPT, String.valueOf(i), i);
            evenSemaphore.acquire();
            append(String.valueOf(i));
            recorder.record(EventType.EVEN_PRINTED, String.valueOf(i), i);
            zeroSemaphore.release();
        }
    }

    private synchronized void append(String token) {
        if (result.length() > 0) {
            result.append(' ');
        }
        result.append(token);
    }

    /** The fully assembled space-separated output once all three threads finish. */
    public String getResult() {
        return result.toString();
    }

    public int getN() {
        return n;
    }
}
