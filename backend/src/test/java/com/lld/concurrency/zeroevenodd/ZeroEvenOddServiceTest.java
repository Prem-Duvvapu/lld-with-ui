package com.lld.concurrency.zeroevenodd;

import com.lld.concurrency.zeroevenodd.exception.InvalidZeroEvenOddParametersException;
import com.lld.concurrency.zeroevenodd.model.EventType;
import com.lld.concurrency.zeroevenodd.model.RunRequest;
import com.lld.concurrency.zeroevenodd.model.RunResult;
import com.lld.concurrency.zeroevenodd.model.TraceEvent;
import com.lld.concurrency.zeroevenodd.service.ZeroEvenOddService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Exercises the orchestration layer: real threads run end to end through the
 * service, and the returned {@link RunResult} is checked for the properties that
 * only hold if the concurrency was real — the exact "0 1 0 2 ..." interleave, and
 * a strictly sequence-ordered trace where zero always precedes each number.
 */
class ZeroEvenOddServiceTest {

    private final ZeroEvenOddService service = new ZeroEvenOddService();

    @Test
    void nullRequestUsesSensibleDefaults() {
        RunResult result = service.run(null);
        assertEquals(ZeroEvenOddService.DEFAULT_N, result.n());
        assertEquals(3, result.threadCount());
    }

    @Test
    void rejectsNonPositiveN() {
        assertThrows(InvalidZeroEvenOddParametersException.class, () -> service.run(new RunRequest(0)));
        assertThrows(InvalidZeroEvenOddParametersException.class, () -> service.run(new RunRequest(-5)));
    }

    @Test
    void rejectsNBeyondTheSafetyCeiling() {
        assertThrows(InvalidZeroEvenOddParametersException.class, () -> service.run(new RunRequest(1_000_000)));
    }

    private static String expectedSequence(int n) {
        StringBuilder sb = new StringBuilder();
        for (int i = 1; i <= n; i++) {
            if (sb.length() > 0) sb.append(' ');
            sb.append('0').append(' ').append(i);
        }
        return sb.toString();
    }

    @Test
    @Timeout(30)
    void stressRunAlwaysProducesTheExactInterleaveAcrossManyIterations() {
        for (int i = 0; i < 30; i++) {
            RunResult result = service.run(new RunRequest(37));
            assertEquals(expectedSequence(37), result.result(), "iteration " + i + " produced a corrupted sequence");
        }
    }

    @Test
    @Timeout(15)
    void traceIsOrderedAndZeroAlwaysImmediatelyPrecedesEachNumber() {
        RunResult result = service.run(new RunRequest(20));

        List<TraceEvent> trace = result.events();
        long prevSeq = -1;
        for (TraceEvent event : trace) {
            assertTrue(event.sequence() > prevSeq, "trace must be strictly increasing by sequence");
            prevSeq = event.sequence();
        }

        List<TraceEvent> printedOnly = trace.stream()
                .filter(e -> e.type() == EventType.ZERO_PRINTED || e.type() == EventType.ODD_PRINTED
                        || e.type() == EventType.EVEN_PRINTED)
                .toList();

        assertEquals(40, printedOnly.size()); // n zeros + n numbers
        for (int i = 0; i < 20; i++) {
            TraceEvent zeroEvent = printedOnly.get(2 * i);
            TraceEvent numberEvent = printedOnly.get(2 * i + 1);
            assertEquals(EventType.ZERO_PRINTED, zeroEvent.type(), "position " + (2 * i) + " must be ZERO_PRINTED");
            assertEquals(String.valueOf(i + 1), numberEvent.token(), "expected number " + (i + 1));
            EventType expectedType = (i + 1) % 2 == 1 ? EventType.ODD_PRINTED : EventType.EVEN_PRINTED;
            assertEquals(expectedType, numberEvent.type());
        }
    }
}
