package com.lld.concurrency.zeroevenodd.service;

import com.lld.concurrency.zeroevenodd.exception.InvalidZeroEvenOddParametersException;
import com.lld.concurrency.zeroevenodd.exception.RunExecutionException;
import com.lld.concurrency.zeroevenodd.model.RunRequest;
import com.lld.concurrency.zeroevenodd.model.RunResult;
import com.lld.concurrency.zeroevenodd.model.TraceEvent;
import com.lld.concurrency.zeroevenodd.model.TraceRecorder;
import com.lld.concurrency.zeroevenodd.model.ZeroEvenOddPrinter;
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
 * Spins up three real {@link Thread}s (zero, odd, even) against one
 * {@link ZeroEvenOddPrinter}, waits for the run to finish, and hands back the
 * complete ordered trace plus the assembled sequence string.
 */
@Service
public class ZeroEvenOddService {

    public static final int DEFAULT_N = 10;

    private static final int MAX_N = 2000;
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

        TraceRecorder recorder = (type, token, i) -> trace.add(new TraceEvent(
                sequence.incrementAndGet(),
                Instant.now(),
                System.nanoTime() - runStartNanos,
                Thread.currentThread().getName(),
                type,
                token,
                i
        ));

        ZeroEvenOddPrinter printer = new ZeroEvenOddPrinter(n, recorder);

        Thread zeroThread = new Thread(() -> runQuietly(printer::zero), "zero-thread");
        Thread oddThread = new Thread(() -> runQuietly(printer::odd), "odd-thread");
        Thread evenThread = new Thread(() -> runQuietly(printer::even), "even-thread");

        List<Thread> threads = List.of(zeroThread, oddThread, evenThread);
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

    @FunctionalInterface
    private interface InterruptibleTask {
        void run() throws InterruptedException;
    }

    private void runQuietly(InterruptibleTask task) {
        try {
            task.run();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
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
            throw new InvalidZeroEvenOddParametersException("n must be > 0, got " + n);
        }
        if (n > MAX_N) {
            throw new InvalidZeroEvenOddParametersException("n must be <= " + MAX_N + ", got " + n);
        }
    }
}
