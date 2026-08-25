package com.lld.concurrency.h2o;

import com.lld.concurrency.h2o.exception.InvalidH2OParametersException;
import com.lld.concurrency.h2o.model.EventType;
import com.lld.concurrency.h2o.model.RunRequest;
import com.lld.concurrency.h2o.model.RunResult;
import com.lld.concurrency.h2o.model.TraceEvent;
import com.lld.concurrency.h2o.service.H2OService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Exercises the orchestration layer: real threads run end to end through the
 * service, and the returned {@link RunResult} is checked for the properties that
 * only hold if the concurrency was real — never 3 of the same atom adjacent, the
 * correct 2:1 H:O ratio, and a strictly sequence-ordered trace.
 */
class H2OServiceTest {

    private final H2OService service = new H2OService();

    @Test
    void nullRequestUsesSensibleDefaults() {
        RunResult result = service.run(null);
        assertEquals(H2OService.DEFAULT_MOLECULE_COUNT, result.moleculeCount());
        assertEquals(H2OService.DEFAULT_MOLECULE_COUNT * 2, result.hydrogenCount());
        assertEquals(H2OService.DEFAULT_MOLECULE_COUNT, result.oxygenCount());
        assertEquals(result.hydrogenCount() + result.oxygenCount(), result.threadCount());
    }

    @Test
    void rejectsNonPositiveMoleculeCount() {
        assertThrows(InvalidH2OParametersException.class, () -> service.run(new RunRequest(0)));
        assertThrows(InvalidH2OParametersException.class, () -> service.run(new RunRequest(-5)));
    }

    @Test
    void rejectsMoleculeCountBeyondTheSafetyCeiling() {
        assertThrows(InvalidH2OParametersException.class, () -> service.run(new RunRequest(100_000)));
    }

    @Test
    @Timeout(30)
    void stressRunNeverProducesThreeOfTheSameAtomAdjacentAcrossManyIterations() {
        for (int i = 0; i < 25; i++) {
            RunResult result = service.run(new RunRequest(15));
            String[] tokens = result.result().split(" ");
            assertEquals(45, tokens.length, "iteration " + i);

            for (int idx = 0; idx + 2 < tokens.length; idx++) {
                boolean allSame = tokens[idx].equals(tokens[idx + 1]) && tokens[idx + 1].equals(tokens[idx + 2]);
                assertFalse(allSame, "iteration " + i + ": 3 consecutive same atoms at index " + idx);
            }
        }
    }

    @Test
    @Timeout(15)
    void traceCoversEveryEventTypeAndIsOrderedBySequence() {
        RunResult result = service.run(new RunRequest(10));

        Set<EventType> observed = result.events().stream().map(TraceEvent::type).collect(Collectors.toSet());
        assertEquals(Set.of(EventType.values()), observed, "expected every event type to occur at least once");

        List<TraceEvent> trace = result.events();
        long prevSeq = -1;
        for (TraceEvent event : trace) {
            assertTrue(event.sequence() > prevSeq, "trace must be strictly increasing by sequence");
            prevSeq = event.sequence();
        }

        long bondedEvents = trace.stream().filter(e -> e.type() == EventType.MOLECULE_BONDED).count();
        assertEquals(10, bondedEvents);
    }
}
