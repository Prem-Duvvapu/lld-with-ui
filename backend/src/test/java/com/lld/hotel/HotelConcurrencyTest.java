package com.lld.hotel;

import com.lld.hotel.exception.RoomUnavailableException;
import com.lld.hotel.model.Booking;
import com.lld.hotel.model.ReservationStatus;
import com.lld.hotel.repository.HotelRepository;
import com.lld.hotel.service.RoomBookingService;
import com.lld.hotel.strategy.CancellationRefundStrategyFactory;
import com.lld.hotel.strategy.FullRefundStrategy;
import com.lld.hotel.strategy.NoRefundStrategy;
import com.lld.hotel.strategy.PartialRefundStrategy;
import com.lld.hotel.strategy.StandardTariffStrategy;
import com.lld.hotel.strategy.TariffStrategyFactory;
import com.lld.hotel.strategy.WeekendTariffStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Guards the check-then-act double-booking race that {@link RoomBookingService} exists to close:
 *
 * <pre>
 *   if (room.getStatus() != AVAILABLE) throw ...;   // check
 *   room.setStatus(BOOKED);                          // act — nothing held the room in between
 * </pre>
 *
 * <p>The fix takes a per-room {@code ReentrantLock} and re-reads + re-checks the room's active
 * bookings for date-range overlap INSIDE the lock. Removing the lock, or moving the overlap
 * check to before {@code lock.lock()}, must make these fail. If they still pass without the fix
 * they are certifying the bug as fixed, which is worse than useless — see RCA.md for the run
 * where this was verified against a deliberately-broken lock.
 */
@DisplayName("Hotel Concurrency & Double-Booking Races")
class HotelConcurrencyTest {

    private HotelRepository repository;
    private RoomBookingService bookingService;

    @BeforeEach
    void setUp() {
        repository = new HotelRepository();
        TariffStrategyFactory tariffStrategyFactory =
                new TariffStrategyFactory(new StandardTariffStrategy(), new WeekendTariffStrategy());
        CancellationRefundStrategyFactory refundStrategyFactory = new CancellationRefundStrategyFactory(
                new FullRefundStrategy(), new PartialRefundStrategy(), new NoRefundStrategy());
        bookingService = new RoomBookingService(repository, tariffStrategyFactory, refundStrategyFactory);
    }

    @Test
    @DisplayName("Twenty guests racing for the last room, identical dates: exactly one wins")
    void twentyGuestsRacingForSameRoomAndDates_onlyOneWins() throws InterruptedException {
        String roomId = "R1";
        LocalDate checkIn = LocalDate.now().plusDays(10);
        LocalDate checkOut = LocalDate.now().plusDays(12);
        int guests = 20;

        ExecutorService pool = Executors.newFixedThreadPool(guests);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(guests);
        AtomicInteger wins = new AtomicInteger();
        AtomicInteger rejections = new AtomicInteger();

        for (int i = 0; i < guests; i++) {
            String guestId = "guest-" + i;
            pool.submit(() -> {
                try {
                    start.await();
                    bookingService.book(roomId, guestId, "Guest " + guestId, checkIn, checkOut);
                    wins.incrementAndGet();
                } catch (RoomUnavailableException expected) {
                    rejections.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "booking did not finish — possible deadlock");
        pool.shutdown();

        assertEquals(1, wins.get(), "exactly one guest may book the room for this date range");
        assertEquals(guests - 1, rejections.get(), "every other guest must be told the room is unavailable");

        long confirmed = repository.findActiveBookingsForRoom(roomId).stream()
                .filter(b -> b.getStatus() == ReservationStatus.CONFIRMED)
                .count();
        assertEquals(1, confirmed, "the room's calendar must only hold one active booking for this range");
    }

    @Test
    @DisplayName("Overlapping (not identical) date ranges racing for one room: exactly one wins")
    void overlappingDateRangesRacingForSameRoom_onlyOneWins() throws InterruptedException {
        String roomId = "R2";
        LocalDate base = LocalDate.now().plusDays(20);
        int guests = 15;

        ExecutorService pool = Executors.newFixedThreadPool(guests);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(guests);
        AtomicInteger wins = new AtomicInteger();

        for (int i = 0; i < guests; i++) {
            String guestId = "guest-" + i;
            // Every range shares the night of base+2, so all of them pairwise overlap no
            // matter which order the threads actually interleave in.
            LocalDate checkIn = base.plusDays(i % 3); // base, base+1, base+2
            LocalDate checkOut = base.plusDays(3);    // all end on the same day
            pool.submit(() -> {
                try {
                    start.await();
                    bookingService.book(roomId, guestId, "Guest " + guestId, checkIn, checkOut);
                    wins.incrementAndGet();
                } catch (RoomUnavailableException expected) {
                    // lost the race
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "booking did not finish — possible deadlock");
        pool.shutdown();

        assertEquals(1, wins.get(), "overlapping ranges must never both be confirmed");
    }

    @Test
    @DisplayName("Non-overlapping ranges on the same room all succeed — the lock serialises, it does not over-reject")
    void nonOverlappingRangesOnSameRoom_allSucceed() throws InterruptedException {
        String roomId = "R3";
        int guests = 10;
        LocalDate start0 = LocalDate.now().plusDays(30);

        ExecutorService pool = Executors.newFixedThreadPool(guests);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(guests);
        AtomicInteger wins = new AtomicInteger();

        for (int i = 0; i < guests; i++) {
            String guestId = "guest-" + i;
            LocalDate ci = start0.plusDays(i * 2L);
            LocalDate co = ci.plusDays(1);
            pool.submit(() -> {
                try {
                    start.await();
                    bookingService.book(roomId, guestId, "Guest " + guestId, ci, co);
                    wins.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "booking did not finish — possible deadlock");
        pool.shutdown();

        assertEquals(guests, wins.get(), "disjoint date ranges on the same room must not contend");
    }

    @Test
    @DisplayName("Disjoint rooms do not block each other")
    void disjointRoomsAllSucceed() throws InterruptedException {
        List<String> roomIds = List.of("R4", "R5", "R6", "R7", "R8");
        LocalDate ci = LocalDate.now().plusDays(40);
        LocalDate co = ci.plusDays(2);

        ExecutorService pool = Executors.newFixedThreadPool(roomIds.size());
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(roomIds.size());
        AtomicInteger wins = new AtomicInteger();

        for (String roomId : roomIds) {
            pool.submit(() -> {
                try {
                    start.await();
                    bookingService.book(roomId, "guest-" + roomId, "Guest " + roomId, ci, co);
                    wins.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "independent room bookings must not deadlock");
        pool.shutdown();

        assertEquals(roomIds.size(), wins.get(), "independent rooms must not contend");
    }

    @Test
    @DisplayName("The race repeated 300 times: never two winners, not even once")
    void repeatedRaceNeverProducesTwoWinners() throws InterruptedException {
        // A single run can pass by luck — the unguarded window between the check and the write
        // is only nanoseconds wide, so one attempt may simply not interleave. Repeating the race
        // makes a narrow window overwhelmingly likely to be hit at least once.
        int rounds = 300;
        ExecutorService pool = Executors.newFixedThreadPool(2);

        try {
            for (int round = 0; round < rounds; round++) {
                HotelRepository repo = new HotelRepository();
                TariffStrategyFactory tariffs =
                        new TariffStrategyFactory(new StandardTariffStrategy(), new WeekendTariffStrategy());
                CancellationRefundStrategyFactory refunds = new CancellationRefundStrategyFactory(
                        new FullRefundStrategy(), new PartialRefundStrategy(), new NoRefundStrategy());
                RoomBookingService local = new RoomBookingService(repo, tariffs, refunds);

                LocalDate ci = LocalDate.now().plusDays(50);
                LocalDate co = ci.plusDays(2);

                CountDownLatch start = new CountDownLatch(1);
                CountDownLatch done = new CountDownLatch(2);
                AtomicInteger wins = new AtomicInteger();

                for (int i = 0; i < 2; i++) {
                    String guestId = "guest-" + i;
                    pool.submit(() -> {
                        try {
                            start.await();
                            local.book("R1", guestId, "Guest " + guestId, ci, co);
                            wins.incrementAndGet();
                        } catch (RoomUnavailableException expected) {
                            // lost the race
                        } catch (InterruptedException e) {
                            Thread.currentThread().interrupt();
                        } finally {
                            done.countDown();
                        }
                    });
                }

                start.countDown();
                assertTrue(done.await(5, TimeUnit.SECONDS), "round " + round + " did not finish");
                assertEquals(1, wins.get(), "round " + round + " double-booked the room");
            }
        } finally {
            pool.shutdown();
            assertTrue(pool.awaitTermination(10, TimeUnit.SECONDS), "pool did not shut down");
        }
    }

    @Test
    @DisplayName("Concurrent bookings on distinct rooms all persist with unique booking ids")
    void concurrentBookingsAllPersistWithUniqueIds() throws InterruptedException {
        List<String> roomIds = List.of("R6", "R7", "R8", "R9", "R10");
        LocalDate ci = LocalDate.now().plusDays(60);
        LocalDate co = ci.plusDays(1);

        ExecutorService pool = Executors.newFixedThreadPool(roomIds.size());
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(roomIds.size());
        Set<String> ids = ConcurrentHashMap.newKeySet();

        for (String roomId : roomIds) {
            pool.submit(() -> {
                try {
                    start.await();
                    Booking b = bookingService.book(roomId, "guest-" + roomId, "Guest " + roomId, ci, co);
                    ids.add(b.getId());
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "booking creation did not finish");
        pool.shutdown();

        assertEquals(roomIds.size(), ids.size(), "duplicate booking ids were handed out");
    }
}
