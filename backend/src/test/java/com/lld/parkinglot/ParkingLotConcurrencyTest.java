package com.lld.parkinglot;

import com.lld.parkinglot.config.ParkingLotInitializer;
import com.lld.parkinglot.exception.SpotNotAvailableException;
import com.lld.parkinglot.exception.TicketAlreadyExitedException;
import com.lld.parkinglot.model.ParkingSpot;
import com.lld.parkinglot.model.Ticket;
import com.lld.parkinglot.repository.ParkingLotRepository;
import com.lld.parkinglot.service.ParkingLotService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Proves the two classic parking-lot races are actually closed by real locking, using
 * {@link CountDownLatch} to force genuine contention rather than sleeps: (1) two vehicles cannot
 * both be assigned the same last spot, and (2) two concurrent exits for the same ticket cannot
 * both succeed and both release the spot / charge the vehicle.
 */
class ParkingLotConcurrencyTest {

    private ParkingLotService service;
    private ParkingLotRepository repository;

    @BeforeEach
    void setUp() {
        repository = new ParkingLotRepository();
        service = new ParkingLotService(repository);
        new ParkingLotInitializer(repository).run();
    }

    @RepeatedTest(5)
    @Timeout(10)
    void concurrentEntry_forTheLastSpot_exactlyOneVehicleWins() throws InterruptedException {
        // Drain every CAR spot but one, so all racing threads contend for the single survivor.
        List<ParkingSpot> carSpots = service.getAvailableSpotsByType("CAR");
        for (int i = 0; i < carSpots.size() - 1; i++) {
            service.entry("G1", "FILLER-" + i, "CAR");
        }
        assertEquals(1, service.getAvailableSpotsByType("CAR").size(), "Exactly one CAR spot should remain before the race");

        int threadCount = 12;
        ExecutorService pool = Executors.newFixedThreadPool(threadCount);
        CountDownLatch ready = new CountDownLatch(threadCount);
        CountDownLatch go = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threadCount);
        AtomicInteger successes = new AtomicInteger(0);
        AtomicInteger rejections = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            int idx = i;
            pool.submit(() -> {
                try {
                    ready.countDown();
                    go.await();
                    service.entry("G1", "RACER-" + idx, "CAR");
                    successes.incrementAndGet();
                } catch (SpotNotAvailableException e) {
                    rejections.incrementAndGet();
                } catch (InterruptedException ignored) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        ready.await();
        go.countDown();
        assertTrue(done.await(8, TimeUnit.SECONDS), "All racing threads should finish");
        pool.shutdown();

        assertEquals(1, successes.get(), "Exactly one thread should win the last spot");
        assertEquals(threadCount - 1, rejections.get(), "Every other thread must be cleanly rejected, never silently dropped");
        assertEquals(0, service.getAvailableSpotsByType("CAR").size(), "No CAR spot should remain after the race");
    }

    @RepeatedTest(5)
    @Timeout(10)
    void concurrentPayAndExit_forTheSameTicket_exactlyOneThreadWins() throws InterruptedException {
        Ticket ticket = service.entry("G1", "KA-01-RACE", "CAR");
        String spotId = ticket.getSpotId();

        int threadCount = 10;
        ExecutorService pool = Executors.newFixedThreadPool(threadCount);
        CountDownLatch ready = new CountDownLatch(threadCount);
        CountDownLatch go = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threadCount);
        AtomicInteger successes = new AtomicInteger(0);
        AtomicInteger rejections = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            pool.submit(() -> {
                try {
                    ready.countDown();
                    go.await();
                    service.payAndExit("G3", ticket.getTicketNumber(), "HOURLY", "CASH");
                    successes.incrementAndGet();
                } catch (TicketAlreadyExitedException e) {
                    rejections.incrementAndGet();
                } catch (InterruptedException ignored) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        ready.await();
        go.countDown();
        assertTrue(done.await(8, TimeUnit.SECONDS), "All racing threads should finish");
        pool.shutdown();

        assertEquals(1, successes.get(), "Exactly one thread should be allowed to pay & exit this ticket");
        assertEquals(threadCount - 1, rejections.get(), "Every other concurrent exit must be cleanly rejected");
        assertFalse(repository.getSpot(spotId).isOccupied(), "Spot must be released exactly once, by the single winner");
    }

    @Test
    @Timeout(10)
    void concurrentEntry_acrossDifferentVehicleTypes_neverCrossAssignsASpot() throws InterruptedException {
        int threadsPerType = 8;
        ExecutorService pool = Executors.newFixedThreadPool(threadsPerType * 2);
        CountDownLatch go = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threadsPerType * 2);

        for (int i = 0; i < threadsPerType; i++) {
            int idx = i;
            pool.submit(() -> {
                try {
                    go.await();
                    service.entry("G1", "CAR-" + idx, "CAR");
                } catch (Exception ignored) {
                } finally {
                    done.countDown();
                }
            });
            pool.submit(() -> {
                try {
                    go.await();
                    service.entry("G1", "BIKE-" + idx, "BIKE");
                } catch (Exception ignored) {
                } finally {
                    done.countDown();
                }
            });
        }

        go.countDown();
        assertTrue(done.await(8, TimeUnit.SECONDS));
        pool.shutdown();

        // No CAR ticket should ever have been assigned a BIKE spot or vice versa.
        for (Ticket t : service.getActiveTickets()) {
            ParkingSpot spot = repository.getSpot(t.getSpotId());
            assertEquals(t.getVehicleType(), spot.getVehicleType(),
                    "Ticket " + t.getTicketNumber() + " was assigned a spot for the wrong vehicle type");
        }
    }
}
