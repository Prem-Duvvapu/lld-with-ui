package com.lld.concurrency.ttlcache;

import com.lld.concurrency.ttlcache.exception.InvalidCacheParametersException;
import com.lld.concurrency.ttlcache.model.EventType;
import com.lld.concurrency.ttlcache.model.GetSpec;
import com.lld.concurrency.ttlcache.model.PutSpec;
import com.lld.concurrency.ttlcache.model.RunRequest;
import com.lld.concurrency.ttlcache.model.RunResult;
import com.lld.concurrency.ttlcache.model.TraceEvent;
import com.lld.concurrency.ttlcache.service.TtlCacheService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Exercises the orchestration layer end to end through real threads: the default
 * scripted scenario is timed (with generous margins) to genuinely exercise every
 * {@link EventType} — a real PUT, a real lazily-caught expiry, a real background
 * sweep eviction, a real not-found miss, and real hits — and the returned trace is
 * checked for properties that only hold if the concurrency and timing were real.
 */
class TtlCacheServiceTest {

    private final TtlCacheService service = new TtlCacheService();

    @Test
    void nullRequestUsesSensibleDefaults() {
        RunResult result = service.run(null);
        assertEquals(TtlCacheService.DEFAULT_SWEEP_INTERVAL_MILLIS, result.sweepIntervalMillis());
        assertTrue(result.totalPuts() > 0);
        assertTrue(result.totalGets() > 0);
        assertTrue(result.trace().size() > 0);
    }

    @Test
    void rejectsNonPositiveSweepInterval() {
        assertThrows(InvalidCacheParametersException.class,
                () -> service.run(new RunRequest(0L, List.of(new PutSpec("k", "v", 1000L)), List.of(), 1000L)));
        assertThrows(InvalidCacheParametersException.class,
                () -> service.run(new RunRequest(-50L, List.of(new PutSpec("k", "v", 1000L)), List.of(), 1000L)));
    }

    @Test
    void rejectsEmptyPutScript() {
        assertThrows(InvalidCacheParametersException.class,
                () -> service.run(new RunRequest(500L, List.of(), List.of(), 1000L)));
    }

    @Test
    void rejectsNonPositiveTtlInAPut() {
        assertThrows(InvalidCacheParametersException.class,
                () -> service.run(new RunRequest(500L, List.of(new PutSpec("k", "v", 0L)), List.of(), 1000L)));
    }

    @Test
    void rejectsGetScheduledAfterTheObservedWindow() {
        assertThrows(InvalidCacheParametersException.class,
                () -> service.run(new RunRequest(
                        500L,
                        List.of(new PutSpec("k", "v", 1000L)),
                        List.of(new GetSpec("k", 5000L)),
                        1000L)));
    }

    @Test
    void rejectsParametersBeyondTheSafetyCeiling() {
        assertThrows(InvalidCacheParametersException.class,
                () -> service.run(new RunRequest(10L, List.of(new PutSpec("k", "v", 1000L)), List.of(), 999_999L)));
        assertThrows(InvalidCacheParametersException.class,
                () -> service.run(new RunRequest(500L, List.of(new PutSpec("k", "v", 999_999L)), List.of(), 1000L)));
    }

    @Test
    @Timeout(20)
    void defaultScenarioTraceCoversEveryEventType() {
        RunResult result = service.run(null);

        Set<EventType> observed = result.trace().stream().map(TraceEvent::type).collect(Collectors.toSet());
        assertEquals(Set.of(EventType.values()), observed,
                "expected the default scripted scenario to exercise every event type at least once");
    }

    @Test
    @Timeout(20)
    void traceIsOrderedByIncreasingSequenceAndCarriesRealTimestamps() {
        RunResult result = service.run(null);

        List<TraceEvent> trace = result.trace();
        assertTrue(trace.size() > 0);
        long prevSeq = -1;
        for (TraceEvent event : trace) {
            assertTrue(event.sequence() > prevSeq, "trace must be strictly increasing by sequence");
            prevSeq = event.sequence();
            assertTrue(event.elapsedNanos() >= 0);
        }
    }

    @Test
    @Timeout(20)
    void backgroundEvictionEventsComeFromTheSweeperThreadNotTheDriverThread() {
        RunResult result = service.run(null);

        boolean anySweeperEviction = result.trace().stream()
                .anyMatch(e -> e.type() == EventType.BACKGROUND_EVICTION && e.threadName().contains("ttl-cache-sweeper"));
        assertTrue(anySweeperEviction,
                "expected at least one BACKGROUND_EVICTION event genuinely attributed to the sweeper thread");

        boolean anyDriverGet = result.trace().stream()
                .anyMatch(e -> (e.type() == EventType.GET_HIT || e.type() == EventType.GET_MISS_EXPIRED
                        || e.type() == EventType.GET_MISS_NOT_FOUND) && e.threadName().equals("ttl-run-driver"));
        assertTrue(anyDriverGet, "expected get() events to be attributed to the run driver thread");
    }

    @Test
    @Timeout(20)
    void customScenarioHonorsExplicitPutsAndGets() {
        RunRequest request = new RunRequest(
                200L,
                List.of(new PutSpec("a", "1", 5000L), new PutSpec("b", "2", 5000L)),
                List.of(new GetSpec("a", 50L), new GetSpec("missing", 60L)),
                500L);

        RunResult result = service.run(request);

        assertEquals(2, result.totalPuts());
        assertEquals(2, result.totalGets());
        assertEquals(2, result.finalCacheSize());

        List<EventType> types = result.trace().stream().map(TraceEvent::type).collect(Collectors.toList());
        assertTrue(types.contains(EventType.GET_HIT));
        assertTrue(types.contains(EventType.GET_MISS_NOT_FOUND));
    }
}
