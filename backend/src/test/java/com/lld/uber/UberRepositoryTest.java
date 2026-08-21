package com.lld.uber;

import com.lld.uber.model.*;
import com.lld.uber.payment.Payment;
import com.lld.uber.repository.UberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.concurrent.*;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Uber Repository Storage & Lookup")
class UberRepositoryTest {

    private UberRepository repository;
    private Location cityCentre;

    @BeforeEach
    void setUp() {
        repository = new UberRepository();
        cityCentre = new Location(12.9716, 77.5946, "MG Road");
    }

    private Driver driver(String id, DriverStatus status, VehicleType type, Location at) {
        Driver d = new Driver(id, "Driver " + id, "9000000000", type, "KA-01-" + id, at);
        d.setStatus(status);
        return d;
    }

    @Test
    @DisplayName("Absent lookups return null rather than throwing")
    void absentLookupsReturnNull() {
        assertNull(repository.getDriver("NO-SUCH-DRIVER"));
        assertNull(repository.getRider("NO-SUCH-RIDER"));
        assertNull(repository.getRide("NO-SUCH-RIDE"));
        assertNull(repository.getPayment("NO-SUCH-PAYMENT"));
    }

    @Test
    @DisplayName("Empty collections are returned as empty lists, never null")
    void emptyCollectionsAreEmptyNotNull() {
        assertNotNull(repository.getAllDrivers());
        assertNotNull(repository.getAllRiders());
        assertNotNull(repository.getAllRides());
        assertTrue(repository.getAllDrivers().isEmpty());
        assertTrue(repository.getAvailableDrivers(VehicleType.UBER_GO).isEmpty());
    }

    @Test
    @DisplayName("Drivers and riders round-trip through the store")
    void entitiesRoundTrip() {
        Driver d = driver("D1", DriverStatus.AVAILABLE, VehicleType.UBER_GO, cityCentre);
        repository.registerDriver(d);

        Rider r = new Rider("R1", "Alice", "9111111111", cityCentre);
        repository.registerRider(r);

        assertSame(d, repository.getDriver("D1"));
        assertSame(r, repository.getRider("R1"));
        assertEquals(1, repository.getAllDrivers().size());
        assertEquals(1, repository.getAllRiders().size());
    }

    @Test
    @DisplayName("Re-registering an id replaces rather than duplicates")
    void reRegisteringReplaces() {
        repository.registerDriver(driver("D1", DriverStatus.AVAILABLE, VehicleType.UBER_GO, cityCentre));
        repository.registerDriver(driver("D1", DriverStatus.OFFLINE, VehicleType.UBER_XL, cityCentre));

        assertEquals(1, repository.getAllDrivers().size());
        assertEquals(DriverStatus.OFFLINE, repository.getDriver("D1").getStatus());
        assertEquals(VehicleType.UBER_XL, repository.getDriver("D1").getVehicleType());
    }

    @Test
    @DisplayName("Available-driver search filters by both status and vehicle class")
    void availableDriversFilterByStatusAndType() {
        repository.registerDriver(driver("A", DriverStatus.AVAILABLE, VehicleType.UBER_GO, cityCentre));
        repository.registerDriver(driver("B", DriverStatus.ON_TRIP, VehicleType.UBER_GO, cityCentre));
        repository.registerDriver(driver("C", DriverStatus.OFFLINE, VehicleType.UBER_GO, cityCentre));
        repository.registerDriver(driver("D", DriverStatus.AVAILABLE, VehicleType.UBER_XL, cityCentre));

        List<Driver> go = repository.getAvailableDrivers(VehicleType.UBER_GO);
        assertEquals(1, go.size());
        assertEquals("A", go.get(0).getId());
    }

    @Test
    @DisplayName("Nearest-driver search honours the radius and returns closest first")
    void nearestDriversAreSortedAndBounded() {
        // ~1.1 km per 0.01 degree of latitude near Bengaluru.
        Location near = new Location(12.9816, 77.5946, "1 km north");
        Location far = new Location(13.2716, 77.5946, "~33 km north");

        repository.registerDriver(driver("FAR", DriverStatus.AVAILABLE, VehicleType.UBER_GO, far));
        repository.registerDriver(driver("NEAR", DriverStatus.AVAILABLE, VehicleType.UBER_GO, near));

        List<Driver> within5km = repository.findNearestAvailableDrivers(cityCentre, VehicleType.UBER_GO, 5.0);
        assertEquals(1, within5km.size(), "the far driver should have been excluded by radius");
        assertEquals("NEAR", within5km.get(0).getId());

        List<Driver> within50km = repository.findNearestAvailableDrivers(cityCentre, VehicleType.UBER_GO, 50.0);
        assertEquals(2, within50km.size());
        assertEquals("NEAR", within50km.get(0).getId(), "closest driver must sort first");
    }

    @Test
    @DisplayName("A driver with no location is skipped rather than crashing the search")
    void driverWithoutLocationIsSkipped() {
        repository.registerDriver(driver("NOLOC", DriverStatus.AVAILABLE, VehicleType.UBER_GO, null));
        assertDoesNotThrow(() -> repository.findNearestAvailableDrivers(cityCentre, VehicleType.UBER_GO, 10.0));
        assertTrue(repository.findNearestAvailableDrivers(cityCentre, VehicleType.UBER_GO, 10.0).isEmpty());
    }

    @Test
    @DisplayName("Ride ids are sequential and zero-padded")
    void rideIdsAreSequential() {
        assertEquals("RIDE-00001", repository.generateRideId());
        assertEquals("RIDE-00002", repository.generateRideId());
        assertEquals("RIDE-00003", repository.generateRideId());
    }

    @Test
    @DisplayName("Ride id generation is atomic under contention — no duplicates across 200 threads")
    void rideIdGenerationIsAtomic() throws InterruptedException {
        int threads = 200;
        ExecutorService pool = Executors.newFixedThreadPool(32);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        Set<String> ids = ConcurrentHashMap.newKeySet();

        for (int i = 0; i < threads; i++) {
            pool.submit(() -> {
                try {
                    start.await();
                    ids.add(repository.generateRideId());
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "id generation did not finish — possible deadlock");
        pool.shutdown();

        assertEquals(threads, ids.size(), "the counter lost updates and handed out duplicate ride ids");
    }

    @Test
    @DisplayName("Driver-visible requests exclude other vehicle classes, non-REQUESTED rides and declines")
    void availableRequestsAreFiltered() {
        repository.registerDriver(driver("D1", DriverStatus.AVAILABLE, VehicleType.UBER_GO, cityCentre));
        Location drop = new Location(12.9352, 77.6245, "Koramangala");

        Ride mine = new Ride("RIDE-1", "R1", cityCentre, drop, 5.0, 85.0, VehicleType.UBER_GO);
        Ride wrongClass = new Ride("RIDE-2", "R2", cityCentre, drop, 5.0, 115.0, VehicleType.UBER_XL);
        Ride alreadyTaken = new Ride("RIDE-3", "R3", cityCentre, drop, 5.0, 85.0, VehicleType.UBER_GO);
        alreadyTaken.setStatus(RideStatus.ACCEPTED);
        Ride declined = new Ride("RIDE-4", "R4", cityCentre, drop, 5.0, 85.0, VehicleType.UBER_GO);
        declined.addDeclinedDriver("D1");

        List.of(mine, wrongClass, alreadyTaken, declined).forEach(repository::saveRide);

        List<String> visible = repository.getAvailableRideRequestsForDriver("D1").stream()
                .map(Ride::getId).collect(Collectors.toList());

        assertEquals(List.of("RIDE-1"), visible);
    }

    @Test
    @DisplayName("An unknown driver sees no requests instead of every request")
    void unknownDriverSeesNothing() {
        assertTrue(repository.getAvailableRideRequestsForDriver("GHOST").isEmpty());
    }

    @Test
    @DisplayName("Rides are filtered by user and payments round-trip")
    void ridesByUserAndPayments() {
        Location drop = new Location(12.9352, 77.6245, "Koramangala");
        repository.saveRide(new Ride("RIDE-1", "alice", cityCentre, drop, 5.0, 85.0, VehicleType.UBER_GO));
        repository.saveRide(new Ride("RIDE-2", "bob", cityCentre, drop, 5.0, 85.0, VehicleType.UBER_GO));

        assertEquals(1, repository.getRidesByUser("alice").size());
        assertTrue(repository.getRidesByUser("carol").isEmpty());

        Payment payment = new Payment("PAY-1", "RIDE-1", 85.0, "UPI");
        repository.savePayment(payment);
        assertSame(payment, repository.getPayment("PAY-1"));
    }

    @Test
    @DisplayName("Concurrent driver writes are all visible — the store is genuinely concurrent")
    void concurrentDriverWritesAllLand() throws InterruptedException {
        int count = 300;
        ExecutorService pool = Executors.newFixedThreadPool(16);
        CountDownLatch done = new CountDownLatch(count);

        IntStream.range(0, count).forEach(i -> pool.submit(() -> {
            try {
                repository.registerDriver(
                        driver("D" + i, DriverStatus.AVAILABLE, VehicleType.UBER_GO, cityCentre));
            } finally {
                done.countDown();
            }
        }));

        assertTrue(done.await(10, TimeUnit.SECONDS), "writes did not finish");
        pool.shutdown();

        assertEquals(count, repository.getAllDrivers().size(),
                "a HashMap would have lost writes here; the store must be concurrent");
    }
}
