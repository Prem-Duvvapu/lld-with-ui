package com.lld.concurrency.mergesort.service;

import com.lld.concurrency.mergesort.exception.InvalidSortParametersException;
import com.lld.concurrency.mergesort.model.EventType;
import com.lld.concurrency.mergesort.model.ParallelMergeSorter;
import com.lld.concurrency.mergesort.model.RunRequest;
import com.lld.concurrency.mergesort.model.RunResult;
import com.lld.concurrency.mergesort.model.TraceEvent;
import com.lld.concurrency.mergesort.model.TraceRecorder;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

/**
 * Runs a real {@link ParallelMergeSorter} against either a caller-supplied array or
 * a freshly generated random one, and hands back the fully sorted result plus the
 * complete ordered trace. Every run is self-contained (its own array, its own
 * ForkJoinPool, its own trace list) so concurrent HTTP calls into {@code /run} never
 * share state — nothing here needs a lock of its own.
 */
@Service
public class MergeSortService {

    public static final int DEFAULT_SIZE = 12;
    public static final int DEFAULT_PARALLELISM = 4;
    public static final int DEFAULT_SEQUENTIAL_THRESHOLD = 2;

    private static final int MAX_SIZE = 5_000;
    private static final int MAX_PARALLELISM = 16;
    private static final int MAX_SEQUENTIAL_THRESHOLD = MAX_SIZE;
    private static final int RANDOM_VALUE_LOWER_BOUND = 1;
    private static final int RANDOM_VALUE_UPPER_BOUND_EXCLUSIVE = 100;

    public RunResult run(RunRequest request) {
        RunRequest effective = request == null ? new RunRequest(null, null, null, null) : request;

        List<Integer> suppliedArray = effective.array();
        Integer requestedSize = effective.size();

        if (suppliedArray != null && requestedSize != null && suppliedArray.size() != requestedSize) {
            throw new InvalidSortParametersException(
                    "supplied array length (" + suppliedArray.size()
                            + ") does not match requested size (" + requestedSize + ")");
        }

        int size = suppliedArray != null
                ? suppliedArray.size()
                : (requestedSize == null ? DEFAULT_SIZE : requestedSize);
        int parallelism = effective.parallelism() == null ? DEFAULT_PARALLELISM : effective.parallelism();
        int sequentialThreshold = effective.sequentialThreshold() == null
                ? DEFAULT_SEQUENTIAL_THRESHOLD : effective.sequentialThreshold();

        validate(size, parallelism, sequentialThreshold);

        int[] array = suppliedArray != null
                ? suppliedArray.stream().mapToInt(Integer::intValue).toArray()
                : ThreadLocalRandom.current()
                        .ints(size, RANDOM_VALUE_LOWER_BOUND, RANDOM_VALUE_UPPER_BOUND_EXCLUSIVE)
                        .toArray();

        String runId = UUID.randomUUID().toString();
        List<TraceEvent> trace = Collections.synchronizedList(new ArrayList<>());
        AtomicLong sequence = new AtomicLong(0);
        long runStartNanos = System.nanoTime();
        Instant startedAt = Instant.now();

        TraceRecorder recorder = (EventType type, int lo, int hi, Integer mid, Integer position,
                                   Integer value, String sourceSide) -> trace.add(new TraceEvent(
                sequence.incrementAndGet(),
                Instant.now(),
                System.nanoTime() - runStartNanos,
                Thread.currentThread().getName(),
                type,
                lo,
                hi,
                mid,
                position,
                value,
                sourceSide
        ));

        List<Integer> originalArray = Arrays.stream(array).boxed().collect(Collectors.toList());

        ParallelMergeSorter sorter = new ParallelMergeSorter(parallelism, sequentialThreshold, recorder);
        int[] sorted = sorter.sort(array);

        Instant finishedAt = Instant.now();
        List<TraceEvent> orderedTrace = new ArrayList<>(trace);
        orderedTrace.sort(Comparator.comparingLong(TraceEvent::sequence));

        int distinctThreadsUsed = (int) orderedTrace.stream()
                .map(TraceEvent::threadName)
                .distinct()
                .count();

        return new RunResult(
                runId,
                originalArray,
                Arrays.stream(sorted).boxed().collect(Collectors.toList()),
                size,
                parallelism,
                sequentialThreshold,
                distinctThreadsUsed,
                startedAt,
                finishedAt,
                Duration.between(startedAt, finishedAt).toMillis(),
                orderedTrace
        );
    }

    private void validate(int size, int parallelism, int sequentialThreshold) {
        if (size <= 0) {
            throw new InvalidSortParametersException("size must be > 0, got " + size);
        }
        if (size > MAX_SIZE) {
            throw new InvalidSortParametersException("size must be <= " + MAX_SIZE + ", got " + size);
        }
        if (parallelism <= 0) {
            throw new InvalidSortParametersException("parallelism must be > 0, got " + parallelism);
        }
        if (parallelism > MAX_PARALLELISM) {
            throw new InvalidSortParametersException(
                    "parallelism must be <= " + MAX_PARALLELISM + ", got " + parallelism);
        }
        if (sequentialThreshold <= 0) {
            throw new InvalidSortParametersException(
                    "sequentialThreshold must be > 0, got " + sequentialThreshold);
        }
        if (sequentialThreshold > MAX_SEQUENTIAL_THRESHOLD) {
            throw new InvalidSortParametersException(
                    "sequentialThreshold must be <= " + MAX_SEQUENTIAL_THRESHOLD + ", got " + sequentialThreshold);
        }
    }
}
