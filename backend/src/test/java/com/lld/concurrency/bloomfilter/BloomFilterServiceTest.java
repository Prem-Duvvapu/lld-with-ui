package com.lld.concurrency.bloomfilter;

import com.lld.concurrency.bloomfilter.exception.InvalidBloomFilterParametersException;
import com.lld.concurrency.bloomfilter.model.QueryOutcome;
import com.lld.concurrency.bloomfilter.model.RunRequest;
import com.lld.concurrency.bloomfilter.model.RunResult;
import com.lld.concurrency.bloomfilter.model.TraceEvent;
import com.lld.concurrency.bloomfilter.service.BloomFilterService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Exercises the orchestration layer: real adder threads run end to end through the
 * service, and the returned {@link RunResult} is checked for the properties that
 * only hold if the concurrency and the hashing were real — every added item is a
 * true positive, the default parameters reliably (deterministically, not flakily)
 * demonstrate a genuine false positive, and the trace is ordered.
 */
class BloomFilterServiceTest {

    private final BloomFilterService service = new BloomFilterService();

    @Test
    @Timeout(15)
    void nullRequestUsesSensibleDefaults() {
        RunResult result = service.run(null);
        assertEquals(BloomFilterService.DEFAULT_BIT_SIZE, result.bitSize());
        assertEquals(BloomFilterService.DEFAULT_HASH_COUNT, result.hashCount());
        assertEquals(BloomFilterService.DEFAULT_ADD_THREADS, result.addThreads());
        assertEquals(10, result.itemsAdded().size());
    }

    @Test
    @Timeout(15)
    void everyAddedItemIsATruePositive() {
        RunResult result = service.run(null);
        for (String item : result.itemsAdded()) {
            QueryOutcome outcome = result.queries().stream()
                    .filter(q -> q.item().equals(item) && q.wasAdded())
                    .findFirst()
                    .orElseThrow(() -> new AssertionError("no query outcome recorded for added item " + item));
            assertTrue(outcome.mightContain(), "an added item must always be a true positive: " + item);
            assertFalse(outcome.falsePositive(), "an added item can never be flagged a false positive: " + item);
        }
    }

    @Test
    @Timeout(15)
    void defaultParametersReliablyDemonstrateAFalsePositive() {
        // Deterministic given deterministic hashing — must be green every run, not flaky.
        RunResult result = service.run(null);
        assertTrue(result.falsePositiveDemonstrated(),
                "expected the default bitSize/hashCount to reliably produce a false positive");
        assertTrue(result.queries().stream().anyMatch(QueryOutcome::falsePositive),
                "expected at least one QueryOutcome flagged as a false positive");
        long falsePositiveCount = result.queries().stream().filter(QueryOutcome::falsePositive).count();
        assertTrue(falsePositiveCount >= 1);
    }

    @Test
    @Timeout(15)
    void explicitParametersAreHonoredAndStillNeverFalseNegative() {
        RunResult result = service.run(new RunRequest(64, 4, 2));
        assertEquals(64, result.bitSize());
        assertEquals(4, result.hashCount());
        assertEquals(2, result.addThreads());
        for (String item : result.itemsAdded()) {
            QueryOutcome outcome = result.queries().stream()
                    .filter(q -> q.item().equals(item) && q.wasAdded())
                    .findFirst()
                    .orElseThrow();
            assertTrue(outcome.mightContain());
        }
        assertTrue(result.bitsSetCount() >= 0 && result.bitsSetCount() <= 64);
    }

    @Test
    @Timeout(15)
    void traceIsNonEmptyAndSortedBySequence() {
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
    void rejectsNonPositiveBitSize() {
        assertThrows(InvalidBloomFilterParametersException.class,
                () -> service.run(new RunRequest(0, 3, 4)));
        assertThrows(InvalidBloomFilterParametersException.class,
                () -> service.run(new RunRequest(-5, 3, 4)));
    }

    @Test
    void rejectsNonPositiveHashCount() {
        assertThrows(InvalidBloomFilterParametersException.class,
                () -> service.run(new RunRequest(28, 0, 4)));
        assertThrows(InvalidBloomFilterParametersException.class,
                () -> service.run(new RunRequest(28, -1, 4)));
    }

    @Test
    void rejectsNonPositiveAddThreads() {
        assertThrows(InvalidBloomFilterParametersException.class,
                () -> service.run(new RunRequest(28, 3, 0)));
        assertThrows(InvalidBloomFilterParametersException.class,
                () -> service.run(new RunRequest(28, 3, -2)));
    }

    @Test
    void rejectsParametersBeyondTheSafetyCeiling() {
        assertThrows(InvalidBloomFilterParametersException.class,
                () -> service.run(new RunRequest(1_000_000, 3, 4)));
        assertThrows(InvalidBloomFilterParametersException.class,
                () -> service.run(new RunRequest(28, 500, 4)));
        assertThrows(InvalidBloomFilterParametersException.class,
                () -> service.run(new RunRequest(28, 3, 500)));
    }
}
