package com.lld.trafficsignal;

import com.lld.trafficsignal.exception.InvalidOverrideException;
import com.lld.trafficsignal.model.Intersection;
import com.lld.trafficsignal.model.LightState;
import com.lld.trafficsignal.model.TrafficLight;
import com.lld.trafficsignal.observer.SignalChangeNotifier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Guards the one real conflict surface an {@link Intersection} has: two directions GREEN at the
 * same intersection at the same time would mean a collision. {@link Intersection#lock} is what
 * prevents that under concurrent callers — deleting it (or narrowing its scope so a
 * read-then-write is not fully covered) must make these tests fail.
 */
@DisplayName("Intersection Concurrency — no two simultaneous conflicting greens")
class TrafficSignalConcurrencyTest {

    private Intersection intersection;

    private Intersection freshIntersection(int lightCount) {
        List<TrafficLight> lights = new ArrayList<>();
        String[] names = {"North", "South", "East", "West"};
        for (int i = 0; i < lightCount; i++) {
            lights.add(new TrafficLight(i, names[i % names.length]));
        }
        return new Intersection(1, "Concurrency Test Intersection", lights, new SignalChangeNotifier());
    }

    @BeforeEach
    void setUp() {
        intersection = freshIntersection(4);
    }

    @Test
    @DisplayName("Concurrent emergency override requests for different lights: exactly one wins")
    void concurrentEmergencyOverrideRequests_exactlyOneWins() throws InterruptedException {
        int lights = intersection.getLights().size();
        ExecutorService pool = Executors.newFixedThreadPool(lights);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(lights);
        AtomicInteger wins = new AtomicInteger();
        AtomicInteger rejections = new AtomicInteger();

        for (int lightId = 0; lightId < lights; lightId++) {
            final int id = lightId;
            pool.submit(() -> {
                try {
                    startLatch.await();
                    intersection.requestEmergencyOverride(id);
                    wins.incrementAndGet();
                } catch (InvalidOverrideException expected) {
                    rejections.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        startLatch.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "override requests did not finish — possible deadlock");
        pool.shutdown();

        assertEquals(1, wins.get(), "exactly one emergency override request may win");
        assertEquals(lights - 1, rejections.get(), "every other request must be rejected");

        // Final state: exactly one light GREEN (the winner), every other light RED — never two.
        long greenCount = intersection.getLights().stream().filter(l -> l.getCurrentState() == LightState.GREEN).count();
        assertEquals(1, greenCount, "exactly one light may be GREEN after the race");
        assertTrue(intersection.isEmergencyActive());
        assertNotNull(intersection.getEmergencyLightId());
        assertEquals(LightState.GREEN, intersection.getLights().get(intersection.getEmergencyLightId()).getCurrentState());
    }

    @Test
    @DisplayName("The override race repeated 200 times: never two winners, not even once")
    void repeatedOverrideRaceNeverProducesTwoWinners() throws InterruptedException {
        int rounds = 200;
        ExecutorService pool = Executors.newFixedThreadPool(4);
        try {
            for (int round = 0; round < rounds; round++) {
                Intersection local = freshIntersection(4);
                CountDownLatch startLatch = new CountDownLatch(1);
                CountDownLatch done = new CountDownLatch(4);
                AtomicInteger wins = new AtomicInteger();

                for (int lightId = 0; lightId < 4; lightId++) {
                    final int id = lightId;
                    pool.submit(() -> {
                        try {
                            startLatch.await();
                            local.requestEmergencyOverride(id);
                            wins.incrementAndGet();
                        } catch (InvalidOverrideException expected) {
                            // lost the race
                        } catch (InterruptedException e) {
                            Thread.currentThread().interrupt();
                        } finally {
                            done.countDown();
                        }
                    });
                }

                startLatch.countDown();
                assertTrue(done.await(5, TimeUnit.SECONDS), "round " + round + " did not finish");
                assertEquals(1, wins.get(), "round " + round + " produced more than one winner");
            }
        } finally {
            pool.shutdown();
            assertTrue(pool.awaitTermination(10, TimeUnit.SECONDS));
        }
    }

    @Test
    @DisplayName("Many concurrent tick() calls on one intersection never produce two simultaneous non-RED lights")
    void concurrentTicksNeverProduceTwoActiveLights() throws InterruptedException {
        int threads = 32;
        int ticksPerThread = 50;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);

        for (int i = 0; i < threads; i++) {
            pool.submit(() -> {
                try {
                    startLatch.await();
                    for (int t = 0; t < ticksPerThread; t++) {
                        intersection.tick();
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        startLatch.countDown();
        assertTrue(done.await(15, TimeUnit.SECONDS), "concurrent ticking did not finish — possible deadlock");
        pool.shutdown();

        long nonRedCount = intersection.getLights().stream().filter(l -> l.getCurrentState() != LightState.RED).count();
        assertEquals(1, nonRedCount, "exactly one light may be non-RED after any amount of ticking");
    }

    @Test
    @DisplayName("Concurrent manualTransition attempts on the SAME light: at most one legal request can land per phase")
    void concurrentManualTransitionOnSameLight_onlyOneLands() throws InterruptedException {
        // Light 1 (South) starts RED; only a request for GREEN is legal. Many threads race to
        // move it; exactly the ones asking for the (single) legal phase can ever succeed, and
        // once it lands the light is GREEN, so a second GREEN request would itself now be
        // illegal (GREEN's legal next is YELLOW) — the light can only be moved once from RED.
        int attempts = 20;
        ExecutorService pool = Executors.newFixedThreadPool(attempts);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(attempts);
        AtomicInteger succeeded = new AtomicInteger();
        AtomicInteger rejected = new AtomicInteger();

        for (int i = 0; i < attempts; i++) {
            pool.submit(() -> {
                try {
                    startLatch.await();
                    intersection.manualTransition(1, LightState.GREEN);
                    succeeded.incrementAndGet();
                } catch (com.lld.trafficsignal.exception.IllegalSignalTransitionException expected) {
                    rejected.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        startLatch.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "manual transitions did not finish");
        pool.shutdown();

        assertEquals(1, succeeded.get(), "only the first RED->GREEN request may land; the rest must find it already GREEN");
        assertEquals(attempts - 1, rejected.get());
        assertEquals(LightState.GREEN, intersection.getLights().get(1).getCurrentState());
    }
}
