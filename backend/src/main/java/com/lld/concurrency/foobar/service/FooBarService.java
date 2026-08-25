package com.lld.concurrency.foobar.service;

import com.lld.concurrency.foobar.exception.InvalidFooBarParametersException;
import com.lld.concurrency.foobar.exception.RunExecutionException;
import com.lld.concurrency.foobar.model.FooBarPrinter;
import com.lld.concurrency.foobar.model.RunRequest;
import com.lld.concurrency.foobar.model.RunResult;
import com.lld.concurrency.foobar.model.TraceEvent;
import com.lld.concurrency.foobar.model.TraceRecorder;
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
 * Spins up two real {@link Thread}s (foo and bar) against one
 * {@link FooBarPrinter}, waits for the run to finish, and hands back the complete
 * ordered trace plus the assembled "foobar" string. Every run is self-contained
 * (its own printer, its own thread pair, its own trace list) so concurrent HTTP
 * calls into {@code /run} never share state.
 */
@Service
public class FooBarService {

    public static final int DEFAULT_N = 5;

    private static final int MAX_N = 1000;
    private static final long RUN_TIMEOUT_SECONDS = 15;

    public RunResult run(RunRequest request) {
        RunRequest effective = request == null ? new RunRequest(null) : request;
        int n = effective.n() == null ? DEFAULT_N : effective.n();

        validate(n);

        String runId = UUID.randomUUID().toString();
        List<TraceEvent> trace = Collections.synchronizedList(new ArrayList<>());
        AtomicLong sequence = new AtomicLong(0);
        long runStartNanos = System.nanoTime();
        Instant startedAt = Instant.now();

        TraceRecorder recorder = (type, item, repetition) -> trace.add(new TraceEvent(
                sequence.incrementAndGet(),
                Instant.now(),
                System.nanoTime() - runStartNanos,
                Thread.currentThread().getName(),
                type,
                item,
                repetition
        ));

        FooBarPrinter printer = new FooBarPrinter(n, recorder);

        Thread fooThread = new Thread(() -> {
            try {
                printer.foo();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }, "foo-thread");

        Thread barThread = new Thread(() -> {
            try {
                printer.bar();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }, "bar-thread");

        List<Thread> threads = List.of(fooThread, barThread);
        threads.forEach(Thread::start);
        awaitCompletion(threads);

        Instant finishedAt = Instant.now();
        List<TraceEvent> orderedTrace = new ArrayList<>(trace);
        orderedTrace.sort(Comparator.comparingLong(TraceEvent::sequence));

        return new RunResult(
                runId,
                n,
                threads.size(),
                printer.getResult(),
                startedAt,
                finishedAt,
                Duration.between(startedAt, finishedAt).toMillis(),
                System.nanoTime() - runStartNanos,
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

    private void validate(int n) {
        if (n <= 0) {
            throw new InvalidFooBarParametersException("n must be > 0, got " + n);
        }
        if (n > MAX_N) {
            throw new InvalidFooBarParametersException("n must be <= " + MAX_N + ", got " + n);
        }
    }
}
