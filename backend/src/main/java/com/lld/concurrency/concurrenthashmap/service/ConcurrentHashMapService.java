package com.lld.concurrency.concurrenthashmap.service;

import com.lld.concurrency.concurrenthashmap.exception.InvalidMapParametersException;
import com.lld.concurrency.concurrenthashmap.exception.RunExecutionException;
import com.lld.concurrency.concurrenthashmap.model.RunRequest;
import com.lld.concurrency.concurrenthashmap.model.RunResult;
import com.lld.concurrency.concurrenthashmap.model.StripedHashMap;
import com.lld.concurrency.concurrenthashmap.model.TraceEvent;
import com.lld.concurrency.concurrenthashmap.model.TraceRecorder;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Spins up real {@link Thread}s against one {@link StripedHashMap} to demonstrate
 * two correctness properties that only genuinely hold under real contention:
 *
 * <p><b>Phase A — no lost updates.</b> Many threads call {@code merge()} to
 * increment a small set of shared counter keys. Because every {@code merge()} call
 * is fully serialized by its key's segment lock, the sum of the final counters must
 * equal the total number of increments attempted, no matter how the threads
 * interleave.
 *
 * <p><b>Phase B — only one computation runs.</b> Several threads are released
 * together (via a {@link CountDownLatch}, so the release is genuine thread
 * contention rather than a scheduling accident) to race {@code computeIfAbsent()}
 * on the very same absent key. Exactly one of them ever invokes the mapping
 * function; every other racer simply observes the value that thread stored.
 *
 * <p>Every run is self-contained (its own maps, its own thread set, its own trace
 * list) so concurrent HTTP calls into {@code /run} never share state — nothing here
 * needs a lock of its own.
 */
@Service
public class ConcurrentHashMapService {

    public static final int DEFAULT_SEGMENTS = 8;
    public static final int DEFAULT_THREADS = 6;
    public static final int DEFAULT_INCREMENTS_PER_THREAD = 20;
    public static final int DEFAULT_DISTINCT_KEYS = 4;
    public static final int DEFAULT_COMPUTE_RACERS = 6;

    private static final int MAX_SEGMENTS = 32;
    private static final int MAX_THREADS = 24;
    private static final int MAX_INCREMENTS_PER_THREAD = 200;
    private static final int MAX_DISTINCT_KEYS = 16;
    private static final int MAX_COMPUTE_RACERS = 24;
    private static final long RUN_TIMEOUT_SECONDS = 20;

    public RunResult run(RunRequest request) {
        RunRequest effective = request == null ? new RunRequest(null, null, null, null, null) : request;

        int segments = effective.segments() == null ? DEFAULT_SEGMENTS : effective.segments();
        int threads = effective.threads() == null ? DEFAULT_THREADS : effective.threads();
        int incrementsPerThread = effective.incrementsPerThread() == null
                ? DEFAULT_INCREMENTS_PER_THREAD : effective.incrementsPerThread();
        int distinctKeys = effective.distinctKeys() == null ? DEFAULT_DISTINCT_KEYS : effective.distinctKeys();
        int computeRacers = effective.computeRacers() == null ? DEFAULT_COMPUTE_RACERS : effective.computeRacers();

        validate(segments, threads, incrementsPerThread, distinctKeys, computeRacers);

        String runId = UUID.randomUUID().toString();
        List<TraceEvent> trace = Collections.synchronizedList(new ArrayList<>());
        AtomicLong sequence = new AtomicLong(0);
        long runStartNanos = System.nanoTime();
        Instant startedAt = Instant.now();

        TraceRecorder recorder = (type, key, valueAfter, segmentIndex, segmentSize, mapSize) -> trace.add(new TraceEvent(
                sequence.incrementAndGet(),
                Instant.now(),
                System.nanoTime() - runStartNanos,
                Thread.currentThread().getName(),
                type,
                key,
                valueAfter,
                segmentIndex,
                segmentSize,
                mapSize
        ));

        // Phase A: many threads merge-increment a small set of shared counter keys.
        StripedHashMap<String, Long> counters = new StripedHashMap<>(segments, recorder);
        List<Thread> incrementThreads = new ArrayList<>(threads);
        for (int t = 0; t < threads; t++) {
            int threadId = t;
            incrementThreads.add(new Thread(() -> {
                for (int i = 0; i < incrementsPerThread; i++) {
                    String key = "key-" + (i % distinctKeys);
                    counters.merge(key, 1L, Long::sum);
                }
            }, "incrementer-" + threadId));
        }
        incrementThreads.forEach(Thread::start);
        awaitCompletion(incrementThreads);

        long totalIncrements = (long) threads * incrementsPerThread;
        long sumOfFinalCounters = 0L;
        for (int i = 0; i < distinctKeys; i++) {
            Long value = counters.get("key-" + i);
            sumOfFinalCounters += value == null ? 0L : value;
        }

        // Phase B: several threads race computeIfAbsent() on the same absent key,
        // released together via a latch for genuine contention.
        StripedHashMap<String, String> config = new StripedHashMap<>(segments, recorder);
        AtomicInteger computeCount = new AtomicInteger(0);
        CountDownLatch startGate = new CountDownLatch(1);
        List<Thread> racerThreads = new ArrayList<>(computeRacers);
        for (int r = 0; r < computeRacers; r++) {
            racerThreads.add(new Thread(() -> {
                try {
                    startGate.await();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    return;
                }
                config.computeIfAbsent("shared-config", k -> {
                    computeCount.incrementAndGet();
                    return "computed-value";
                });
            }, "racer-" + r));
        }
        racerThreads.forEach(Thread::start);
        startGate.countDown();
        awaitCompletion(racerThreads);

        Instant finishedAt = Instant.now();
        List<TraceEvent> orderedTrace = new ArrayList<>(trace);
        orderedTrace.sort(Comparator.comparingLong(TraceEvent::sequence));

        return new RunResult(
                runId,
                segments,
                threads,
                incrementsPerThread,
                distinctKeys,
                computeRacers,
                totalIncrements,
                sumOfFinalCounters,
                computeCount.get(),
                startedAt,
                finishedAt,
                Duration.between(startedAt, finishedAt).toMillis(),
                orderedTrace
        );
    }

    private void awaitCompletion(List<Thread> threads) {
        long deadline = System.currentTimeMillis() + RUN_TIMEOUT_SECONDS * 1000;
        for (Thread t : threads) {
            long remainingMs = Math.max(1, deadline - System.currentTimeMillis());
            try {
                t.join(remainingMs);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                threads.forEach(Thread::interrupt);
                throw new RunExecutionException("Interrupted while waiting for run threads to finish");
            }
            if (t.isAlive()) {
                threads.forEach(Thread::interrupt);
                throw new RunExecutionException(
                        "Run exceeded the " + RUN_TIMEOUT_SECONDS + "s safety timeout — thread "
                                + t.getName() + " did not finish");
            }
        }
    }

    private void validate(int segments, int threads, int incrementsPerThread, int distinctKeys, int computeRacers) {
        if (segments <= 0) {
            throw new InvalidMapParametersException("segments must be > 0, got " + segments);
        }
        if (segments > MAX_SEGMENTS) {
            throw new InvalidMapParametersException("segments must be <= " + MAX_SEGMENTS + ", got " + segments);
        }
        if (threads <= 0) {
            throw new InvalidMapParametersException("threads must be > 0, got " + threads);
        }
        if (threads > MAX_THREADS) {
            throw new InvalidMapParametersException("threads must be <= " + MAX_THREADS + ", got " + threads);
        }
        if (incrementsPerThread <= 0) {
            throw new InvalidMapParametersException("incrementsPerThread must be > 0, got " + incrementsPerThread);
        }
        if (incrementsPerThread > MAX_INCREMENTS_PER_THREAD) {
            throw new InvalidMapParametersException(
                    "incrementsPerThread must be <= " + MAX_INCREMENTS_PER_THREAD + ", got " + incrementsPerThread);
        }
        if (distinctKeys <= 0) {
            throw new InvalidMapParametersException("distinctKeys must be > 0, got " + distinctKeys);
        }
        if (distinctKeys > MAX_DISTINCT_KEYS) {
            throw new InvalidMapParametersException("distinctKeys must be <= " + MAX_DISTINCT_KEYS + ", got " + distinctKeys);
        }
        if (computeRacers <= 0) {
            throw new InvalidMapParametersException("computeRacers must be > 0, got " + computeRacers);
        }
        if (computeRacers > MAX_COMPUTE_RACERS) {
            throw new InvalidMapParametersException("computeRacers must be <= " + MAX_COMPUTE_RACERS + ", got " + computeRacers);
        }
    }
}
