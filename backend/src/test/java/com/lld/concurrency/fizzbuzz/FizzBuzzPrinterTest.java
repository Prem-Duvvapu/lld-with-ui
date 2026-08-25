package com.lld.concurrency.fizzbuzz;

import com.lld.concurrency.fizzbuzz.model.FizzBuzzPrinter;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Proves {@link FizzBuzzPrinter} is a genuine four-thread monitor coordination
 * primitive: real number/fizz/buzz/fizzbuzz threads race against each other, and
 * the shared lock + condition is what produces the exact canonical 1..n output
 * with no duplicate or skipped index — not a lucky scheduler. Repeats the race
 * many times in a loop (never sleep-and-hope) so a flaky synchronization bug
 * cannot hide behind one lucky run.
 */
class FizzBuzzPrinterTest {

    @Test
    void constructorRejectsNonPositiveN() {
        assertThrows(IllegalArgumentException.class, () -> new FizzBuzzPrinter(0));
        assertThrows(IllegalArgumentException.class, () -> new FizzBuzzPrinter(-3));
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
    @Timeout(60)
    void repeatedRacesAlwaysProduceTheExactCanonicalSequenceWithNoCorruption() throws InterruptedException {
        int n = 45; // covers plain numbers, Fizz, Buzz and FizzBuzz
        for (int iteration = 0; iteration < 100; iteration++) {
            FizzBuzzPrinter printer = new FizzBuzzPrinter(n);

            Thread numberThread = new Thread(() -> runQuietly(printer::number), "race-number-" + iteration);
            Thread fizzThread = new Thread(() -> runQuietly(printer::fizz), "race-fizz-" + iteration);
            Thread buzzThread = new Thread(() -> runQuietly(printer::buzz), "race-buzz-" + iteration);
            Thread fizzbuzzThread = new Thread(() -> runQuietly(printer::fizzbuzz), "race-fizzbuzz-" + iteration);

            // Vary start order to vary scheduling pressure across iterations.
            Thread[] order = (iteration % 2 == 0)
                    ? new Thread[]{fizzbuzzThread, buzzThread, fizzThread, numberThread}
                    : new Thread[]{numberThread, fizzThread, buzzThread, fizzbuzzThread};
            for (Thread t : order) {
                t.start();
            }
            for (Thread t : order) {
                t.join(5000);
            }

            assertEquals(expected(n), printer.getResult(),
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
