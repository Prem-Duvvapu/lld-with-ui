package com.lld.concurrency.mergesort;

import com.lld.concurrency.mergesort.exception.InvalidSortParametersException;
import com.lld.concurrency.mergesort.model.RunRequest;
import com.lld.concurrency.mergesort.model.RunResult;
import com.lld.concurrency.mergesort.model.TraceEvent;
import com.lld.concurrency.mergesort.service.MergeSortService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Exercises the orchestration layer: {@link MergeSortService#run} against a
 * default request, an explicit custom array, and a large generated array — checking
 * the returned {@link RunResult} is a genuinely correct sort with a sequence-ordered,
 * non-empty trace — plus the full validation contract.
 */
class MergeSortServiceTest {

    private final MergeSortService service = new MergeSortService();

    private static List<Integer> sortedCopy(List<Integer> values) {
        List<Integer> copy = new ArrayList<>(values);
        copy.sort(Integer::compareTo);
        return copy;
    }

    @Test
    void nullRequestUsesSensibleDefaults() {
        RunResult result = service.run(null);
        assertEquals(MergeSortService.DEFAULT_SIZE, result.size());
        assertEquals(MergeSortService.DEFAULT_PARALLELISM, result.parallelism());
        assertEquals(MergeSortService.DEFAULT_SEQUENTIAL_THRESHOLD, result.sequentialThreshold());
        assertEquals(MergeSortService.DEFAULT_SIZE, result.originalArray().size());
        assertEquals(sortedCopy(result.originalArray()), result.sortedArray());
        assertTrue(result.trace().size() > 0, "expected a non-empty trace");
    }

    @Test
    void sortsAnExplicitCustomArray() {
        List<Integer> array = List.of(5, 3, 8, 1, 9, 2, 7, 4, 6, 0);
        RunRequest request = new RunRequest(array, null, 3, 2);

        RunResult result = service.run(request);

        assertEquals(array, result.originalArray());
        assertEquals(sortedCopy(array), result.sortedArray());
        assertEquals(array.size(), result.size());
        assertTrue(result.trace().size() > 0);
    }

    @Test
    @Timeout(30)
    void sortsALargeGeneratedArray() {
        RunRequest request = new RunRequest(null, 800, 8, 4);

        RunResult result = service.run(request);

        assertEquals(800, result.size());
        assertEquals(800, result.originalArray().size());
        assertEquals(sortedCopy(result.originalArray()), result.sortedArray());
        assertTrue(result.trace().size() > 0);
        assertTrue(result.distinctThreadsUsed() >= 1);
    }

    @Test
    void traceIsOrderedBySequenceAndCarriesRealThreadNames() {
        RunResult result = service.run(new RunRequest(null, 200, 4, 2));

        List<TraceEvent> trace = result.trace();
        assertTrue(trace.size() > 0);
        long prevSeq = -1;
        for (TraceEvent event : trace) {
            assertTrue(event.sequence() > prevSeq, "trace must be strictly increasing by sequence");
            prevSeq = event.sequence();
            assertTrue(event.elapsedNanos() >= 0);
            assertTrue(event.threadName() != null && !event.threadName().isEmpty());
        }
    }

    @Test
    void distinctThreadsUsedMatchesTraceThreadNameCardinality() {
        RunResult result = service.run(new RunRequest(null, 500, 6, 2));
        long distinctFromTrace = result.trace().stream().map(TraceEvent::threadName).distinct().count();
        assertEquals(distinctFromTrace, result.distinctThreadsUsed());
    }

    @Test
    void rejectsNonPositiveSize() {
        assertThrows(InvalidSortParametersException.class,
                () -> service.run(new RunRequest(null, 0, 2, 2)));
        assertThrows(InvalidSortParametersException.class,
                () -> service.run(new RunRequest(null, -5, 2, 2)));
    }

    @Test
    void rejectsNonPositiveParallelismAndThreshold() {
        assertThrows(InvalidSortParametersException.class,
                () -> service.run(new RunRequest(null, 10, 0, 2)));
        assertThrows(InvalidSortParametersException.class,
                () -> service.run(new RunRequest(null, 10, -1, 2)));
        assertThrows(InvalidSortParametersException.class,
                () -> service.run(new RunRequest(null, 10, 2, 0)));
        assertThrows(InvalidSortParametersException.class,
                () -> service.run(new RunRequest(null, 10, 2, -3)));
    }

    @Test
    void rejectsSizeOverTheCeiling() {
        assertThrows(InvalidSortParametersException.class,
                () -> service.run(new RunRequest(null, 1_000_000, 2, 2)));
    }

    @Test
    void rejectsParallelismOverTheCeiling() {
        assertThrows(InvalidSortParametersException.class,
                () -> service.run(new RunRequest(null, 10, 1000, 2)));
    }

    @Test
    void rejectsArrayLengthMismatchedWithSuppliedSize() {
        List<Integer> array = List.of(1, 2, 3);
        assertThrows(InvalidSortParametersException.class,
                () -> service.run(new RunRequest(array, 10, 2, 2)));
    }

    @Test
    void arrayLengthDeterminesSizeWhenSizeIsOmitted() {
        List<Integer> array = List.of(9, 8, 7, 6, 5);
        RunResult result = service.run(new RunRequest(array, null, 2, 2));
        assertEquals(5, result.size());
        assertEquals(Arrays.asList(5, 6, 7, 8, 9), result.sortedArray());
    }
}
