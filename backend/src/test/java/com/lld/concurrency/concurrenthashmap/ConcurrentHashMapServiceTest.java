package com.lld.concurrency.concurrenthashmap;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lld.concurrency.concurrenthashmap.exception.InvalidMapParametersException;
import com.lld.concurrency.concurrenthashmap.model.EventType;
import com.lld.concurrency.concurrenthashmap.model.MapScope;
import com.lld.concurrency.concurrenthashmap.model.RunRequest;
import com.lld.concurrency.concurrenthashmap.model.RunResult;
import com.lld.concurrency.concurrenthashmap.model.TraceEvent;
import com.lld.concurrency.concurrenthashmap.service.ConcurrentHashMapService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Exercises the orchestration layer end to end: real threads run through the
 * service, and the returned {@link RunResult} is checked for the two properties
 * that only hold if the concurrency was real — no lost updates across concurrent
 * merge() calls, and exactly one computeIfAbsent() computation across all racers —
 * plus the trace's ordering and validation guardrails.
 */
class ConcurrentHashMapServiceTest {

    private final ConcurrentHashMapService service = new ConcurrentHashMapService();

    @Test
    @Timeout(15)
    void nullRequestUsesSensibleDefaults() {
        RunResult result = service.run(null);
        assertEquals(ConcurrentHashMapService.DEFAULT_SEGMENTS, result.segments());
        assertEquals(ConcurrentHashMapService.DEFAULT_THREADS, result.threads());
        assertEquals(ConcurrentHashMapService.DEFAULT_INCREMENTS_PER_THREAD, result.incrementsPerThread());
        assertEquals(ConcurrentHashMapService.DEFAULT_DISTINCT_KEYS, result.distinctKeys());
        assertEquals(ConcurrentHashMapService.DEFAULT_COMPUTE_RACERS, result.computeRacers());
        assertEquals(result.totalIncrements(), result.sumOfFinalCounters());
        assertEquals(1, result.computeExecutions());
    }

    @Test
    @Timeout(15)
    void explicitRequestProducesNoLostUpdatesAndExactlyOneComputation() {
        RunResult result = service.run(new RunRequest(4, 10, 30, 3, 12));

        assertEquals(10, result.threads());
        assertEquals(300L, result.totalIncrements());
        assertEquals(result.totalIncrements(), result.sumOfFinalCounters(),
                "sum of final counters must equal total increments attempted — no lost updates");
        assertEquals(1, result.computeExecutions(),
                "exactly one racer's computeIfAbsent mapping function must have run");
    }

    @Test
    @Timeout(15)
    void traceIsNonEmptyAndSortedBySequenceWithNonNegativeElapsedNanos() {
        RunResult result = service.run(new RunRequest(4, 6, 10, 2, 8));

        List<TraceEvent> trace = result.trace();
        assertFalse(trace.isEmpty());

        long prevSeq = -1;
        for (TraceEvent event : trace) {
            assertTrue(event.sequence() > prevSeq, "trace must be strictly increasing by sequence");
            prevSeq = event.sequence();
            assertTrue(event.elapsedNanos() >= 0);
        }
    }

    @Test
    void rejectsNonPositiveSegments() {
        assertThrows(InvalidMapParametersException.class,
                () -> service.run(new RunRequest(0, 1, 1, 1, 1)));
        assertThrows(InvalidMapParametersException.class,
                () -> service.run(new RunRequest(-2, 1, 1, 1, 1)));
    }

    @Test
    @Timeout(15)
    void recordsSeparateMapScopesEvenWhenEveryOperationUsesSegmentZero() {
        RunResult result = service.run(new RunRequest(1, 2, 3, 1, 3));
        Map<MapScope, Map<String, String>> observed = new EnumMap<>(MapScope.class);
        observed.put(MapScope.COUNTERS, new HashMap<>());
        observed.put(MapScope.CONFIG, new HashMap<>());

        for (TraceEvent event : result.trace()) {
            assertEquals(0, event.segmentIndex());
            assertTrue(observed.containsKey(event.mapScope()));
            if (event.type() == EventType.MERGE_SUCCESS) {
                assertEquals(MapScope.COUNTERS, event.mapScope());
                observed.get(event.mapScope()).put(event.key(), event.valueAfter());
            }
            if (event.type() == EventType.COMPUTE_IF_ABSENT_COMPUTED) {
                assertEquals(MapScope.CONFIG, event.mapScope());
                observed.get(event.mapScope()).put(event.key(), event.valueAfter());
            }
            if (event.type() == EventType.GET_HIT) assertEquals(MapScope.COUNTERS, event.mapScope());
            if (event.threadName().startsWith("racer-")) assertEquals(MapScope.CONFIG, event.mapScope());
        }
        assertEquals(Map.of("key-0", "6"), observed.get(MapScope.COUNTERS));
        assertEquals(Map.of("shared-config", "computed-value"), observed.get(MapScope.CONFIG));
        assertEquals(1, result.trace().stream().filter(event -> event.type() == EventType.COMPUTE_IF_ABSENT_COMPUTED).count());
    }

    @Test
    void serializesExplicitMapIdentityOnEveryEvent() throws Exception {
        RunResult result = service.run(new RunRequest(1, 2, 2, 1, 2));
        JsonNode serialized = new ObjectMapper().findAndRegisterModules().valueToTree(result);
        for (int index = 0; index < result.trace().size(); index++) {
            assertEquals(result.trace().get(index).mapScope().name(),
                    serialized.get("trace").get(index).get("mapScope").asText());
        }
    }

    @Test
    void rejectsNonPositiveThreads() {
        assertThrows(InvalidMapParametersException.class,
                () -> service.run(new RunRequest(4, 0, 1, 1, 1)));
        assertThrows(InvalidMapParametersException.class,
                () -> service.run(new RunRequest(4, -1, 1, 1, 1)));
    }

    @Test
    void rejectsNonPositiveIncrementsPerThread() {
        assertThrows(InvalidMapParametersException.class,
                () -> service.run(new RunRequest(4, 1, 0, 1, 1)));
    }

    @Test
    void rejectsNonPositiveDistinctKeys() {
        assertThrows(InvalidMapParametersException.class,
                () -> service.run(new RunRequest(4, 1, 1, 0, 1)));
    }

    @Test
    void rejectsNonPositiveComputeRacers() {
        assertThrows(InvalidMapParametersException.class,
                () -> service.run(new RunRequest(4, 1, 1, 1, 0)));
    }

    @Test
    void rejectsParametersBeyondTheSafetyCeiling() {
        assertThrows(InvalidMapParametersException.class,
                () -> service.run(new RunRequest(10_000, 1, 1, 1, 1)));
        assertThrows(InvalidMapParametersException.class,
                () -> service.run(new RunRequest(4, 500, 1, 1, 1)));
        assertThrows(InvalidMapParametersException.class,
                () -> service.run(new RunRequest(4, 1, 10_000, 1, 1)));
        assertThrows(InvalidMapParametersException.class,
                () -> service.run(new RunRequest(4, 1, 1, 500, 1)));
        assertThrows(InvalidMapParametersException.class,
                () -> service.run(new RunRequest(4, 1, 1, 1, 500)));
    }
}
