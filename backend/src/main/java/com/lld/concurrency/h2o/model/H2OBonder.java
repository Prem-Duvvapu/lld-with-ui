package com.lld.concurrency.h2o.model;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.BrokenBarrierException;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * A genuine hydrogen/oxygen bonding primitive built from scratch on two
 * {@link Semaphore}s and one {@link CyclicBarrier} — the classic "Building H2O"
 * solution, extended with a deterministic barrier action so that the recorded
 * output is provably free of any 3-in-a-row same-atom run, not just
 * "correct on average."
 *
 * <p>{@code hydrogenSemaphore} has exactly 2 permits and {@code oxygenSemaphore}
 * exactly 1 — the full system-wide supply, matching one water molecule's
 * composition. A thread must acquire its permit before it can even reach the
 * barrier, so at most 3 threads (bounded by the permit supply) can ever be
 * "in flight" between acquiring and bonding at once. Because the barrier requires
 * exactly 3 arrivals to trip, and the permit caps make it structurally impossible
 * for those 3 to be anything other than 2 hydrogen + 1 oxygen (there are never
 * more than 2 H permits or more than 1 O permit outstanding), every trip is
 * necessarily one full water molecule's worth of atoms — never 3 of the same
 * element.
 *
 * <p>The barrier's action runs exactly once per trip, on the thread that
 * completes the trio, and — per {@link CyclicBarrier}'s contract — runs to
 * completion <em>before any of the 3 waiting threads are released</em>. That
 * makes the action the single place the "H", "O", "H" tokens are appended: no
 * two trios can ever interleave their appends, and appending a fixed canonical
 * order (H, O, H) per trio means no run of 3 identical atoms can ever appear
 * anywhere in the output, including across a trio boundary (each trio starts and
 * ends with H, so the worst adjacency at a boundary is two H's, never three).
 */
public final class H2OBonder {

    private final Semaphore hydrogenSemaphore = new Semaphore(2);
    private final Semaphore oxygenSemaphore = new Semaphore(1);
    private final CyclicBarrier barrier;
    private final List<String> output = new ArrayList<>();
    private final AtomicInteger moleculeCount = new AtomicInteger(0);
    private final TraceRecorder recorder;

    public H2OBonder() {
        this(TraceRecorder.NOOP);
    }

    public H2OBonder(TraceRecorder recorder) {
        this.recorder = recorder == null ? TraceRecorder.NOOP : recorder;
        this.barrier = new CyclicBarrier(3, this::bond);
    }

    /** Called by a hydrogen-atom thread: acquires, waits at the barrier, releases. */
    public void hydrogen() throws InterruptedException {
        recorder.record(EventType.HYDROGEN_ATTEMPT, "H", currentOutputLength());
        hydrogenSemaphore.acquire();
        recorder.record(EventType.HYDROGEN_ACQUIRED, "H", currentOutputLength());
        awaitBarrier();
        recorder.record(EventType.HYDROGEN_DEPARTED, "H", currentOutputLength());
        hydrogenSemaphore.release();
    }

    /** Called by an oxygen-atom thread: acquires, waits at the barrier, releases. */
    public void oxygen() throws InterruptedException {
        recorder.record(EventType.OXYGEN_ATTEMPT, "O", currentOutputLength());
        oxygenSemaphore.acquire();
        recorder.record(EventType.OXYGEN_ACQUIRED, "O", currentOutputLength());
        awaitBarrier();
        recorder.record(EventType.OXYGEN_DEPARTED, "O", currentOutputLength());
        oxygenSemaphore.release();
    }

    private void awaitBarrier() throws InterruptedException {
        try {
            barrier.await();
        } catch (BrokenBarrierException e) {
            throw new IllegalStateException("H2O barrier broken unexpectedly", e);
        }
    }

    /**
     * Runs once per trip, by the triggering thread, before any of the 3 are
     * released. Synchronized on the same monitor as {@link #currentOutputLength()}
     * so a concurrent trace read from a future trio's thread can never observe a
     * torn (partially-appended) output list.
     */
    private synchronized void bond() {
        output.add("H");
        output.add("O");
        output.add("H");
        int molecule = moleculeCount.incrementAndGet();
        recorder.record(EventType.MOLECULE_BONDED, "H2O-" + molecule, output.size());
    }

    private synchronized int currentOutputLength() {
        return output.size();
    }

    /** The fully assembled space-separated H/O output once every thread finishes. */
    public String getResult() {
        return String.join(" ", output);
    }

    public int getMoleculesBonded() {
        return moleculeCount.get();
    }
}
