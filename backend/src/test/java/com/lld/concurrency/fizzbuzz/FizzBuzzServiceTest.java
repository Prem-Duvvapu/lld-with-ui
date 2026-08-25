package com.lld.concurrency.fizzbuzz;

import com.lld.concurrency.fizzbuzz.exception.InvalidFizzBuzzParametersException;
import com.lld.concurrency.fizzbuzz.model.EventType;
import com.lld.concurrency.fizzbuzz.model.RunRequest;
import com.lld.concurrency.fizzbuzz.model.RunResult;
import com.lld.concurrency.fizzbuzz.model.TraceEvent;
import com.lld.concurrency.fizzbuzz.service.FizzBuzzService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Exercises the orchestration layer: real threads run end to end through the
 * service, and the returned {@link RunResult} is checked for the properties that
 * only hold if the concurrency was real — the exact canonical FizzBuzz string,
 * every EventType observed, and a strictly sequence-ordered trace.
 */
class FizzBuzzServiceTest {

    private final FizzBuzzService service = new FizzBuzzService();

    @Test
    void nullRequestUsesSensibleDefaults() {
        RunResult result = service.run(null);
        assertEquals(FizzBuzzService.DEFAULT_N, result.n());
        assertEquals(4, result.threadCount());
    }

    @Test
    void rejectsNonPositiveN() {
        assertThrows(InvalidFizzBuzzParametersException.class, () -> service.run(new RunRequest(0)));
        assertThrows(InvalidFizzBuzzParametersException.class, () -> service.run(new RunRequest(-5)));
    }

    @Test
    void rejectsNBeyondTheSafetyCeiling() {
        assertThrows(InvalidFizzBuzzParametersException.class, () -> service.run(new RunRequest(1_000_000)));
    }

    private static String expected(int n) {
        StringBuilder sb = new StringBuilder();
        for (int i = 1; i <= n; i++) {
            if (sb.length() > 0) sb.append(' ');
            if (i % 15 == 0) sb.append("FizzBuzz");
            else if (i % 3 == 0) sb.append("Fizz");
            else if (i % 5 == 0) sb.append("Buzz");
            else sb.append(i);
        }
        return sb.toString();
    }

    @Test
    @Timeout(30)
    void stressRunAlwaysProducesTheExactCanonicalSequenceAcrossManyIterations() {
        for (int i = 0; i < 25; i++) {
            RunResult result = service.run(new RunRequest(50));
            assertEquals(expected(50), result.result(), "iteration " + i + " produced a corrupted sequence");
        }
    }

    @Test
    @Timeout(15)
    void traceCoversEveryEventTypeAndIsOrderedBySequence() {
        RunResult result = service.run(new RunRequest(30));

        Set<EventType> observed = result.events().stream().map(TraceEvent::type).collect(Collectors.toSet());
        assertEquals(Set.of(EventType.values()), observed, "expected every event type to occur at least once");

        List<TraceEvent> trace = result.events();
        long prevSeq = -1;
        for (TraceEvent event : trace) {
            assertTrue(event.sequence() > prevSeq, "trace must be strictly increasing by sequence");
            prevSeq = event.sequence();
        }
    }
}
