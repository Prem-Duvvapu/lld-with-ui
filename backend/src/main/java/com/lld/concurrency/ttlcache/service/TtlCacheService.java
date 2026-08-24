package com.lld.concurrency.ttlcache.service;

import com.lld.concurrency.ttlcache.exception.InvalidCacheParametersException;
import com.lld.concurrency.ttlcache.exception.RunExecutionException;
import com.lld.concurrency.ttlcache.model.EventType;
import com.lld.concurrency.ttlcache.model.GetSpec;
import com.lld.concurrency.ttlcache.model.PutSpec;
import com.lld.concurrency.ttlcache.model.RunRequest;
import com.lld.concurrency.ttlcache.model.RunResult;
import com.lld.concurrency.ttlcache.model.TraceEvent;
import com.lld.concurrency.ttlcache.model.TraceRecorder;
import com.lld.concurrency.ttlcache.model.TtlCache;
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
 * Runs one scripted TTL-cache scenario against a real {@link TtlCache} — real
 * scripted {@code put()}s at time zero, real scripted {@code get()}s issued after a
 * genuine {@code Thread.sleep} on a dedicated driver thread, and a genuine
 * background {@code ScheduledExecutorService} sweeping in parallel the whole time —
 * then hands back the complete ordered trace. Every run is self-contained (its own
 * cache, its own driver thread, its own trace list) so concurrent HTTP calls into
 * {@code /run} never share state.
 */
@Service
public class TtlCacheService {

    public static final long DEFAULT_SWEEP_INTERVAL_MILLIS = 600;
    public static final long DEFAULT_OBSERVE_MILLIS = 3000;

    private static final long MIN_SWEEP_INTERVAL_MILLIS = 50;
    private static final long MAX_SWEEP_INTERVAL_MILLIS = 5000;
    private static final long MAX_TTL_MILLIS = 8000;
    private static final long MAX_OBSERVE_MILLIS = 8000;
    private static final int MAX_PUTS = 20;
    private static final int MAX_GETS = 40;
    private static final long RUN_TIMEOUT_SECONDS = 20;

    // Timed with generous margins around the 600ms sweep tick so the default demo
    // scenario deterministically exercises every EventType even under CI jitter:
    // temp_flag's get lands well before the first sweep (lazy expiry), while
    // rate_limit_counter's TTL elapses before that same first sweep tick so the
    // background sweeper evicts it on its own (no get() involved).
    private static final List<PutSpec> DEFAULT_PUTS = List.of(
            new PutSpec("session_token", "tok-9f8a3c", 6000L),
            new PutSpec("user_profile", "prem-duvvapu", 6000L),
            new PutSpec("temp_flag", "on", 250L),
            new PutSpec("rate_limit_counter", "1", 500L)
    );

    private static final List<GetSpec> DEFAULT_GETS = List.of(
            new GetSpec("session_token", 100L),
            new GetSpec("temp_flag", 400L),
            new GetSpec("does_not_exist", 450L),
            new GetSpec("rate_limit_counter", 1000L),
            new GetSpec("user_profile", 2500L),
            new GetSpec("session_token", 2600L)
    );

    public RunResult run(RunRequest request) {
        RunRequest effective = normalize(request);
        validate(effective);

        List<TraceEvent> trace = Collections.synchronizedList(new ArrayList<>());
        AtomicLong sequence = new AtomicLong(0);
        long runStartNanos = System.nanoTime();
        Instant startedAt = Instant.now();
        String runId = UUID.randomUUID().toString();

        TraceRecorder recorder = (type, key, value, ttlMillis, cacheSizeNow) -> trace.add(new TraceEvent(
                sequence.incrementAndGet(),
                Instant.now(),
                System.nanoTime() - runStartNanos,
                Thread.currentThread().getName(),
                type,
                key,
                value,
                ttlMillis,
                cacheSizeNow
        ));

        TtlCache cache = new TtlCache(effective.sweepIntervalMillis(), recorder);
        try {
            for (PutSpec p : effective.puts()) {
                cache.put(p.key(), p.value(), p.ttlMillis());
            }

            List<GetSpec> orderedGets = effective.gets().stream()
                    .sorted(Comparator.comparingLong(GetSpec::atMillis))
                    .toList();

            Thread driver = new Thread(() -> {
                long elapsed = 0;
                for (GetSpec g : orderedGets) {
                    long delay = g.atMillis() - elapsed;
                    if (delay > 0) {
                        if (!sleepQuietly(delay)) {
                            return;
                        }
                        elapsed += delay;
                    }
                    cache.get(g.key());
                }
                long remaining = effective.observeMillis() - elapsed;
                if (remaining > 0) {
                    sleepQuietly(remaining);
                }
            }, "ttl-run-driver");

            driver.start();
            try {
                driver.join(RUN_TIMEOUT_SECONDS * 1000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                driver.interrupt();
                throw new RunExecutionException("Interrupted while waiting for the run to finish");
            }
            if (driver.isAlive()) {
                driver.interrupt();
                throw new RunExecutionException(
                        "Run exceeded the " + RUN_TIMEOUT_SECONDS + "s safety timeout");
            }
        } finally {
            cache.shutdown();
        }

        Instant finishedAt = Instant.now();
        List<TraceEvent> orderedTrace = new ArrayList<>(trace);
        orderedTrace.sort(Comparator.comparingLong(TraceEvent::sequence));

        return new RunResult(
                runId,
                effective.sweepIntervalMillis(),
                effective.puts().size(),
                effective.gets().size(),
                startedAt,
                finishedAt,
                Duration.between(startedAt, finishedAt).toMillis(),
                cache.size(),
                orderedTrace
        );
    }

    /** @return {@code true} if the sleep completed normally, {@code false} if interrupted. */
    private boolean sleepQuietly(long millis) {
        try {
            Thread.sleep(millis);
            return true;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    private RunRequest normalize(RunRequest request) {
        if (request == null) {
            return new RunRequest(DEFAULT_SWEEP_INTERVAL_MILLIS, DEFAULT_PUTS, DEFAULT_GETS, DEFAULT_OBSERVE_MILLIS);
        }
        long sweepIntervalMillis = request.sweepIntervalMillis() == null
                ? DEFAULT_SWEEP_INTERVAL_MILLIS : request.sweepIntervalMillis();
        List<PutSpec> puts = request.puts() == null ? DEFAULT_PUTS : request.puts();
        List<GetSpec> gets = request.gets() == null ? DEFAULT_GETS : request.gets();
        long observeMillis = request.observeMillis() == null ? DEFAULT_OBSERVE_MILLIS : request.observeMillis();
        return new RunRequest(sweepIntervalMillis, puts, gets, observeMillis);
    }

    private void validate(RunRequest r) {
        if (r.sweepIntervalMillis() <= 0) {
            throw new InvalidCacheParametersException(
                    "sweepIntervalMillis must be > 0, got " + r.sweepIntervalMillis());
        }
        if (r.sweepIntervalMillis() < MIN_SWEEP_INTERVAL_MILLIS || r.sweepIntervalMillis() > MAX_SWEEP_INTERVAL_MILLIS) {
            throw new InvalidCacheParametersException(
                    "sweepIntervalMillis must be between " + MIN_SWEEP_INTERVAL_MILLIS
                            + " and " + MAX_SWEEP_INTERVAL_MILLIS + ", got " + r.sweepIntervalMillis());
        }
        if (r.observeMillis() <= 0 || r.observeMillis() > MAX_OBSERVE_MILLIS) {
            throw new InvalidCacheParametersException(
                    "observeMillis must be between 1 and " + MAX_OBSERVE_MILLIS + ", got " + r.observeMillis());
        }
        if (r.puts() == null || r.puts().isEmpty()) {
            throw new InvalidCacheParametersException("puts must contain at least one entry");
        }
        if (r.puts().size() > MAX_PUTS) {
            throw new InvalidCacheParametersException("puts must contain at most " + MAX_PUTS + " entries");
        }
        for (PutSpec p : r.puts()) {
            if (p.key() == null || p.key().isBlank()) {
                throw new InvalidCacheParametersException("every put must have a non-blank key");
            }
            if (p.ttlMillis() == null || p.ttlMillis() <= 0) {
                throw new InvalidCacheParametersException(
                        "put(\"" + p.key() + "\") must have a positive ttlMillis");
            }
            if (p.ttlMillis() > MAX_TTL_MILLIS) {
                throw new InvalidCacheParametersException(
                        "put(\"" + p.key() + "\") ttlMillis must be <= " + MAX_TTL_MILLIS);
            }
        }
        if (r.gets() == null) {
            throw new InvalidCacheParametersException("gets must not be null");
        }
        if (r.gets().size() > MAX_GETS) {
            throw new InvalidCacheParametersException("gets must contain at most " + MAX_GETS + " entries");
        }
        for (GetSpec g : r.gets()) {
            if (g.key() == null || g.key().isBlank()) {
                throw new InvalidCacheParametersException("every get must have a non-blank key");
            }
            if (g.atMillis() == null || g.atMillis() < 0) {
                throw new InvalidCacheParametersException(
                        "get(\"" + g.key() + "\") must have a non-negative atMillis");
            }
            if (g.atMillis() > r.observeMillis()) {
                throw new InvalidCacheParametersException(
                        "get(\"" + g.key() + "\") atMillis=" + g.atMillis()
                                + " must be <= observeMillis=" + r.observeMillis());
            }
        }
    }
}
