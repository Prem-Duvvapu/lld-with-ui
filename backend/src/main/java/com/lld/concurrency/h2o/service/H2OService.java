package com.lld.concurrency.h2o.service;

import com.lld.concurrency.h2o.exception.InvalidH2OParametersException;
import com.lld.concurrency.h2o.exception.RunExecutionException;
import com.lld.concurrency.h2o.model.H2OBonder;
import com.lld.concurrency.h2o.model.RunRequest;
import com.lld.concurrency.h2o.model.RunResult;
import com.lld.concurrency.h2o.model.TraceEvent;
import com.lld.concurrency.h2o.model.TraceRecorder;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Spins up {@code 2 * moleculeCount} real hydrogen threads and
 * {@code moleculeCount} real oxygen threads against one {@link H2OBonder}, waits
 * for the run to finish, and hands back the complete ordered trace plus the
 * assembled bonded output. Threads are started in a shuffled order each run
 * (rather than "all hydrogen, then all oxygen") to genuinely stress the
 * semaphore/barrier coordination with randomised arrival order, matching a
 * randomised/large input of atoms.
 */
@Service
public class H2OService {

    public static final int DEFAULT_MOLECULE_COUNT = 10;

    private static final int MAX_MOLECULE_COUNT = 150;
    private static final long RUN_TIMEOUT_SECONDS = 20;

    public RunResult run(RunRequest request) {
        RunRequest effective = request == null ? new RunRequest(null) : request;
        int moleculeCount = effective.moleculeCount() == null ? DEFAULT_MOLECULE_COUNT : effective.moleculeCount();

        validate(moleculeCount);

        int hydrogenCount = moleculeCount * 2;
        int oxygenCount = moleculeCount;

        String runId = UUID.randomUUID().toString();
        List<TraceEvent> trace = Collections.synchronizedList(new ArrayList<>());
        AtomicLong sequence = new AtomicLong(0);
        long runStartNanos = System.nanoTime();
        Instant startedAt = Instant.now();

        TraceRecorder recorder = (type, item, outputLengthNow) -> trace.add(new TraceEvent(
                sequence.incrementAndGet(),
                Instant.now(),
                System.nanoTime() - runStartNanos,
                Thread.currentThread().getName(),
                type,
                item,
                outputLengthNow
        ));

        H2OBonder bonder = new H2OBonder(recorder);

        List<Thread> threads = new ArrayList<>(hydrogenCount + oxygenCount);
        for (int h = 1; h <= hydrogenCount; h++) {
            threads.add(new Thread(() -> runQuietly(bonder::hydrogen), "H-" + h));
        }
        for (int o = 1; o <= oxygenCount; o++) {
            threads.add(new Thread(() -> runQuietly(bonder::oxygen), "O-" + o));
        }
        Collections.shuffle(threads, ThreadLocalRandom.current());

        threads.forEach(Thread::start);
        awaitCompletion(threads);

        Instant finishedAt = Instant.now();
        List<TraceEvent> orderedTrace = new ArrayList<>(trace);
        orderedTrace.sort(Comparator.comparingLong(TraceEvent::sequence));

        return new RunResult(
                runId,
                moleculeCount,
                hydrogenCount,
                oxygenCount,
                threads.size(),
                bonder.getResult(),
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

    private void validate(int moleculeCount) {
        if (moleculeCount <= 0) {
            throw new InvalidH2OParametersException("moleculeCount must be > 0, got " + moleculeCount);
        }
        if (moleculeCount > MAX_MOLECULE_COUNT) {
            throw new InvalidH2OParametersException(
                    "moleculeCount must be <= " + MAX_MOLECULE_COUNT + ", got " + moleculeCount);
        }
    }
}
