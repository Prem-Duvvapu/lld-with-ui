package com.lld.movieticket;

import com.lld.movieticket.exception.CancellationFailedException;
import com.lld.movieticket.exception.SeatNotAvailableException;
import com.lld.movieticket.model.Booking;
import com.lld.movieticket.model.PaymentMethod;
import com.lld.movieticket.model.Show;
import com.lld.movieticket.observer.SeatMapNotifier;
import com.lld.movieticket.repository.MovieTicketRepository;
import com.lld.movieticket.service.MovieTicketPaymentProcessor;
import com.lld.movieticket.service.MovieTicketService;
import com.lld.movieticket.service.SeatLockManager;
import com.lld.movieticket.strategy.BasePricingStrategy;
import com.lld.movieticket.strategy.PricingStrategyFactory;
import com.lld.movieticket.strategy.SurgePricingStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Concurrency-flavour tests, split out of {@code MovieTicketServiceTest} (which keeps the original
 * hold-conflict test) so each flavour lives in its own file, matching splitwise/uber's convention.
 */
public class MovieTicketConcurrencyTest {
    private MovieTicketRepository repository;
    private MovieTicketService service;

    @BeforeEach
    public void setUp() {
        repository = new MovieTicketRepository();
        repository.seedInitialData();
        SeatLockManager seatLockManager = new SeatLockManager();
        MovieTicketPaymentProcessor paymentProcessor = new MovieTicketPaymentProcessor();
        SeatMapNotifier seatMapNotifier = new SeatMapNotifier();
        PricingStrategyFactory pricingStrategyFactory = new PricingStrategyFactory(new BasePricingStrategy(), new SurgePricingStrategy());
        service = new MovieTicketService(repository, seatLockManager, paymentProcessor, seatMapNotifier, pricingStrategyFactory);
    }

    private long firstShowId() {
        return repository.getShowsByMovie(repository.getMovies().get(0).getId()).get(0).getId();
    }

    @Test
    public void concurrentBookingsOnDisjointSeatSetsAllSucceed() throws Exception {
        long showId = firstShowId();
        int threads = 6;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threads);
        AtomicInteger successCount = new AtomicInteger(0);

        // 6 users, each booking a disjoint pair of seats (1&2, 3&4, ... 11&12) on the same show —
        // no seat is contested, so every booking should succeed with no conflicts.
        for (int i = 0; i < threads; i++) {
            final long s1 = i * 2L + 1;
            final long s2 = i * 2L + 2;
            final String userId = "user" + i;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    service.holdSeats(showId, List.of(s1, s2), userId);
                    Booking booking = service.bookSeats(showId, List.of(s1, s2), userId);
                    if (booking != null) successCount.incrementAndGet();
                } catch (Exception ignored) {
                } finally {
                    doneLatch.countDown();
                }
            });
        }
        startLatch.countDown();
        assertTrue(doneLatch.await(5, TimeUnit.SECONDS));
        executor.shutdown();

        assertEquals(threads, successCount.get(), "disjoint seat sets never conflict, so all bookings succeed");
        assertEquals(threads, repository.getBookingsByUserId("user0").size()
                + repository.getBookingsByUserId("user1").size()
                + repository.getBookingsByUserId("user2").size()
                + repository.getBookingsByUserId("user3").size()
                + repository.getBookingsByUserId("user4").size()
                + repository.getBookingsByUserId("user5").size());
    }

    @Test
    public void concurrentBookAttemptsOnTheSameSeatsExactlyOneWins() throws Exception {
        long showId = firstShowId();
        int threads = 8;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threads);
        AtomicInteger bookedCount = new AtomicInteger(0);
        AtomicInteger rejectedCount = new AtomicInteger(0);

        for (int i = 0; i < threads; i++) {
            final String userId = "contender" + i;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    service.holdSeats(showId, List.of(5L, 6L), userId);
                    service.bookSeats(showId, List.of(5L, 6L), userId, PaymentMethod.UPI, null);
                    bookedCount.incrementAndGet();
                } catch (SeatNotAvailableException e) {
                    rejectedCount.incrementAndGet();
                } catch (Exception ignored) {
                } finally {
                    doneLatch.countDown();
                }
            });
        }
        startLatch.countDown();
        assertTrue(doneLatch.await(5, TimeUnit.SECONDS));
        executor.shutdown();

        assertEquals(1, bookedCount.get(), "exactly one contender should walk away with the seats booked");
        assertEquals(threads - 1, rejectedCount.get());
    }

    @Test
    public void concurrentCancelOfTheSameBookingOnlyOneSucceeds() throws Exception {
        long showId = firstShowId();
        service.holdSeats(showId, List.of(1L, 2L), "user1");
        Booking booking = service.bookSeats(showId, List.of(1L, 2L), "user1");
        Show showBeforeCancel = repository.findShowById(showId);
        int availableBefore = showBeforeCancel.getAvailableSeats();

        int threads = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threads);
        AtomicInteger cancelledCount = new AtomicInteger(0);
        AtomicInteger rejectedCount = new AtomicInteger(0);

        for (int i = 0; i < threads; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    service.cancelBooking(booking.getId());
                    cancelledCount.incrementAndGet();
                } catch (CancellationFailedException e) {
                    rejectedCount.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            });
        }
        startLatch.countDown();
        assertTrue(doneLatch.await(5, TimeUnit.SECONDS));
        executor.shutdown();

        assertEquals(1, cancelledCount.get(), "exactly one of N concurrent cancels on the same booking should succeed");
        assertEquals(threads - 1, rejectedCount.get(), "the rest must be rejected as already cancelled, not silently double-applied");

        // RCA-035: before the per-booking lock, N concurrent cancels could each add the booking's
        // seat count to availableSeats, inflating it past the show's real capacity.
        Show showAfterCancel = repository.findShowById(showId);
        assertEquals(availableBefore + booking.getSeatIds().size(), showAfterCancel.getAvailableSeats(),
                "availableSeats must increase by exactly the booking's seat count once, not once per racing thread");
    }
}
