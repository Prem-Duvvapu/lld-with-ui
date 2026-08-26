package com.lld.concurrency.bloomfilter.service;

import com.lld.concurrency.bloomfilter.exception.InvalidBloomFilterParametersException;
import com.lld.concurrency.bloomfilter.exception.RunExecutionException;
import com.lld.concurrency.bloomfilter.model.BloomFilter;
import com.lld.concurrency.bloomfilter.model.QueryOutcome;
import com.lld.concurrency.bloomfilter.model.RunRequest;
import com.lld.concurrency.bloomfilter.model.RunResult;
import com.lld.concurrency.bloomfilter.model.TraceEvent;
import com.lld.concurrency.bloomfilter.model.TraceRecorder;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Spins up real adder {@link Thread}s against one {@link BloomFilter}, waits for
 * the run to finish, deterministically hunts down a genuine false positive, and
 * hands back the complete ordered trace. Every run is self-contained (its own
 * filter, its own thread set, its own trace list) so concurrent HTTP calls into
 * {@code /run} never share state — nothing here needs a lock of its own.
 */
@Service
public class BloomFilterService {

    public static final int DEFAULT_BIT_SIZE = 28;
    public static final int DEFAULT_HASH_COUNT = 3;
    public static final int DEFAULT_ADD_THREADS = 4;

    private static final int MAX_BIT_SIZE = 4096;
    private static final int MAX_HASH_COUNT = 12;
    private static final int MAX_ADD_THREADS = 16;
    private static final long RUN_TIMEOUT_SECONDS = 20;
    private static final int MAX_FALSE_POSITIVE_PROBES = 1000;

    /**
     * Fixed, deterministic batch of items every run adds. Deterministic so that the
     * false positive hunted down below always reproduces given the same
     * bitSize/hashCount — nothing here is random.
     */
    static final List<String> ITEM_BATCH = List.of(
            "apple", "banana", "cherry", "date", "elderberry",
            "fig", "grape", "honeydew", "kiwi", "lemon"
    );

    /** Fixed candidates guaranteed NOT to be in {@link #ITEM_BATCH} — genuine true negatives. */
    static final List<String> TRUE_NEGATIVE_CANDIDATES = List.of(
            "zephyr", "quokka", "xylograph", "umbrella-99", "vortex-42", "nebula-7"
    );

    public RunResult run(RunRequest request) {
        RunRequest effective = request == null ? new RunRequest(null, null, null) : request;

        int bitSize = effective.bitSize() == null ? DEFAULT_BIT_SIZE : effective.bitSize();
        int hashCount = effective.hashCount() == null ? DEFAULT_HASH_COUNT : effective.hashCount();
        int addThreads = effective.addThreads() == null ? DEFAULT_ADD_THREADS : effective.addThreads();

        validate(bitSize, hashCount, addThreads);

        String runId = UUID.randomUUID().toString();
        List<TraceEvent> trace = Collections.synchronizedList(new ArrayList<>());
        AtomicLong sequence = new AtomicLong(0);
        long runStartNanos = System.nanoTime();
        Instant startedAt = Instant.now();

        TraceRecorder recorder = (type, item, bitIndex, bitsSetSoFar) -> trace.add(new TraceEvent(
                sequence.incrementAndGet(),
                Instant.now(),
                System.nanoTime() - runStartNanos,
                Thread.currentThread().getName(),
                type,
                item,
                bitIndex,
                bitsSetSoFar
        ));

        BloomFilter filter = new BloomFilter(bitSize, hashCount, recorder);

        // Round-robin split of the fixed item batch across addThreads real threads.
        List<List<String>> perThreadItems = new ArrayList<>();
        for (int t = 0; t < addThreads; t++) {
            perThreadItems.add(new ArrayList<>());
        }
        for (int i = 0; i < ITEM_BATCH.size(); i++) {
            perThreadItems.get(i % addThreads).add(ITEM_BATCH.get(i));
        }

        List<Thread> threads = new ArrayList<>(addThreads);
        for (int t = 0; t < addThreads; t++) {
            List<String> assigned = perThreadItems.get(t);
            threads.add(new Thread(() -> {
                for (String item : assigned) {
                    filter.add(item);
                }
            }, "adder-" + (t + 1)));
        }

        threads.forEach(Thread::start);
        awaitCompletion(threads);

        // Deterministically hunt for a genuine false positive: scan probe-0..probe-999
        // (none of which are in ITEM_BATCH) in order on the calling thread, stopping
        // at the first one mightContain() genuinely reports as present.
        String falsePositiveProbe = null;
        boolean falsePositiveFound = false;
        for (int i = 0; i < MAX_FALSE_POSITIVE_PROBES; i++) {
            String probe = "probe-" + i;
            if (filter.mightContain(probe)) {
                falsePositiveProbe = probe;
                falsePositiveFound = true;
                break;
            }
        }

        // Query every item that was actually added (must all be true positives —
        // a Bloom filter never false-negatives), every true-negative candidate, and
        // — if one was found — the demonstrated false-positive probe. All executed
        // on the calling thread now that the concurrent add phase has joined.
        List<QueryOutcome> queries = new ArrayList<>();
        for (String item : ITEM_BATCH) {
            boolean mightContain = filter.mightContain(item);
            queries.add(new QueryOutcome(item, true, mightContain, false));
        }
        for (String candidate : TRUE_NEGATIVE_CANDIDATES) {
            boolean mightContain = filter.mightContain(candidate);
            queries.add(new QueryOutcome(candidate, false, mightContain, mightContain));
        }
        if (falsePositiveFound) {
            queries.add(new QueryOutcome(falsePositiveProbe, false, true, true));
        }

        int bitsSetCount = filter.cardinalityEstimate();

        Instant finishedAt = Instant.now();
        List<TraceEvent> orderedTrace = new ArrayList<>(trace);
        orderedTrace.sort(Comparator.comparingLong(TraceEvent::sequence));

        return new RunResult(
                runId,
                bitSize,
                hashCount,
                addThreads,
                ITEM_BATCH,
                queries,
                bitsSetCount,
                falsePositiveFound,
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

    private void validate(int bitSize, int hashCount, int addThreads) {
        if (bitSize <= 0) {
            throw new InvalidBloomFilterParametersException("bitSize must be > 0, got " + bitSize);
        }
        if (bitSize > MAX_BIT_SIZE) {
            throw new InvalidBloomFilterParametersException(
                    "bitSize must be <= " + MAX_BIT_SIZE + ", got " + bitSize);
        }
        if (hashCount <= 0) {
            throw new InvalidBloomFilterParametersException("hashCount must be > 0, got " + hashCount);
        }
        if (hashCount > MAX_HASH_COUNT) {
            throw new InvalidBloomFilterParametersException(
                    "hashCount must be <= " + MAX_HASH_COUNT + ", got " + hashCount);
        }
        if (addThreads <= 0) {
            throw new InvalidBloomFilterParametersException("addThreads must be > 0, got " + addThreads);
        }
        if (addThreads > MAX_ADD_THREADS) {
            throw new InvalidBloomFilterParametersException(
                    "addThreads must be <= " + MAX_ADD_THREADS + ", got " + addThreads);
        }
    }
}
