package com.lld.airline;

import com.lld.airline.enums.SeatStatus;
import com.lld.airline.model.Booking;
import com.lld.airline.model.Flight;
import com.lld.airline.model.Passenger;
import com.lld.airline.repository.AirlineRepository;
import com.lld.airline.service.AirlineService;
import com.lld.airline.service.PaymentProcessor;
import com.lld.airline.service.SeatLockManager;
import com.lld.airline.strategy.ClassBasedPricingStrategy;
import com.lld.airline.strategy.DemandSurgePricingStrategy;
import com.lld.airline.strategy.NonRefundableFarePolicy;
import com.lld.airline.strategy.PricingStrategyFactory;
import com.lld.airline.strategy.RefundPolicyFactory;
import com.lld.airline.strategy.TieredCancellationRefundPolicy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Real threads + latches proving the classic airline race — two passengers trying to book the same
 * seat at the same instant — resolves to exactly one winner, never a double-sale and never a
 * deadlock, under {@code SeatLockManager}'s per-seat {@code ReentrantLock} + ascending lock order.
 */
public class AirlineConcurrencyTest {

    private AirlineService service;

    @BeforeEach
    void setUp() {
        SeatLockManager lockManager = new SeatLockManager();
        PaymentProcessor paymentProcessor = new PaymentProcessor();
        RefundPolicyFactory refundPolicyFactory = new RefundPolicyFactory(new TieredCancellationRefundPolicy(), new NonRefundableFarePolicy());
        PricingStrategyFactory pricingStrategyFactory = new PricingStrategyFactory(new ClassBasedPricingStrategy(), new DemandSurgePricingStrategy());
        service = new AirlineService(new AirlineRepository(), lockManager, paymentProcessor, refundPolicyFactory, pricingStrategyFactory);
    }

    @RepeatedTest(20)
    void exactlyOneThreadWinsAContestedSeatHold() throws InterruptedException {
        Flight flight = service.getAllFlights().get(0);
        String flightId = flight.getFlightId();
        String contestedSeat = "14A"; // untouched economy seat on the seeded 737 layout (rows 3-15)

        int threadCount = 12;
        ExecutorService pool = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);
        AtomicInteger successes = new AtomicInteger(0);
        AtomicInteger rejections = new AtomicInteger(0);

        try {
            for (int i = 0; i < threadCount; i++) {
                String userId = "racer-" + i;
                pool.submit(() -> {
                    try {
                        startGate.await(); // all threads race the same instant, not staggered by scheduling
                        service.holdSeats(flightId, List.of(contestedSeat), userId);
                        successes.incrementAndGet();
                    } catch (Exception e) {
                        rejections.incrementAndGet();
                    } finally {
                        doneLatch.countDown();
                    }
                });
            }

            startGate.countDown();
            assertTrue(doneLatch.await(10, TimeUnit.SECONDS), "All racer threads must finish within timeout");
        } finally {
            pool.shutdown();
        }

        assertEquals(1, successes.get(), "Exactly one thread must win the hold on the contested seat");
        assertEquals(threadCount - 1, rejections.get(), "Every other thread must be rejected, not silently dropped");
        assertEquals(SeatStatus.HELD, flight.getSeat(contestedSeat).getStatus());
    }

    @Test
    void exactlyOneThreadWinsAContestedSeatBooking() throws InterruptedException {
        Flight flight = service.getAllFlights().get(0);
        String flightId = flight.getFlightId();
        String contestedSeat = "11B"; // rows 3-15 are the seeded economy cabin

        int threadCount = 10;
        ExecutorService pool = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);
        AtomicInteger booked = new AtomicInteger(0);

        try {
            for (int i = 0; i < threadCount; i++) {
                String userId = "buyer-" + i;
                pool.submit(() -> {
                    try {
                        startGate.await();
                        // Each thread independently attempts the full hold -> confirm workflow on the
                        // same seat; only the caller that wins the hold can ever reach confirmSeats
                        // successfully, so this exercises both SeatLockManager entry points at once.
                        service.holdSeats(flightId, List.of(contestedSeat), userId);
                        Booking booking = service.bookFlight(flightId, List.of(contestedSeat),
                                List.of(Passenger.builder().passengerId("P-" + userId).name(userId)
                                        .email(userId + "@x.com").passportOrId("ID-" + userId).build()),
                                userId, "CARD", "IDEMP-" + userId);
                        if (booking != null) {
                            booked.incrementAndGet();
                        }
                    } catch (Exception ignored) {
                        // Expected for every loser of the race
                    } finally {
                        doneLatch.countDown();
                    }
                });
            }

            startGate.countDown();
            assertTrue(doneLatch.await(10, TimeUnit.SECONDS));
        } finally {
            pool.shutdown();
        }

        assertEquals(1, booked.get(), "Exactly one passenger must end up with a confirmed booking on the seat");
        assertEquals(SeatStatus.BOOKED, flight.getSeat(contestedSeat).getStatus());
    }

    @Test
    void disjointSeatHoldsAllSucceedInParallelWithoutBlockingEachOther() throws InterruptedException {
        Flight flight = service.getAllFlights().get(0);
        String flightId = flight.getFlightId();
        List<String> seats = List.of("13A", "13B", "13C", "13D", "13E", "13F"); // one full economy row

        ExecutorService pool = Executors.newFixedThreadPool(seats.size());
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(seats.size());
        AtomicInteger successes = new AtomicInteger(0);

        try {
            for (String seat : seats) {
                pool.submit(() -> {
                    try {
                        startGate.await();
                        service.holdSeats(flightId, List.of(seat), "user-" + seat);
                        successes.incrementAndGet();
                    } catch (Exception ignored) {
                    } finally {
                        doneLatch.countDown();
                    }
                });
            }

            startGate.countDown();
            assertTrue(doneLatch.await(10, TimeUnit.SECONDS));
        } finally {
            pool.shutdown();
        }

        assertEquals(seats.size(), successes.get(), "Disjoint seats never contend on the same lock, so every hold must succeed");
        for (String seat : seats) {
            assertEquals(SeatStatus.HELD, flight.getSeat(seat).getStatus());
        }
    }

    @Test
    void multiSeatLockOrderingPreventsDeadlockUnderReversedRequestOrder() throws InterruptedException {
        Flight flight = service.getAllFlights().get(0);
        String flightId = flight.getFlightId();

        // Two threads request the same two seats in opposite order — a naive "lock in request order"
        // implementation would deadlock (A holds seat1 waiting for seat2, B holds seat2 waiting for
        // seat1). SeatLockManager always sorts seat numbers before locking, so this must complete
        // promptly with exactly one winner instead of hanging.
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(2);
        AtomicInteger successes = new AtomicInteger(0);

        try {
            pool.submit(() -> {
                try {
                    startGate.await();
                    service.holdSeats(flightId, List.of("9A", "9B"), "thread-A");
                    successes.incrementAndGet();
                } catch (Exception ignored) {
                } finally {
                    doneLatch.countDown();
                }
            });
            pool.submit(() -> {
                try {
                    startGate.await();
                    service.holdSeats(flightId, List.of("9B", "9A"), "thread-B");
                    successes.incrementAndGet();
                } catch (Exception ignored) {
                } finally {
                    doneLatch.countDown();
                }
            });

            startGate.countDown();
            assertTrue(doneLatch.await(5, TimeUnit.SECONDS), "Reversed multi-seat lock order must not deadlock");
        } finally {
            pool.shutdown();
        }

        assertEquals(1, successes.get(), "Exactly one of the two overlapping multi-seat holds must win");
    }
}
