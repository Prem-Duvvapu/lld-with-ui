package com.lld.concurrency.blockingqueue;

import com.lld.concurrency.blockingqueue.exception.InvalidQueueParametersException;
import com.lld.concurrency.blockingqueue.model.EventType;
import com.lld.concurrency.blockingqueue.model.RunRequest;
import com.lld.concurrency.blockingqueue.model.RunResult;
import com.lld.concurrency.blockingqueue.model.TraceEvent;
import com.lld.concurrency.blockingqueue.service.BlockingQueueService;
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
 * service, and the returned {@link RunResult} trace is checked for the properties
 * that only hold if the concurrency was real — sequence-ordered events, the bound
 * never exceeded, and an exactly-once delivery multiset match between what was
 * produced and what was consumed.
 */
class BlockingQueueServiceTest {

    private final BlockingQueueService service = new BlockingQueueService();

    @Test
    void nullRequestUsesSensibleDefaults() {
        RunResult result = service.run(null);
        assertEquals(BlockingQueueService.DEFAULT_CAPACITY, result.capacity());
        assertEquals(BlockingQueueService.DEFAULT_PRODUCERS, result.producers());
        assertEquals(BlockingQueueService.DEFAULT_CONSUMERS, result.consumers());
        assertEquals(BlockingQueueService.DEFAULT_ITEMS_PER_PRODUCER, result.itemsPerProducer());
        assertEquals(result.producers() * result.itemsPerProducer(), result.totalItems());
    }

    @Test
    void rejectsNonPositiveCapacity() {
        assertThrows(InvalidQueueParametersException.class,
                () -> service.run(new RunRequest(0, 1, 1, 1)));
        assertThrows(InvalidQueueParametersException.class,
                () -> service.run(new RunRequest(-5, 1, 1, 1)));
    }

    @Test
    void rejectsNonPositiveThreadCountsAndItemCounts() {
        assertThrows(InvalidQueueParametersException.class,
                () -> service.run(new RunRequest(5, 0, 1, 1)));
        assertThrows(InvalidQueueParametersException.class,
                () -> service.run(new RunRequest(5, 1, 0, 1)));
        assertThrows(InvalidQueueParametersException.class,
                () -> service.run(new RunRequest(5, 1, 1, 0)));
    }

    @Test
    void rejectsParametersBeyondTheSafetyCeiling() {
        assertThrows(InvalidQueueParametersException.class,
                () -> service.run(new RunRequest(10_000, 1, 1, 1)));
        assertThrows(InvalidQueueParametersException.class,
                () -> service.run(new RunRequest(5, 500, 1, 1)));
        assertThrows(InvalidQueueParametersException.class,
                () -> service.run(new RunRequest(5, 1, 500, 1)));
        assertThrows(InvalidQueueParametersException.class,
                () -> service.run(new RunRequest(5, 1, 1, 10_000)));
    }

    @Test
    @Timeout(15)
    void traceCoversEveryEventTypeForASmallContendedRun() {
        // capacity 1 with 2 producers/2 consumers guarantees both blocking paths fire.
        RunResult result = service.run(new RunRequest(1, 2, 2, 5));

        Set<EventType> observed = result.trace().stream().map(TraceEvent::type).collect(Collectors.toSet());
        assertEquals(Set.of(EventType.values()), observed, "expected every event type to occur at least once");
    }

    @Test
    @Timeout(15)
    void traceIsOrderedByIncreasingSequenceAndCarriesRealTimestamps() {
        RunResult result = service.run(new RunRequest(3, 2, 2, 10));

        List<TraceEvent> trace = result.trace();
        assertTrue(trace.size() > 0);
        long prevSeq = -1;
        for (TraceEvent event : trace) {
            assertTrue(event.sequence() > prevSeq, "trace must be strictly increasing by sequence");
            prevSeq = event.sequence();
            assertTrue(event.elapsedNanos() >= 0);
            assertTrue(event.threadName().startsWith("producer-") || event.threadName().startsWith("consumer-"));
        }
    }

    @Test
    @Timeout(20)
    void stressRunNeverExceedsCapacityAndDeliversEveryItemExactlyOnce() {
        int capacity = 6;
        int producers = 10;
        int consumers = 10;
        int itemsPerProducer = 40;

        RunResult result = service.run(new RunRequest(capacity, producers, consumers, itemsPerProducer));

        assertEquals(producers * itemsPerProducer, result.totalItems());
        assertTrue(result.maxObservedSize() <= capacity,
                "observed size " + result.maxObservedSize() + " exceeded capacity " + capacity);

        for (TraceEvent event : result.trace()) {
            assertTrue(event.queueSize() >= 0 && event.queueSize() <= capacity,
                    "trace entry recorded an out-of-bounds queue size: " + event);
        }

        List<String> producedItems = result.trace().stream()
                .filter(e -> e.type() == EventType.ENQUEUE_SUCCESS)
                .map(TraceEvent::item)
                .collect(Collectors.toList());
        List<String> consumedItems = result.trace().stream()
                .filter(e -> e.type() == EventType.DEQUEUE_SUCCESS)
                .map(TraceEvent::item)
                .collect(Collectors.toList());

        assertEquals(result.totalItems(), producedItems.size());
        assertEquals(result.totalItems(), consumedItems.size());
        assertEquals(Set.copyOf(producedItems), Set.copyOf(consumedItems),
                "every produced item must be consumed, and nothing extra");
        assertEquals(producedItems.size(), Set.copyOf(producedItems).size(), "producer ids must be unique");
        assertEquals(consumedItems.size(), Set.copyOf(consumedItems).size(), "no item consumed more than once");
    }
}
