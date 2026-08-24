package com.lld.carrental;

import com.lld.carrental.exception.VehicleNotAvailableException;
import com.lld.carrental.model.*;
import com.lld.carrental.repository.CarRentalRepository;
import com.lld.carrental.service.ReservationLockService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Guards the overlapping-interval race in {@link ReservationLockService}: two customers must
 * never both walk away with a confirmed reservation for the same vehicle on overlapping dates.
 *
 * <p>This is a genuinely different shape from uber's single-boolean driver race — the check here
 * spans a whole <i>set</i> of existing reservations, not one flag, so it is possible to get the
 * locking right and still get the read wrong (e.g. reading the reservation list before acquiring
 * the lock, or only checking the first match). Deleting the lock, or moving the reservation-set
 * read outside the {@code lock.lock()}/{@code finally} block in {@code ReservationLockService},
 * must make these tests fail. If they still pass without it, they are certifying the bug as
 * fixed, which is worse than not having them at all.
 */
@DisplayName("Car Rental Concurrency & Overlapping-Interval Reservation Races")
class CarRentalConcurrencyTest {

    private CarRentalRepository repository;
    private ReservationLockService lockService;
    private static final LocalDate TODAY = LocalDate.now();

    @BeforeEach
    void setUp() {
        repository = new CarRentalRepository();
        lockService = new ReservationLockService(repository);
    }

    private Vehicle registerVehicle(String id) {
        Vehicle v = Vehicle.builder().id(id).make("Ford").model("Explorer").year(2023)
                .licensePlate("PL-" + id).type(VehicleType.SUV).status(VehicleStatus.AVAILABLE)
                .branchId("BR-1").odometer(0).build();
        repository.saveVehicle(v);
        return v;
    }

    @Test
    @DisplayName("Two customers racing for the exact same dates on one vehicle: exactly one wins")
    void twoCustomersRacingForSameDates_onlyOneWins() throws InterruptedException {
        registerVehicle("V1");
        LocalDate start = TODAY.plusDays(5), end = TODAY.plusDays(10);

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(2);
        AtomicInteger wins = new AtomicInteger();
        AtomicInteger rejections = new AtomicInteger();

        for (String customer : List.of("alice", "bob")) {
            pool.submit(() -> {
                try {
                    startLatch.await();
                    lockService.reserve("V1", customer, start, end, 5000.0, "STANDARD");
                    wins.incrementAndGet();
                } catch (VehicleNotAvailableException expected) {
                    rejections.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        startLatch.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "reservation did not finish — possible deadlock");
        pool.shutdown();

        assertEquals(1, wins.get(), "exactly one customer may claim the vehicle for these dates");
        assertEquals(1, rejections.get(), "the losing customer must be told the vehicle is unavailable");

        long blocking = repository.getReservationsForVehicle("V1").stream()
                .filter(r -> r.getStatus().blocksCalendar())
                .count();
        assertEquals(1, blocking, "only one reservation may occupy this date range");
    }

    @Test
    @DisplayName("Twenty customers storming one vehicle for overlapping dates: nineteen are rejected")
    void twentyCustomersOneVehicle_nineteenRejected() throws InterruptedException {
        registerVehicle("V1");
        LocalDate start = TODAY.plusDays(5), end = TODAY.plusDays(10);
        int customers = 20;

        ExecutorService pool = Executors.newFixedThreadPool(customers);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(customers);
        AtomicInteger wins = new AtomicInteger();

        for (int i = 0; i < customers; i++) {
            String customer = "cust-" + i;
            // Overlapping but not identical ranges — the check must catch partial overlap too.
            LocalDate myStart = start.plusDays(i % 3);
            LocalDate myEnd = end.plusDays(i % 3);
            pool.submit(() -> {
                try {
                    startLatch.await();
                    lockService.reserve("V1", customer, myStart, myEnd, 5000.0, "STANDARD");
                    wins.incrementAndGet();
                } catch (VehicleNotAvailableException expected) {
                    // lost the race
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        startLatch.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "reservation did not finish — possible deadlock");
        pool.shutdown();

        assertEquals(1, wins.get(), "the vehicle was handed to more than one customer for overlapping dates");
    }

    @Test
    @DisplayName("Non-overlapping concurrent reservations on the SAME vehicle all succeed")
    void nonOverlappingReservationsOnSameVehicleAllSucceed() throws InterruptedException {
        // This is the point of date-range booking: contention must be scoped to actual date
        // overlap, not "any two reservations on this vehicle at the same time".
        registerVehicle("V1");
        int slots = 15;

        ExecutorService pool = Executors.newFixedThreadPool(slots);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(slots);
        AtomicInteger wins = new AtomicInteger();
        List<String> failures = Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < slots; i++) {
            int slot = i;
            LocalDate start = TODAY.plusDays(slot * 3L);
            LocalDate end = TODAY.plusDays(slot * 3L + 2);
            pool.submit(() -> {
                try {
                    startLatch.await();
                    lockService.reserve("V1", "cust-" + slot, start, end, 1000.0, "STANDARD");
                    wins.incrementAndGet();
                } catch (Exception e) {
                    failures.add(e.getMessage());
                } finally {
                    done.countDown();
                }
            });
        }

        startLatch.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "reservations did not finish");
        pool.shutdown();

        assertEquals(slots, wins.get(), "non-overlapping ranges must not contend: " + failures);
    }

    @Test
    @DisplayName("Disjoint vehicles do not block each other — ten vehicles, ten customers, ten wins")
    void disjointVehiclesAllSucceed() throws InterruptedException {
        int pairs = 10;
        LocalDate start = TODAY.plusDays(5), end = TODAY.plusDays(8);
        for (int i = 0; i < pairs; i++) {
            registerVehicle("V" + i);
        }

        ExecutorService pool = Executors.newFixedThreadPool(pairs);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(pairs);
        AtomicInteger wins = new AtomicInteger();

        for (int i = 0; i < pairs; i++) {
            String vehicleId = "V" + i;
            pool.submit(() -> {
                try {
                    startLatch.await();
                    lockService.reserve(vehicleId, "cust-" + vehicleId, start, end, 1000.0, "STANDARD");
                    wins.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        startLatch.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "per-vehicle locks should not have serialised unrelated work");
        pool.shutdown();

        assertEquals(pairs, wins.get(), "independent vehicle reservations must not contend with each other");
    }

    @Test
    @DisplayName("The race repeated 300 times: never two winners, not even once")
    void repeatedRaceNeverProducesTwoWinners() throws InterruptedException {
        // A single run can pass by luck — the unguarded window between reading the reservation
        // set and writing the new one is only nanoseconds wide, so one attempt may simply not
        // interleave. Repeating the race makes a narrow window overwhelmingly likely to be hit.
        int rounds = 300;
        ExecutorService pool = Executors.newFixedThreadPool(2);
        LocalDate start = TODAY.plusDays(5), end = TODAY.plusDays(10);

        try {
            for (int round = 0; round < rounds; round++) {
                CarRentalRepository repo = new CarRentalRepository();
                ReservationLockService local = new ReservationLockService(repo);
                Vehicle v = Vehicle.builder().id("V1").make("Ford").model("Explorer").year(2023)
                        .licensePlate("PL-V1").type(VehicleType.SUV).status(VehicleStatus.AVAILABLE)
                        .branchId("BR-1").odometer(0).build();
                repo.saveVehicle(v);

                CountDownLatch startLatch = new CountDownLatch(1);
                CountDownLatch done = new CountDownLatch(2);
                AtomicInteger wins = new AtomicInteger();

                for (String customer : List.of("alice", "bob")) {
                    pool.submit(() -> {
                        try {
                            startLatch.await();
                            local.reserve("V1", customer, start, end, 1000.0, "STANDARD");
                            wins.incrementAndGet();
                        } catch (VehicleNotAvailableException expected) {
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
                assertEquals(1, wins.get(), "round " + round + " handed the vehicle to two customers");
            }
        } finally {
            pool.shutdown();
            assertTrue(pool.awaitTermination(10, TimeUnit.SECONDS), "pool did not shut down");
        }
    }

    @Test
    @DisplayName("Reserving an unknown vehicle from many threads never throws anything but VehicleNotFoundException")
    void unknownVehicleIsNullSafeUnderConcurrency() throws InterruptedException {
        int threads = 10;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch done = new CountDownLatch(threads);
        AtomicInteger notFound = new AtomicInteger();

        for (int i = 0; i < threads; i++) {
            pool.submit(() -> {
                try {
                    lockService.reserve("GHOST", "cust", TODAY.plusDays(1), TODAY.plusDays(2), 1000.0, "STANDARD");
                } catch (com.lld.carrental.exception.VehicleNotFoundException expected) {
                    notFound.incrementAndGet();
                } finally {
                    done.countDown();
                }
            });
        }

        assertTrue(done.await(5, TimeUnit.SECONDS));
        pool.shutdown();
        assertEquals(threads, notFound.get());
    }

    @Test
    @DisplayName("Concurrent reservations across many vehicles all persist with unique ids")
    void concurrentReservationsAllPersistWithUniqueIds() throws InterruptedException {
        int count = 50;
        for (int i = 0; i < count; i++) {
            registerVehicle("V" + i);
        }
        ExecutorService pool = Executors.newFixedThreadPool(16);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(count);
        Set<String> ids = ConcurrentHashMap.newKeySet();

        for (int i = 0; i < count; i++) {
            String vehicleId = "V" + i;
            pool.submit(() -> {
                try {
                    startLatch.await();
                    Reservation r = lockService.reserve(vehicleId, "cust-" + vehicleId,
                            TODAY.plusDays(1), TODAY.plusDays(2), 1000.0, "STANDARD");
                    ids.add(r.getId());
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        startLatch.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "reservation creation did not finish");
        pool.shutdown();

        assertEquals(count, ids.size(), "duplicate reservation ids were handed out");
        assertEquals(count, repository.getAllReservations().size(), "reservations were lost on write");
    }
}
