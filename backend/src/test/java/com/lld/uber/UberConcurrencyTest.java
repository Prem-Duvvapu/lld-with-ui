package com.lld.uber;

import com.lld.uber.exception.DriverUnavailableException;
import com.lld.uber.exception.InvalidRideTransitionException;
import com.lld.uber.model.*;
import com.lld.uber.payment.PaymentProcessor;
import com.lld.uber.repository.UberRepository;
import com.lld.uber.service.DriverAssignmentService;
import com.lld.uber.service.UberService;
import com.lld.uber.strategy.FarePricingStrategyFactory;
import com.lld.uber.strategy.StandardFarePricingStrategy;
import com.lld.uber.strategy.SurgeFarePricingStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Guards the check-then-act race that used to live in driver assignment:
 *
 * <pre>
 *   if (driver.isAvailable()) {   // check
 *       driver.setStatus(ON_TRIP); // act — nothing held the driver in between
 *   }
 * </pre>
 *
 * <p>Deleting the lock in {@link DriverAssignmentService} must make these fail. If they
 * still pass without it they are certifying the bug as fixed, which is worse than useless.
 */
@DisplayName("Uber Concurrency & Driver Assignment Races")
class UberConcurrencyTest {

    private UberRepository repository;
    private UberService service;
    private DriverAssignmentService assignment;
    private Location pickup;
    private Location dropoff;

    @BeforeEach
    void setUp() {
        repository = new UberRepository();
        StandardFarePricingStrategy standard = new StandardFarePricingStrategy();
        FarePricingStrategyFactory pricing =
                new FarePricingStrategyFactory(standard, new SurgeFarePricingStrategy(standard));
        assignment = new DriverAssignmentService(repository);
        service = new UberService(repository, new PaymentProcessor(), pricing, assignment);

        pickup = new Location(12.9716, 77.5946, "MG Road");
        dropoff = new Location(12.9352, 77.6245, "Koramangala");
    }

    private Driver registerDriver(String id) {
        Driver d = new Driver(id, "Driver " + id, "9000000000", VehicleType.UBER_GO, "KA-01-" + id, pickup);
        d.setStatus(DriverStatus.AVAILABLE);
        repository.registerDriver(d);
        return d;
    }

    private Ride newRide(String riderId) {
        return service.requestRide(riderId, "12.9716", "77.5946", "MG Road",
                "12.9352", "77.6245", "Koramangala", "UBER_GO", null, null);
    }

    @Test
    @DisplayName("Two riders racing for one driver: exactly one wins, the other is rejected")
    void twoRidersRacingForOneDriver_onlyOneWins() throws InterruptedException {
        registerDriver("D1");
        Ride rideA = newRide("alice");
        Ride rideB = newRide("bob");

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(2);
        AtomicInteger wins = new AtomicInteger();
        AtomicInteger rejections = new AtomicInteger();

        for (Ride ride : List.of(rideA, rideB)) {
            pool.submit(() -> {
                try {
                    start.await();                       // release together, or there is no race
                    service.assignDriver(ride.getId(), "D1");
                    wins.incrementAndGet();
                } catch (DriverUnavailableException expected) {
                    rejections.incrementAndGet();        // the loser — exactly right
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "assignment did not finish — possible deadlock");
        pool.shutdown();

        assertEquals(1, wins.get(), "exactly one rider may claim the driver");
        assertEquals(1, rejections.get(), "the losing rider must be told the driver is gone");
        assertEquals(DriverStatus.ON_TRIP, repository.getDriver("D1").getStatus());

        long accepted = List.of(rideA, rideB).stream()
                .filter(r -> r.getStatus() == RideStatus.ACCEPTED)
                .count();
        assertEquals(1, accepted, "only one ride may end up ACCEPTED");
    }

    @Test
    @DisplayName("Twenty riders storming one driver: nineteen are rejected")
    void twentyRidersOneDriver_nineteenRejected() throws InterruptedException {
        registerDriver("D1");
        int riders = 20;

        List<Ride> rides = new ArrayList<>();
        for (int i = 0; i < riders; i++) {
            rides.add(newRide("rider-" + i));
        }

        ExecutorService pool = Executors.newFixedThreadPool(riders);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(riders);
        AtomicInteger wins = new AtomicInteger();

        for (Ride ride : rides) {
            pool.submit(() -> {
                try {
                    start.await();
                    service.assignDriver(ride.getId(), "D1");
                    wins.incrementAndGet();
                } catch (DriverUnavailableException | InvalidRideTransitionException expected) {
                    // lost the race
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "assignment did not finish — possible deadlock");
        pool.shutdown();

        assertEquals(1, wins.get(), "the driver was handed to more than one rider");
        assertEquals(1, rides.stream().filter(r -> r.getDriverId() != null).count(),
                "exactly one ride may carry a driver id");
    }

    @Test
    @DisplayName("One rider offered many drivers: the ride binds to exactly one of them")
    void oneRideManyDrivers_bindsToOneDriver() throws InterruptedException {
        int drivers = 10;
        for (int i = 0; i < drivers; i++) {
            registerDriver("D" + i);
        }
        Ride ride = newRide("alice");

        ExecutorService pool = Executors.newFixedThreadPool(drivers);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(drivers);
        AtomicInteger wins = new AtomicInteger();

        for (int i = 0; i < drivers; i++) {
            String driverId = "D" + i;
            pool.submit(() -> {
                try {
                    start.await();
                    service.assignDriver(ride.getId(), driverId);
                    wins.incrementAndGet();
                } catch (DriverUnavailableException | InvalidRideTransitionException expected) {
                    // another driver got there first
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "assignment did not finish — possible deadlock");
        pool.shutdown();

        assertEquals(1, wins.get(), "the ride accepted more than one driver");
        assertNotNull(ride.getDriverId());

        long onTrip = repository.getAllDrivers().stream()
                .filter(d -> d.getStatus() == DriverStatus.ON_TRIP)
                .count();
        assertEquals(1, onTrip, "only the winning driver may be marked ON_TRIP");
    }

    @Test
    @DisplayName("Disjoint pairs do not block each other — ten rides, ten drivers, ten wins")
    void disjointAssignmentsAllSucceed() throws InterruptedException {
        int pairs = 10;
        List<Ride> rides = new ArrayList<>();
        for (int i = 0; i < pairs; i++) {
            registerDriver("D" + i);
            rides.add(newRide("rider-" + i));
        }

        ExecutorService pool = Executors.newFixedThreadPool(pairs);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(pairs);
        AtomicInteger wins = new AtomicInteger();

        for (int i = 0; i < pairs; i++) {
            String driverId = "D" + i;
            Ride ride = rides.get(i);
            pool.submit(() -> {
                try {
                    start.await();
                    service.assignDriver(ride.getId(), driverId);
                    wins.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "per-driver locks serialised unrelated work");
        pool.shutdown();

        assertEquals(pairs, wins.get(), "independent assignments must not contend");
    }

    @Test
    @DisplayName("A released driver can be claimed again, and only once")
    void releasedDriverCanBeReclaimedOnce() throws InterruptedException {
        registerDriver("D1");
        Ride first = newRide("alice");
        service.assignDriver(first.getId(), "D1");
        assertEquals(DriverStatus.ON_TRIP, repository.getDriver("D1").getStatus());

        assignment.release("D1", dropoff);
        assertEquals(DriverStatus.AVAILABLE, repository.getDriver("D1").getStatus());
        assertEquals(dropoff.getLabel(), repository.getDriver("D1").getCurrentLocation().getLabel());

        Ride second = newRide("bob");
        Ride third = newRide("carol");

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(2);
        AtomicInteger wins = new AtomicInteger();

        for (Ride ride : List.of(second, third)) {
            pool.submit(() -> {
                try {
                    start.await();
                    service.assignDriver(ride.getId(), "D1");
                    wins.incrementAndGet();
                } catch (DriverUnavailableException expected) {
                    // correct
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "reassignment did not finish");
        pool.shutdown();

        assertEquals(1, wins.get(), "a released driver was handed to two riders");
    }

    @Test
    @DisplayName("The race repeated 300 times: never two winners, not even once")
    void repeatedRaceNeverProducesTwoWinners() throws InterruptedException {
        // A single run can pass by luck — the unguarded window between the check and the
        // write is only nanoseconds wide, so one attempt may simply not interleave. Repeating
        // the race makes a narrow window overwhelmingly likely to be hit at least once.
        int rounds = 300;
        ExecutorService pool = Executors.newFixedThreadPool(2);

        try {
            for (int round = 0; round < rounds; round++) {
                UberRepository repo = new UberRepository();
                StandardFarePricingStrategy standard = new StandardFarePricingStrategy();
                DriverAssignmentService localAssignment = new DriverAssignmentService(repo);
                UberService localService = new UberService(repo, new PaymentProcessor(),
                        new FarePricingStrategyFactory(standard, new SurgeFarePricingStrategy(standard)),
                        localAssignment);

                Driver d = new Driver("D1", "Driver D1", "9000000000", VehicleType.UBER_GO, "KA-01-D1", pickup);
                d.setStatus(DriverStatus.AVAILABLE);
                repo.registerDriver(d);

                Ride rideA = localService.requestRide("alice", "12.9716", "77.5946", "MG Road",
                        "12.9352", "77.6245", "Koramangala", "UBER_GO", null, null);
                Ride rideB = localService.requestRide("bob", "12.9716", "77.5946", "MG Road",
                        "12.9352", "77.6245", "Koramangala", "UBER_GO", null, null);

                CountDownLatch start = new CountDownLatch(1);
                CountDownLatch done = new CountDownLatch(2);
                AtomicInteger wins = new AtomicInteger();

                for (Ride ride : List.of(rideA, rideB)) {
                    pool.submit(() -> {
                        try {
                            start.await();
                            localService.assignDriver(ride.getId(), "D1");
                            wins.incrementAndGet();
                        } catch (DriverUnavailableException | InvalidRideTransitionException expected) {
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
                assertEquals(1, wins.get(), "round " + round + " handed one driver to two riders");
            }
        } finally {
            pool.shutdown();
            assertTrue(pool.awaitTermination(10, TimeUnit.SECONDS), "pool did not shut down");
        }
    }

    @Test
    @DisplayName("Releasing an unknown or null driver is a no-op, not a crash")
    void releaseIsNullSafe() {
        assertDoesNotThrow(() -> assignment.release(null, dropoff));
        assertDoesNotThrow(() -> assignment.release("GHOST", dropoff));
    }

    @Test
    @DisplayName("Concurrent ride requests all persist and receive unique ids")
    void concurrentRideRequestsAllPersist() throws InterruptedException {
        int count = 50;
        ExecutorService pool = Executors.newFixedThreadPool(16);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(count);
        Set<String> ids = ConcurrentHashMap.newKeySet();

        for (int i = 0; i < count; i++) {
            String riderId = "rider-" + i;
            pool.submit(() -> {
                try {
                    start.await();
                    ids.add(newRide(riderId).getId());
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "ride creation did not finish");
        pool.shutdown();

        assertEquals(count, ids.size(), "duplicate ride ids were handed out");
        assertEquals(count, repository.getAllRides().size(), "rides were lost on write");
    }
}
