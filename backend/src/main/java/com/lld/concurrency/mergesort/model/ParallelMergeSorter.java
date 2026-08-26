package com.lld.concurrency.mergesort.model;

import com.lld.concurrency.mergesort.exception.RunExecutionException;

import java.util.concurrent.ExecutionException;
import java.util.concurrent.ForkJoinPool;
import java.util.concurrent.RecursiveAction;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * A genuine parallel merge sort built on {@link ForkJoinPool} +
 * {@link RecursiveAction} — deliberately its own pool with an explicit
 * {@code parallelism} level rather than {@link ForkJoinPool#commonPool()}, so a run's
 * behavior (which worker threads appear, how much real forking happens) is
 * reproducible regardless of how many cores the machine running it has.
 *
 * <p>{@link #sort(int[])} clones its input before sorting — the array passed in is
 * never mutated, so a caller can safely compare the result against the original.
 *
 * <p>Every task below {@code sequentialThreshold} elements is sorted in the current
 * thread without forking further, so recursion visibly bottoms out early for small
 * demo arrays instead of spawning a task per single element — the classic ForkJoin
 * tuning knob that keeps fork/join bookkeeping from dominating tiny subranges.
 */
public final class ParallelMergeSorter {

    private static final long DEFAULT_TIMEOUT_SECONDS = 20;

    private final int parallelism;
    private final int sequentialThreshold;
    private final TraceRecorder recorder;

    public ParallelMergeSorter(int parallelism, int sequentialThreshold) {
        this(parallelism, sequentialThreshold, TraceRecorder.NOOP);
    }

    public ParallelMergeSorter(int parallelism, int sequentialThreshold, TraceRecorder recorder) {
        if (parallelism <= 0) {
            throw new IllegalArgumentException("parallelism must be positive, got " + parallelism);
        }
        if (sequentialThreshold <= 0) {
            throw new IllegalArgumentException("sequentialThreshold must be positive, got " + sequentialThreshold);
        }
        this.parallelism = parallelism;
        this.sequentialThreshold = sequentialThreshold;
        this.recorder = recorder == null ? TraceRecorder.NOOP : recorder;
    }

    /**
     * Sorts a clone of {@code input} using a fresh, explicitly-sized
     * {@link ForkJoinPool} and returns the sorted array. {@code input} itself is
     * never modified. Blocks the calling thread until the sort finishes or the
     * safety timeout elapses.
     *
     * @throws RunExecutionException if the sort does not finish within
     *                                {@value #DEFAULT_TIMEOUT_SECONDS} seconds, or the
     *                                calling thread is interrupted while waiting
     */
    public int[] sort(int[] input) {
        int[] array = input.clone();
        int[] buffer = new int[array.length];

        ForkJoinPool pool = new ForkJoinPool(parallelism);
        try {
            SortTask task = new SortTask(array, 0, array.length - 1, buffer);
            pool.submit(task);
            task.get(DEFAULT_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            throw new RunExecutionException(
                    "Merge sort exceeded the " + DEFAULT_TIMEOUT_SECONDS + "s safety timeout");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RunExecutionException("Interrupted while waiting for the merge sort to finish", e);
        } catch (ExecutionException e) {
            throw new RunExecutionException("Merge sort task failed", e.getCause() != null ? e.getCause() : e);
        } finally {
            pool.shutdown();
        }
        return array;
    }

    /**
     * One divide-and-conquer step over the inclusive range {@code [lo, hi]} of the
     * shared {@code array}, merging through the shared {@code buffer}. A non-static
     * inner class so it can reach the enclosing sorter's {@code sequentialThreshold}
     * and {@code recorder} without duplicating them per task.
     *
     * <p>{@code right.fork()} is genuine ForkJoinPool parallelism: the forked task
     * may be stolen and executed by a different pool worker thread while
     * {@code left.compute()} continues on the current thread — exactly what shows
     * up as differing {@code threadName}s in the trace.
     */
    final class SortTask extends RecursiveAction {

        private final int[] array;
        private final int lo;
        private final int hi;
        private final int[] buffer;

        SortTask(int[] array, int lo, int hi, int[] buffer) {
            this.array = array;
            this.lo = lo;
            this.hi = hi;
            this.buffer = buffer;
        }

        @Override
        protected void compute() {
            if (lo >= hi) {
                recorder.record(EventType.BASE_CASE, lo, hi, null, null, null, null);
                return;
            }

            int mid = lo + (hi - lo) / 2;
            recorder.record(EventType.PARTITION, lo, hi, mid, null, null, null);

            SortTask left = new SortTask(array, lo, mid, buffer);
            SortTask right = new SortTask(array, mid + 1, hi, buffer);

            if ((hi - lo + 1) <= sequentialThreshold) {
                left.compute();
                right.compute();
            } else {
                right.fork();
                recorder.record(EventType.FORK_RIGHT, lo, hi, mid, null, null, null);
                left.compute();
                right.join();
            }

            recorder.record(EventType.MERGE_START, lo, hi, mid, null, null, null);
            merge(mid);
            recorder.record(EventType.MERGE_COMPLETE, lo, hi, null, null, null, null);
        }

        private void merge(int mid) {
            int i = lo;
            int j = mid + 1;
            int k = lo;

            while (i <= mid && j <= hi) {
                if (array[i] <= array[j]) {
                    buffer[k] = array[i];
                    recorder.record(EventType.MERGE_WRITE, lo, hi, mid, k, array[i], "LEFT");
                    i++;
                } else {
                    buffer[k] = array[j];
                    recorder.record(EventType.MERGE_WRITE, lo, hi, mid, k, array[j], "RIGHT");
                    j++;
                }
                k++;
            }
            while (i <= mid) {
                buffer[k] = array[i];
                recorder.record(EventType.MERGE_WRITE, lo, hi, mid, k, array[i], "LEFT");
                i++;
                k++;
            }
            while (j <= hi) {
                buffer[k] = array[j];
                recorder.record(EventType.MERGE_WRITE, lo, hi, mid, k, array[j], "RIGHT");
                j++;
                k++;
            }

            System.arraycopy(buffer, lo, array, lo, hi - lo + 1);
        }
    }
}
