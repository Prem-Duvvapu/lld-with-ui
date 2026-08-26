package com.lld.concurrency.mergesort;

import com.lld.concurrency.mergesort.model.ParallelMergeSorter;
import com.lld.concurrency.mergesort.model.TraceEvent;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Random;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Proves {@link ParallelMergeSorter} performs genuine parallel execution: with
 * {@code parallelism >= 2} and an array large enough relative to
 * {@code sequentialThreshold} for real forking to occur, more than one real JVM
 * thread must appear in the recorded trace. This is inherent to
 * {@code ForkJoinPool.RecursiveAction.fork()} — real work-stealing across real
 * worker threads — not something gated by a latch, so the assertion is simply "more
 * than one distinct threadName was observed," repeated across several iterations
 * since ForkJoin scheduling can vary run to run.
 */
class ParallelMergeSorterConcurrencyTest {

    private static final int ARRAY_SIZE = 512;
    private static final int SEQUENTIAL_THRESHOLD = 4;
    private static final int PARALLELISM = 8;

    @Test
    @Timeout(30)
    void parallelSortUsesMoreThanOneRealThread() {
        for (int iteration = 0; iteration < 5; iteration++) {
            Random random = new Random(iteration * 31L + 7);
            int[] input = random.ints(ARRAY_SIZE, -5000, 5000).toArray();
            int[] expected = input.clone();
            Arrays.sort(expected);

            List<TraceEvent> trace = new ArrayList<>();
            AtomicLong sequence = new AtomicLong(0);
            long start = System.nanoTime();

            ParallelMergeSorter sorter = new ParallelMergeSorter(PARALLELISM, SEQUENTIAL_THRESHOLD,
                    (type, lo, hi, mid, position, value, sourceSide) -> {
                        synchronized (trace) {
                            trace.add(new TraceEvent(
                                    sequence.incrementAndGet(),
                                    java.time.Instant.now(),
                                    System.nanoTime() - start,
                                    Thread.currentThread().getName(),
                                    type, lo, hi, mid, position, value, sourceSide));
                        }
                    });

            int[] actual = sorter.sort(input);

            assertArrayEquals(expected, actual, "iteration " + iteration + ": sorted output must match reference");

            Set<String> distinctThreads = trace.stream()
                    .map(TraceEvent::threadName)
                    .collect(Collectors.toSet());

            assertTrue(distinctThreads.size() > 1,
                    "iteration " + iteration + ": expected more than one real worker thread to participate, "
                            + "got only " + distinctThreads);
        }
    }

    @Test
    @Timeout(15)
    void forkRightEventsAreRecordedWhenTaskExceedsThreshold() {
        Random random = new Random(42);
        int[] input = random.ints(ARRAY_SIZE, 0, 1000).toArray();

        List<TraceEvent> trace = new ArrayList<>();
        AtomicLong sequence = new AtomicLong(0);
        long start = System.nanoTime();

        ParallelMergeSorter sorter = new ParallelMergeSorter(PARALLELISM, SEQUENTIAL_THRESHOLD,
                (type, lo, hi, mid, position, value, sourceSide) -> {
                    synchronized (trace) {
                        trace.add(new TraceEvent(
                                sequence.incrementAndGet(),
                                java.time.Instant.now(),
                                System.nanoTime() - start,
                                Thread.currentThread().getName(),
                                type, lo, hi, mid, position, value, sourceSide));
                    }
                });

        sorter.sort(input);

        long forkEvents = trace.stream()
                .filter(e -> e.type() == com.lld.concurrency.mergesort.model.EventType.FORK_RIGHT)
                .count();
        assertTrue(forkEvents > 0, "expected at least one FORK_RIGHT event for a " + ARRAY_SIZE
                + "-element array with sequentialThreshold=" + SEQUENTIAL_THRESHOLD);
    }
}
