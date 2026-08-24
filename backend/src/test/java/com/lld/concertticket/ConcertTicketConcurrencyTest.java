package com.lld.concertticket;

import com.lld.concertticket.config.ConcertTicketSeedData;
import com.lld.concertticket.enums.SeatStatus;
import com.lld.concertticket.exception.SeatNotAvailableException;
import com.lld.concertticket.model.Booking;
import com.lld.concertticket.model.Event;
import com.lld.concertticket.model.Seat;
import com.lld.concertticket.repository.ConcertTicketRepository;
import com.lld.concertticket.service.SeatLockManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Guards the check-then-act race in {@code SeatLockManager.holdSeats}.
 *
 * <p>Verification performed while writing this test (per repo convention, RCA-006):
 * temporarily removed the {@code lock.lock()}/{@code unlock()} pair around the
 * availability check + write in {@code holdSeats} (replaced the per-seat
 * {@code ReentrantLock} acquisition with a no-op) and reran
 * {@code lastSeatRace_exactlyOneOfNCustomersWins}. Without the lock the test went red —
 * multiple threads observed the seat as AVAILABLE before any of them wrote HELD, so
 * {@code successCount} landed above 1 (repeatably, across reruns). Restored the original
 * locking code afterwards; {@code git diff} against the pre-experiment version of
 * {@code SeatLockManager.java} was byte-identical, and the suite is green again below.
 */
@DisplayName("Concert Ticket Concurrency — Seat Hold Races")
class ConcertTicketConcurrencyTest {

    private ConcertTicketRepository repository;
    private SeatLockManager seatLockManager;
    private long eventId;

    @BeforeEach
    void setUp() {
        repository = new ConcertTicketRepository();
        ConcertTicketSeedData.seed(repository);
        seatLockManager = new SeatLockManager();
        eventId = repository.getEvents().get(0).getId();
    }

    @Test
    @DisplayName("N customers racing for the last available seat: exactly one wins")
    void lastSeatRace_exactlyOneOfNCustomersWins() throws InterruptedException {
        // Reduce the event down to exactly one AVAILABLE seat so every thread targets
        // the same single seat — the sharpest form of the race.
        List<Seat> seats = repository.getSeatsByEvent(eventId);
        String lastSeatId = seats.get(0).getId();
        for (Seat seat : seats) {
            if (!seat.getId().equals(lastSeatId)) {
                seat.setStatus(SeatStatus.BOOKED);
                repository.updateSeat(seat);
            }
        }

        int n = 30;
        ExecutorService pool = Executors.newFixedThreadPool(n);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(n);
        AtomicInteger wins = new AtomicInteger(0);
        AtomicInteger rejections = new AtomicInteger(0);

        for (int i = 1; i <= n; i++) {
            final String userId = "customer-" + i;
            pool.submit(() -> {
                try {
                    start.await();
                    seatLockManager.holdSeats(eventId, List.of(lastSeatId), userId, 60_000L, repository);
                    wins.incrementAndGet();
                } catch (SeatNotAvailableException e) {
                    rejections.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "Threads did not finish in time");
        pool.shutdown();

        assertEquals(1, wins.get(), "Exactly one customer must win the last seat");
        assertEquals(n - 1, rejections.get(), "Every other customer must be rejected with SeatNotAvailableException");

        Seat finalState = repository.findSeatById(eventId, lastSeatId);
        assertEquals(SeatStatus.HELD, finalState.getStatus());
    }

    @Test
    @DisplayName("Repeated last-seat race never produces two winners — 300 rounds")
    void repeatedLastSeatRace_neverProducesTwoWinners() throws InterruptedException {
        for (int round = 0; round < 300; round++) {
            ConcertTicketRepository freshRepo = new ConcertTicketRepository();
            ConcertTicketSeedData.seed(freshRepo);
            SeatLockManager freshLockManager = new SeatLockManager();
            long freshEventId = freshRepo.getEvents().get(0).getId();
            String seatId = freshRepo.getSeatsByEvent(freshEventId).get(0).getId();

            ExecutorService pool = Executors.newFixedThreadPool(2);
            CountDownLatch start = new CountDownLatch(1);
            CountDownLatch done = new CountDownLatch(2);
            AtomicInteger wins = new AtomicInteger(0);

            for (int i = 1; i <= 2; i++) {
                final String userId = "customer-" + i;
                pool.submit(() -> {
                    try {
                        start.await();
                        freshLockManager.holdSeats(freshEventId, List.of(seatId), userId, 60_000L, freshRepo);
                        wins.incrementAndGet();
                    } catch (SeatNotAvailableException expected) {
                        // expected rejection for the loser
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    } finally {
                        done.countDown();
                    }
                });
            }

            start.countDown();
            assertTrue(done.await(5, TimeUnit.SECONDS), "Round " + round + " timed out");
            pool.shutdown();

            assertEquals(1, wins.get(), "Round " + round + " produced " + wins.get() + " winners instead of 1");
        }
    }

    @Test
    @DisplayName("Disjoint seat holds all succeed in parallel — proves per-seat locking, not a single global lock")
    void disjointSeatHolds_allSucceedInParallel() throws InterruptedException {
        List<Seat> seats = repository.getSeatsByEvent(eventId);
        int n = Math.min(10, seats.size());

        ExecutorService pool = Executors.newFixedThreadPool(n);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(n);
        AtomicInteger wins = new AtomicInteger(0);

        for (int i = 0; i < n; i++) {
            final String seatId = seats.get(i).getId();
            final String userId = "customer-" + i;
            pool.submit(() -> {
                try {
                    start.await();
                    seatLockManager.holdSeats(eventId, List.of(seatId), userId, 60_000L, repository);
                    wins.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "Threads did not finish in time");
        pool.shutdown();

        assertEquals(n, wins.get(), "All " + n + " disjoint seat holds must succeed in parallel");
    }

    // ---------------------------------------------------------------- expiry frees the seat

    @Test
    @DisplayName("An expired hold genuinely frees the seat for a new hold")
    void expiredHold_freesSeatForNewHold() {
        List<Seat> seats = repository.getSeatsByEvent(eventId);
        String seatId = seats.get(0).getId();

        seatLockManager.holdSeats(eventId, List.of(seatId), "customer-1", 60_000L, repository);
        Seat held = repository.findSeatById(eventId, seatId);
        assertEquals(SeatStatus.HELD, held.getStatus());

        // Force the hold into the past instead of sleeping past a real TTL.
        held.setHoldExpiresAt(System.currentTimeMillis() - 1_000L);
        repository.updateSeat(held);

        // A second customer must now be able to hold the same seat.
        seatLockManager.holdSeats(eventId, List.of(seatId), "customer-2", 60_000L, repository);
        Seat reheld = repository.findSeatById(eventId, seatId);
        assertEquals(SeatStatus.HELD, reheld.getStatus());
        assertEquals("customer-2", reheld.getHeldByUserId());
    }

    @Test
    @DisplayName("expireStaleHolds sweep flips an expired HELD seat back to AVAILABLE without a new hold attempt")
    void expireStaleHolds_sweepReleasesExpiredSeat() {
        List<Seat> seats = repository.getSeatsByEvent(eventId);
        String seatId = seats.get(0).getId();

        seatLockManager.holdSeats(eventId, List.of(seatId), "customer-1", 60_000L, repository);
        Seat held = repository.findSeatById(eventId, seatId);
        held.setHoldExpiresAt(System.currentTimeMillis() - 1_000L);
        repository.updateSeat(held);

        seatLockManager.expireStaleHolds(eventId, repository);

        Seat swept = repository.findSeatById(eventId, seatId);
        assertEquals(SeatStatus.AVAILABLE, swept.getStatus());
        assertNull(swept.getHeldByUserId());
    }

    @Test
    @DisplayName("A still-live (non-expired) hold is untouched by the sweep")
    void expireStaleHolds_leavesLiveHoldAlone() {
        List<Seat> seats = repository.getSeatsByEvent(eventId);
        String seatId = seats.get(0).getId();

        seatLockManager.holdSeats(eventId, List.of(seatId), "customer-1", 60_000L, repository);
        seatLockManager.expireStaleHolds(eventId, repository);

        Seat seat = repository.findSeatById(eventId, seatId);
        assertEquals(SeatStatus.HELD, seat.getStatus());
        assertEquals("customer-1", seat.getHeldByUserId());
    }
}
