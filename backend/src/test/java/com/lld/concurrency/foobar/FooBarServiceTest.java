package com.lld.concurrency.foobar;

import com.lld.concurrency.foobar.exception.InvalidFooBarParametersException;
import com.lld.concurrency.foobar.model.EventType;
import com.lld.concurrency.foobar.model.RunRequest;
import com.lld.concurrency.foobar.model.RunResult;
import com.lld.concurrency.foobar.model.TraceEvent;
import com.lld.concurrency.foobar.service.FooBarService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Exercises the orchestration layer: real threads run end to end through the
 * service, and the returned {@link RunResult} is checked for the properties that
 * only hold if the concurrency was real — the exact "foobar" repeated string, and
 * a strictly sequence-ordered trace.
 */
class FooBarServiceTest {

    private final FooBarService service = new FooBarService();

    @Test
    void nullRequestUsesSensibleDefaults() {
        RunResult result = service.run(null);
        assertEquals(FooBarService.DEFAULT_N, result.n());
        assertEquals("foobar".repeat(FooBarService.DEFAULT_N), result.result());
        assertEquals(2, result.threadCount());
    }

    @Test
    void rejectsNonPositiveN() {
        assertThrows(InvalidFooBarParametersException.class, () -> service.run(new RunRequest(0)));
        assertThrows(InvalidFooBarParametersException.class, () -> service.run(new RunRequest(-5)));
    }

    @Test
    void rejectsNBeyondTheSafetyCeiling() {
        assertThrows(InvalidFooBarParametersException.class, () -> service.run(new RunRequest(10_000)));
    }

    @Test
    @Timeout(20)
    void stressRunAlwaysProducesTheExactExpectedStringAcrossManyIterations() {
        for (int i = 0; i < 30; i++) {
            RunResult result = service.run(new RunRequest(40));
            assertEquals("foobar".repeat(40), result.result(), "iteration " + i + " produced a corrupted result");
        }
    }

    @Test
    @Timeout(15)
    void traceIsOrderedByIncreasingSequenceAndCoversBothEventFamilies() {
        RunResult result = service.run(new RunRequest(20));

        List<TraceEvent> trace = result.events();
        assertTrue(trace.size() > 0);
        long prevSeq = -1;
        for (TraceEvent event : trace) {
            assertTrue(event.sequence() > prevSeq, "trace must be strictly increasing by sequence");
            prevSeq = event.sequence();
            assertTrue(event.elapsedNanos() >= 0);
            assertTrue(event.threadName().equals("foo-thread") || event.threadName().equals("bar-thread"));
        }

        long fooPrinted = trace.stream().filter(e -> e.type() == EventType.FOO_PRINTED).count();
        long barPrinted = trace.stream().filter(e -> e.type() == EventType.BAR_PRINTED).count();
        assertEquals(20, fooPrinted);
        assertEquals(20, barPrinted);
    }
}
