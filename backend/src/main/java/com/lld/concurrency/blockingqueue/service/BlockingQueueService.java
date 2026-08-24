package com.lld.concurrency.blockingqueue.service;

import com.lld.concurrency.blockingqueue.exception.InvalidQueueParametersException;
import com.lld.concurrency.blockingqueue.exception.RunExecutionException;
import com.lld.concurrency.blockingqueue.model.BoundedBlockingQueue;
import com.lld.concurrency.blockingqueue.model.EventType;
import com.lld.concurrency.blockingqueue.model.RunRequest;
import com.lld.concurrency.blockingqueue.model.RunResult;
import com.lld.concurrency.blockingqueue.model.TraceEvent;
import com.lld.concurrency.blockingqueue.model.TraceRecorder;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Spins up real producer and consumer {@link Thread}s against one
 * {@link BoundedBlockingQueue}, waits for the run to finish, and hands back the
 * complete ordered trace. Every run is self-contained (its own queue, its own
 * thread set, its own trace list) so concurrent HTTP calls into {@code /run} never
 * share state — nothing here needs a lock of its own.
 */
@Service
public class BlockingQueueService {

    public static final int DEFAULT_CAPACITY = 5;
    public static final int DEFAULT_PRODUCERS = 2;
    public static final int DEFAULT_CONSUMERS = 2;
    public static final int DEFAULT_ITEMS_PER_PRODUCER = 5;

    private static final int MAX_CAPACITY = 50;
    private static final int MAX_THREADS = 12;
    private static final int MAX_ITEMS_PER_PRODUCER = 50;
    private static final long RUN_TIMEOUT_SECONDS = 20;

    public RunResult run(RunRequest request) {
        RunRequest effective = request == null ? new RunRequest(null, null, null, null) : request;

        int capacity = effective.capacity() == null ? DEFAULT_CAPACITY : effective.capacity();
        int producers = effective.producers() == null ? DEFAULT_PRODUCERS : effective.producers();
        int consumers = effective.consumers() == null ? DEFAULT_CONSUMERS : effective.consumers();
        int itemsPerProducer = effective.itemsPerProducer() == null
                ? DEFAULT_ITEMS_PER_PRODUCER : effective.itemsPerProducer();

        validate(capacity, producers, consumers, itemsPerProducer);

        int totalItems = producers * itemsPerProducer;
        String runId = UUID.randomUUID().toString();

        List<TraceEvent> trace = Collections.synchronizedList(new ArrayList<>());
        AtomicLong sequence = new AtomicLong(0);
        AtomicInteger maxObserved = new AtomicInteger(0);
        long runStartNanos = System.nanoTime();
        Instant startedAt = Instant.now();

        TraceRecorder recorder = (type, item, queueSizeNow) -> {
            maxObserved.updateAndGet(prev -> Math.max(prev, queueSizeNow));
            trace.add(new TraceEvent(
                    sequence.incrementAndGet(),
                    Instant.now(),
                    System.nanoTime() - runStartNanos,
                    Thread.currentThread().getName(),
                    type,
                    item,
                    queueSizeNow,
                    capacity
            ));
        };

        BoundedBlockingQueue<String> queue = new BoundedBlockingQueue<>(capacity, recorder);
        List<Thread> threads = new ArrayList<>(producers + consumers);

        for (int p = 1; p <= producers; p++) {
            int producerId = p;
            threads.add(new Thread(() -> {
                for (int i = 1; i <= itemsPerProducer; i++) {
                    try {
                        queue.put("P" + producerId + "-" + i);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        return;
                    }
                }
            }, "producer-" + p));
        }

        // Each consumer atomically claims a "slot" before ever calling take(), so
        // the total number of take() calls across every consumer thread equals
        // exactly totalItems (== total put() calls). This is what makes the run
        // provably terminating: no consumer ever attempts a take() beyond what
        // producers will supply, so nobody can be left permanently blocked once
        // all producers finish.
        AtomicInteger remainingToConsume = new AtomicInteger(totalItems);
        for (int c = 1; c <= consumers; c++) {
            threads.add(new Thread(() -> {
                while (true) {
                    int before = remainingToConsume.getAndUpdate(v -> v > 0 ? v - 1 : v);
                    if (before <= 0) {
                        break;
                    }
                    try {
                        queue.take();
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        return;
                    }
                }
            }, "consumer-" + c));
        }

        threads.forEach(Thread::start);
        awaitCompletion(threads);

        Instant finishedAt = Instant.now();
        List<TraceEvent> orderedTrace = new ArrayList<>(trace);
        orderedTrace.sort(Comparator.comparingLong(TraceEvent::sequence));

        return new RunResult(
                runId,
                capacity,
                producers,
                consumers,
                itemsPerProducer,
                totalItems,
                startedAt,
                finishedAt,
                Duration.between(startedAt, finishedAt).toMillis(),
                maxObserved.get(),
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

    private void validate(int capacity, int producers, int consumers, int itemsPerProducer) {
        if (capacity <= 0) {
            throw new InvalidQueueParametersException("capacity must be > 0, got " + capacity);
        }
        if (capacity > MAX_CAPACITY) {
            throw new InvalidQueueParametersException("capacity must be <= " + MAX_CAPACITY + ", got " + capacity);
        }
        if (producers <= 0) {
            throw new InvalidQueueParametersException("producers must be > 0, got " + producers);
        }
        if (producers > MAX_THREADS) {
            throw new InvalidQueueParametersException("producers must be <= " + MAX_THREADS + ", got " + producers);
        }
        if (consumers <= 0) {
            throw new InvalidQueueParametersException("consumers must be > 0, got " + consumers);
        }
        if (consumers > MAX_THREADS) {
            throw new InvalidQueueParametersException("consumers must be <= " + MAX_THREADS + ", got " + consumers);
        }
        if (itemsPerProducer <= 0) {
            throw new InvalidQueueParametersException("itemsPerProducer must be > 0, got " + itemsPerProducer);
        }
        if (itemsPerProducer > MAX_ITEMS_PER_PRODUCER) {
            throw new InvalidQueueParametersException(
                    "itemsPerProducer must be <= " + MAX_ITEMS_PER_PRODUCER + ", got " + itemsPerProducer);
        }
    }
}
