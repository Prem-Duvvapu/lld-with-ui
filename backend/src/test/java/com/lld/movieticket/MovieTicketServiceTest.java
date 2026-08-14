package com.lld.movieticket;

import com.lld.movieticket.exception.BookingFailedException;
import com.lld.movieticket.exception.SeatNotAvailableException;
import com.lld.movieticket.factory.SeatFactory;
import com.lld.movieticket.model.*;
import com.lld.movieticket.observer.SeatMapNotifier;
import com.lld.movieticket.repository.MovieTicketRepository;
import com.lld.movieticket.service.MovieTicketService;
import com.lld.movieticket.service.PaymentProcessor;
import com.lld.movieticket.service.SeatLockManager;
import com.lld.movieticket.strategy.BasePricingStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

public class MovieTicketServiceTest {
    private MovieTicketRepository repository;
    private SeatLockManager seatLockManager;
    private PaymentProcessor paymentProcessor;
    private SeatMapNotifier seatMapNotifier;
    private BasePricingStrategy pricingStrategy;
    private MovieTicketService service;

    @BeforeEach
    public void setUp() {
        repository = new MovieTicketRepository();
        repository.seedInitialData();
        seatLockManager = new SeatLockManager();
        paymentProcessor = new PaymentProcessor();
        seatMapNotifier = new SeatMapNotifier();
        pricingStrategy = new BasePricingStrategy();
        service = new MovieTicketService(repository, seatLockManager, paymentProcessor, seatMapNotifier, pricingStrategy);
    }

    @Test
    public void testHoldSeatsSuccess() {
        Map<String, Object> hold = service.holdSeats(1, List.of(1L, 2L), "user1");
        assertEquals("HELD", hold.get("status"));
        assertEquals(2, ((List<?>) hold.get("seatIds")).size());

        List<Seat> seats = service.getSeats(1);
        Seat s1 = seats.stream().filter(s -> s.getId() == 1L).findFirst().orElseThrow();
        assertEquals(SeatStatus.HELD, s1.getStatus());
        assertEquals("user1", s1.getHeldByUserId());
    }

    @Test
    public void testHoldSeatsConcurrentConflict() throws Exception {
        int threads = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);

        for (int i = 0; i < threads; i++) {
            final String uId = "user" + i;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    service.holdSeats(1, List.of(1L, 2L), uId);
                    successCount.incrementAndGet();
                } catch (SeatNotAvailableException e) {
                    conflictCount.incrementAndGet();
                } catch (Exception ignored) {
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        doneLatch.await(5, TimeUnit.SECONDS);
        executor.shutdown();

        assertEquals(1, successCount.get(), "Exactly one user should succeed in holding seat 1 & 2");
        assertEquals(9, conflictCount.get(), "9 users should fail with SeatNotAvailableException");
    }

    @Test
    public void testBookSeatsSuccess() {
        service.holdSeats(1, List.of(1L, 2L), "user1");
        Booking booking = service.bookSeats(1, List.of(1L, 2L), "user1", PaymentMethod.UPI, "KEY-123");

        assertNotNull(booking);
        assertEquals(BookingStatus.CONFIRMED, booking.getBookingStatus());
        assertEquals("user1", booking.getUserId());
        assertEquals(2, booking.getSeatIds().size());

        List<Seat> seats = service.getSeats(1);
        Seat s1 = seats.stream().filter(s -> s.getId() == 1L).findFirst().orElseThrow();
        assertEquals(SeatStatus.BOOKED, s1.getStatus());
    }

    @Test
    public void testCancelBooking() {
        service.holdSeats(1, List.of(1L, 2L), "user1");
        Booking booking = service.bookSeats(1, List.of(1L, 2L), "user1");

        Booking cancelled = service.cancelBooking(booking.getId());
        assertEquals(BookingStatus.CANCELLED, cancelled.getBookingStatus());

        List<Seat> seats = service.getSeats(1);
        Seat s1 = seats.stream().filter(s -> s.getId() == 1L).findFirst().orElseThrow();
        assertEquals(SeatStatus.AVAILABLE, s1.getStatus());
    }

    @Test
    public void testAllOrNothingRollback() {
        // user1 holds seat 1
        service.holdSeats(1, List.of(1L), "user1");

        // user2 tries to hold seat 1, 2, 3
        assertThrows(SeatNotAvailableException.class, () -> {
            service.holdSeats(1, List.of(1L, 2L, 3L), "user2");
        });

        // Seats 2 and 3 should still be AVAILABLE (rollback verified)
        List<Seat> seats = service.getSeats(1);
        Seat s2 = seats.stream().filter(s -> s.getId() == 2L).findFirst().orElseThrow();
        Seat s3 = seats.stream().filter(s -> s.getId() == 3L).findFirst().orElseThrow();
        assertEquals(SeatStatus.AVAILABLE, s2.getStatus());
        assertEquals(SeatStatus.AVAILABLE, s3.getStatus());
    }

    @Test
    public void testIdempotentBooking() {
        service.holdSeats(1, List.of(1L, 2L), "user1");
        Booking b1 = service.bookSeats(1, List.of(1L, 2L), "user1", PaymentMethod.UPI, "IDEM-KEY-001");
        Booking b2 = service.bookSeats(1, List.of(1L, 2L), "user1", PaymentMethod.UPI, "IDEM-KEY-001");

        assertSame(b1, b2, "Same idempotency key must return exact same Booking instance");
    }

    @Test
    public void testIsolatedSimulationEngine() {
        service.simReset();
        List<Seat> simSeats = service.simGetSeats(1);
        assertNotNull(simSeats);
        assertEquals(24, simSeats.size());

        service.simHoldSeats(1, List.of(1L, 2L), "user1", "Alice");
        List<SimEvent> events = service.simGetEvents();
        assertFalse(events.isEmpty());

        SimEvent lastEvent = events.get(events.size() - 1);
        assertEquals("HOLD_SUCCESS", lastEvent.getEventType());
        assertEquals("Alice", lastEvent.getActorName());

        // Main repository seat #1 should remain AVAILABLE (isolation verified)
        List<Seat> mainSeats = service.getSeats(1);
        Seat mainS1 = mainSeats.stream().filter(s -> s.getId() == 1L).findFirst().orElseThrow();
        assertEquals(SeatStatus.AVAILABLE, mainS1.getStatus());
    }
}
