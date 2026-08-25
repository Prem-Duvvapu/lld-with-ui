package com.lld.concurrency.h2o;

import com.lld.concurrency.h2o.model.H2OBonder;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Proves {@link H2OBonder} is a genuine hydrogen/oxygen bonding primitive: real
 * H/O threads race against each other, and the semaphore-bounded
 * {@code CyclicBarrier} is what guarantees every 3 consecutive characters in the
 * output are exactly 2 H's and 1 O — never 3 of the same element adjacent — even
 * under randomised start order and a large atom count. Repeats the race many
 * times in a loop (never sleep-and-hope) so a flaky synchronization bug cannot
 * hide behind one lucky run.
 */
class H2OBonderTest {

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

    private void assertNeverThreeInARow(String[] tokens, String context) {
        for (int i = 0; i + 2 < tokens.length; i++) {
            boolean allSame = tokens[i].equals(tokens[i + 1]) && tokens[i + 1].equals(tokens[i + 2]);
            assertFalse(allSame, context + ": found 3 consecutive \"" + tokens[i] + "\" at index " + i);
        }
    }

    @Test
    @Timeout(60)
    void repeatedRacesNeverProduceThreeOfTheSameAtomAdjacentAcrossManyIterations() throws InterruptedException {
        int molecules = 20; // 40 H + 20 O
        for (int iteration = 0; iteration < 50; iteration++) {
            H2OBonder bonder = new H2OBonder();

            List<Thread> threads = new ArrayList<>();
            for (int h = 1; h <= molecules * 2; h++) {
                threads.add(new Thread(() -> runQuietly(bonder::hydrogen), "race-H-" + iteration + "-" + h));
            }
            for (int o = 1; o <= molecules; o++) {
                threads.add(new Thread(() -> runQuietly(bonder::oxygen), "race-O-" + iteration + "-" + o));
            }
            Collections.shuffle(threads, ThreadLocalRandom.current());

            threads.forEach(Thread::start);
            for (Thread t : threads) {
                t.join(10_000);
                assertFalse(t.isAlive(), t.getName() + " did not finish in time");
            }

            String result = bonder.getResult();
            String[] tokens = result.split(" ");
            assertEquals(molecules * 3, tokens.length, "iteration " + iteration + ": wrong total atom count");

            long hCount = java.util.Arrays.stream(tokens).filter("H"::equals).count();
            long oCount = java.util.Arrays.stream(tokens).filter("O"::equals).count();
            assertEquals(molecules * 2, hCount, "iteration " + iteration + ": wrong hydrogen count");
            assertEquals(molecules, oCount, "iteration " + iteration + ": wrong oxygen count");

            assertNeverThreeInARow(tokens, "iteration " + iteration);

            // Every consecutive non-overlapping window of 3 must be exactly 2H + 1O.
            for (int i = 0; i < tokens.length; i += 3) {
                long windowH = 0;
                long windowO = 0;
                for (int j = i; j < i + 3; j++) {
                    if (tokens[j].equals("H")) windowH++;
                    else windowO++;
                }
                assertTrue(windowH == 2 && windowO == 1,
                        "iteration " + iteration + ": trio at index " + i + " was not 2H+1O");
            }

            assertEquals(molecules, bonder.getMoleculesBonded());
        }
    }
}
