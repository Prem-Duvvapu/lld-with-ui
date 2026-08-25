package com.lld.concurrency.zeroevenodd;

import com.lld.concurrency.zeroevenodd.model.ZeroEvenOddPrinter;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Proves {@link ZeroEvenOddPrinter} is a genuine three-thread coordination
 * primitive: real zero/odd/even threads race against each other, and the
 * three-semaphore handoff is what produces the exact 0 1 0 2 0 3 ... interleave —
 * not a lucky scheduler. Repeats the race many times in a loop (never
 * sleep-and-hope) so a flaky synchronization bug cannot hide behind one lucky run.
 */
class ZeroEvenOddPrinterTest {

    @Test
    void constructorRejectsNonPositiveN() {
        assertThrows(IllegalArgumentException.class, () -> new ZeroEvenOddPrinter(0));
        assertThrows(IllegalArgumentException.class, () -> new ZeroEvenOddPrinter(-3));
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
    void repeatedRacesAlwaysProduceTheExactInterleaveWithNoCorruption() throws InterruptedException {
        int n = 41; // odd, so odd/even thread iteration counts differ
        for (int iteration = 0; iteration < 100; iteration++) {
            ZeroEvenOddPrinter printer = new ZeroEvenOddPrinter(n);

            Thread zeroThread = new Thread(() -> runQuietly(printer::zero), "race-zero-" + iteration);
            Thread oddThread = new Thread(() -> runQuietly(printer::odd), "race-odd-" + iteration);
            Thread evenThread = new Thread(() -> runQuietly(printer::even), "race-even-" + iteration);

            // Start in a scrambled order each iteration to vary scheduling pressure.
            if (iteration % 3 == 0) {
                evenThread.start();
                zeroThread.start();
                oddThread.start();
            } else if (iteration % 3 == 1) {
                oddThread.start();
                evenThread.start();
                zeroThread.start();
            } else {
                zeroThread.start();
                oddThread.start();
                evenThread.start();
            }

            zeroThread.join(5000);
            oddThread.join(5000);
            evenThread.join(5000);

            assertEquals(expectedSequence(n), printer.getResult(),
                    "iteration " + iteration + " produced a corrupted/misordered sequence");
        }
    }

    @FunctionalInterface
    private interface InterruptibleTask {
        void run() throws InterruptedException;
    }

    private void runQuietly(InterruptibleTask task) {
        try {
            task.run();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
