package com.lld.threadpool;

import com.lld.threadpool.exception.TaskRejectedException;
import com.lld.threadpool.model.CustomThreadPool;
import com.lld.threadpool.strategy.AbortPolicy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Timeout;

import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Deterministic race tests against {@link CustomThreadPool#submit}: every submitting thread is
 * released simultaneously via a barrier, and every accepted task blocks on the same shared
 * {@link CountDownLatch} (so accepted tasks stay "in flight" for the whole race instead of
 * draining and freeing capacity mid-test). Total acceptable capacity is exactly
 * {@code maxPoolSize + queueCapacity}; anything past that must hit {@link AbortPolicy}. Without
 * {@link CustomThreadPool#lock} correctly serializing the core/queue/max check-then-act sequence
 * in {@code submit()}, two racing threads can both observe "room" for the same slot and both get
 * accepted — over-admitting past capacity and/or spawning more than {@code maxPoolSize} workers.
 * These tests fail reliably (not flakily) against that version of the bug.
 */
@Timeout(30)
class ThreadPoolConcurrencyTest {

    private static final int CORE = 5;
    private static final int MAX = 10;
    private static final int QUEUE_CAPACITY = 10;
    private static final int TOTAL_CAPACITY = MAX + QUEUE_CAPACITY; // 20
    private static final int THREADS = 200;

    @RepeatedTest(5)
    @DisplayName("under N concurrent submitters, exactly (max + queueCapacity) tasks are accepted, no more, and workers never exceed max")
    void exactlyCapacityAcceptedUnderConcurrency() throws InterruptedException {
        CustomThreadPool pool = new CustomThreadPool("race-pool", CORE, MAX, QUEUE_CAPACITY, 5_000, AbortPolicy.INSTANCE);
        CountDownLatch holdEverything = new CountDownLatch(1);
        Runnable blockingTask = () -> {
            try {
                holdEverything.await();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        };

        ExecutorService submitters = Executors.newFixedThreadPool(THREADS);
        CountDownLatch ready = new CountDownLatch(THREADS);
        CountDownLatch go = new CountDownLatch(1);
        AtomicInteger accepted = new AtomicInteger();
        AtomicInteger rejected = new AtomicInteger();

        java.util.List<Future<?>> futures = new java.util.ArrayList<>();
        for (int i = 0; i < THREADS; i++) {
            futures.add(submitters.submit(() -> {
                ready.countDown();
                try {
                    go.await();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    return;
                }
                try {
                    pool.submit("race-task", blockingTask);
                    accepted.incrementAndGet();
                } catch (TaskRejectedException e) {
                    rejected.incrementAndGet();
                }
            }));
        }

        ready.await();
        go.countDown();
        for (Future<?> f : futures) {
            try {
                f.get(15, TimeUnit.SECONDS);
            } catch (ExecutionException | TimeoutException e) {
                throw new RuntimeException(e);
            }
        }

        try {
            assertEquals(TOTAL_CAPACITY, accepted.get(),
                    "exactly max+queueCapacity submissions must be accepted, regardless of interleaving");
            assertEquals(THREADS - TOTAL_CAPACITY, rejected.get());
            assertEquals(MAX, pool.getCurrentWorkerCount(),
                    "worker count must never exceed maxPoolSize, even under a concurrent burst");
            assertEquals(QUEUE_CAPACITY, pool.getQueueSize());
            assertEquals(rejected.get(), pool.getRejectedCount());
            assertEquals(THREADS, pool.getSubmittedCount());
        } finally {
            holdEverything.countDown();
            submitters.shutdown();
        }
    }
}
