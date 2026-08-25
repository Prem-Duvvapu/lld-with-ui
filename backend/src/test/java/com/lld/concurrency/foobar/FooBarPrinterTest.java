package com.lld.concurrency.foobar;

import com.lld.concurrency.foobar.model.EventType;
import com.lld.concurrency.foobar.model.FooBarPrinter;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Proves {@link FooBarPrinter} is a genuine two-thread strict-alternation
 * primitive: real foo/bar threads race against each other, and the printer's own
 * two-semaphore ping-pong is what prevents interleaving corruption — not a lucky
 * scheduler. Repeats the race many times in a loop (never sleep-and-hope) so a
 * flaky synchronization bug cannot hide behind a single lucky run.
 */
class FooBarPrinterTest {

    @Test
    void constructorRejectsNonPositiveN() {
        assertThrows(IllegalArgumentException.class, () -> new FooBarPrinter(0));
        assertThrows(IllegalArgumentException.class, () -> new FooBarPrinter(-3));
    }

    @Test
    @Timeout(30)
    void repeatedRacesAlwaysProduceExactStrictAlternationWithNoCorruption() throws InterruptedException {
        int n = 50;
        for (int iteration = 0; iteration < 100; iteration++) {
            FooBarPrinter printer = new FooBarPrinter(n);

            Thread fooThread = new Thread(() -> {
                try {
                    printer.foo();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }, "race-foo-" + iteration);
            Thread barThread = new Thread(() -> {
                try {
                    printer.bar();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }, "race-bar-" + iteration);

            barThread.start();
            fooThread.start();
            fooThread.join(5000);
            barThread.join(5000);

            String expected = "foobar".repeat(n);
            assertEquals(expected, printer.getResult(),
                    "iteration " + iteration + " produced corrupted/interleaved output");
        }
    }

    @Test
    @Timeout(15)
    void traceRecordsStrictFooThenBarAlternationForEveryRepetition() throws InterruptedException {
        int n = 30;
        List<com.lld.concurrency.foobar.model.EventType> printedSequence = new CopyOnWriteArrayList<>();
        FooBarPrinter printer = new FooBarPrinter(n, (type, item, repetition) -> {
            if (type == EventType.FOO_PRINTED || type == EventType.BAR_PRINTED) {
                printedSequence.add(type);
            }
        });

        Thread fooThread = new Thread(() -> {
            try {
                printer.foo();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }, "trace-foo");
        Thread barThread = new Thread(() -> {
            try {
                printer.bar();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }, "trace-bar");

        fooThread.start();
        barThread.start();
        fooThread.join(5000);
        barThread.join(5000);

        assertEquals(2 * n, printedSequence.size());
        for (int i = 0; i < n; i++) {
            assertEquals(EventType.FOO_PRINTED, printedSequence.get(2 * i), "expected FOO_PRINTED at position " + (2 * i));
            assertEquals(EventType.BAR_PRINTED, printedSequence.get(2 * i + 1), "expected BAR_PRINTED at position " + (2 * i + 1));
        }
    }
}
