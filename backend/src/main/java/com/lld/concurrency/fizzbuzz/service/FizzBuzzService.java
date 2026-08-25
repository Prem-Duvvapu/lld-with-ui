package com.lld.concurrency.fizzbuzz.service;

import com.lld.concurrency.fizzbuzz.exception.InvalidFizzBuzzParametersException;
import com.lld.concurrency.fizzbuzz.exception.RunExecutionException;
import com.lld.concurrency.fizzbuzz.model.FizzBuzzPrinter;
import com.lld.concurrency.fizzbuzz.model.RunRequest;
import com.lld.concurrency.fizzbuzz.model.RunResult;
import com.lld.concurrency.fizzbuzz.model.TraceEvent;
import com.lld.concurrency.fizzbuzz.model.TraceRecorder;
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
 * Spins up four real {@link Thread}s (number, fizz, buzz, fizzbuzz) against one
 * {@link FizzBuzzPrinter}, waits for the run to finish, and hands back the
 * complete ordered trace plus the assembled canonical FizzBuzz string.
 */
@Service
public class FizzBuzzService {

    public static final int DEFAULT_N = 20;

    private static final int MAX_N = 3000;
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

        FizzBuzzPrinter printer = new FizzBuzzPrinter(n, recorder);

        Thread numberThread = new Thread(() -> runQuietly(printer::number), "number-thread");
        Thread fizzThread = new Thread(() -> runQuietly(printer::fizz), "fizz-thread");
        Thread buzzThread = new Thread(() -> runQuietly(printer::buzz), "buzz-thread");
        Thread fizzbuzzThread = new Thread(() -> runQuietly(printer::fizzbuzz), "fizzbuzz-thread");

        List<Thread> threads = List.of(numberThread, fizzThread, buzzThread, fizzbuzzThread);
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
            throw new InvalidFizzBuzzParametersException("n must be > 0, got " + n);
        }
        if (n > MAX_N) {
            throw new InvalidFizzBuzzParametersException("n must be <= " + MAX_N + ", got " + n);
        }
    }
}
