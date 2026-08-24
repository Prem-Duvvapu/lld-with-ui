package com.lld.carrental;

import com.lld.carrental.model.*;
import com.lld.carrental.payment.Payment;
import com.lld.carrental.repository.CarRentalRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.concurrent.*;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Car Rental Repository Storage & Lookup")
class CarRentalRepositoryTest {

    private CarRentalRepository repository;

    @BeforeEach
    void setUp() {
        repository = new CarRentalRepository();
    }

    private Vehicle vehicle(String id, VehicleType type, String branchId) {
        return Vehicle.builder().id(id).make("Test").model("Car").year(2023)
                .licensePlate("PL-" + id).type(type).status(VehicleStatus.AVAILABLE)
                .branchId(branchId).odometer(0).build();
    }

    private Reservation reservation(String id, String vehicleId, LocalDate start, LocalDate end, ReservationStatus status) {
        return Reservation.builder().id(id).customerId("CUST-1").vehicleId(vehicleId)
                .branchId("BR-1").startDate(start).endDate(end).status(status)
                .estimatedCost(100.0).createdAt(java.time.LocalDateTime.now()).build();
    }

    @Test
    @DisplayName("Absent lookups return null rather than throwing")
    void absentLookupsReturnNull() {
        assertNull(repository.getVehicle("NO-SUCH-VEHICLE"));
        assertNull(repository.getCustomer("NO-SUCH-CUSTOMER"));
        assertNull(repository.getBranch("NO-SUCH-BRANCH"));
        assertNull(repository.getReservation("NO-SUCH-RESERVATION"));
        assertNull(repository.getPayment("NO-SUCH-PAYMENT"));
    }

    @Test
    @DisplayName("Empty collections are returned as empty lists, never null")
    void emptyCollectionsAreEmptyNotNull() {
        assertNotNull(repository.getAllVehicles());
        assertTrue(repository.getAllVehicles().isEmpty());
        assertTrue(repository.getReservationsForVehicle("V1").isEmpty());
    }

    @Test
    @DisplayName("Vehicles round-trip through the store")
    void vehiclesRoundTrip() {
        Vehicle v = vehicle("V1", VehicleType.SEDAN, "BR-1");
        repository.saveVehicle(v);
        assertSame(v, repository.getVehicle("V1"));
        assertEquals(1, repository.getAllVehicles().size());
    }

    @Test
    @DisplayName("Vehicle ids are sequential and zero-padded")
    void vehicleIdsAreSequential() {
        assertEquals("VEH-0001", repository.generateVehicleId());
        assertEquals("VEH-0002", repository.generateVehicleId());
    }

    @Test
    @DisplayName("Reservation ids are sequential and zero-padded")
    void reservationIdsAreSequential() {
        assertEquals("RES-00001", repository.generateReservationId());
        assertEquals("RES-00002", repository.generateReservationId());
    }

    @Test
    @DisplayName("Customer registration assigns an id when none is supplied")
    void customerRegistrationAssignsId() {
        Customer c = Customer.builder().name("Alice").build();
        Customer saved = repository.saveCustomer(c);
        assertNotNull(saved.getId());
        assertTrue(saved.getId().startsWith("CUST-"));
    }

    @Test
    @DisplayName("Vehicles are filtered by branch")
    void vehiclesFilteredByBranch() {
        repository.saveVehicle(vehicle("V1", VehicleType.SEDAN, "BR-1"));
        repository.saveVehicle(vehicle("V2", VehicleType.SUV, "BR-2"));
        repository.saveVehicle(vehicle("V3", VehicleType.HATCHBACK, "BR-1"));

        List<Vehicle> br1 = repository.getVehiclesByBranch("BR-1");
        assertEquals(2, br1.size());
        assertTrue(br1.stream().allMatch(v -> v.getBranchId().equals("BR-1")));
    }

    @Test
    @DisplayName("Reservations for a vehicle include every status — filtering by blocksCalendar is the caller's job")
    void reservationsForVehicleIncludeAllStatuses() {
        repository.saveReservation(reservation("RES-1", "V1", LocalDate.now(), LocalDate.now().plusDays(2), ReservationStatus.PENDING));
        repository.saveReservation(reservation("RES-2", "V1", LocalDate.now().plusDays(5), LocalDate.now().plusDays(7), ReservationStatus.CANCELLED));
        repository.saveReservation(reservation("RES-3", "V2", LocalDate.now(), LocalDate.now().plusDays(1), ReservationStatus.PENDING));

        List<Reservation> forV1 = repository.getReservationsForVehicle("V1");
        assertEquals(2, forV1.size());
    }

    @Test
    @DisplayName("Reservations are filtered by customer and payments round-trip")
    void reservationsByCustomerAndPayments() {
        Reservation r1 = reservation("RES-1", "V1", LocalDate.now(), LocalDate.now().plusDays(1), ReservationStatus.PENDING);
        r1.setCustomerId("alice");
        Reservation r2 = reservation("RES-2", "V2", LocalDate.now(), LocalDate.now().plusDays(1), ReservationStatus.PENDING);
        r2.setCustomerId("bob");
        repository.saveReservation(r1);
        repository.saveReservation(r2);

        assertEquals(1, repository.getReservationsForCustomer("alice").size());
        assertTrue(repository.getReservationsForCustomer("carol").isEmpty());

        Payment payment = Payment.builder().id("PAY-1").reservationId("RES-1").amount(100.0)
                .method(PaymentMethod.UPI).status(PaymentStatus.COMPLETED).build();
        repository.savePayment(payment);
        assertSame(payment, repository.getPayment("PAY-1"));
    }

    @Test
    @DisplayName("clear() wipes every entity and resets counters")
    void clearWipesEverything() {
        repository.saveVehicle(vehicle("V1", VehicleType.SEDAN, "BR-1"));
        repository.saveCustomer(Customer.builder().name("Alice").build());
        repository.saveReservation(reservation("RES-1", "V1", LocalDate.now(), LocalDate.now().plusDays(1), ReservationStatus.PENDING));

        repository.clear();

        assertTrue(repository.getAllVehicles().isEmpty());
        assertTrue(repository.getAllCustomers().isEmpty());
        assertTrue(repository.getAllReservations().isEmpty());
        assertEquals("VEH-0001", repository.generateVehicleId(), "counters must reset too");
    }

    @Test
    @DisplayName("Vehicle id generation is atomic under contention — no duplicates across 200 threads")
    void vehicleIdGenerationIsAtomic() throws InterruptedException {
        int threads = 200;
        ExecutorService pool = Executors.newFixedThreadPool(32);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        Set<String> ids = ConcurrentHashMap.newKeySet();

        for (int i = 0; i < threads; i++) {
            pool.submit(() -> {
                try {
                    start.await();
                    ids.add(repository.generateVehicleId());
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "id generation did not finish");
        pool.shutdown();

        assertEquals(threads, ids.size(), "the counter lost updates and handed out duplicate vehicle ids");
    }

    @Test
    @DisplayName("Concurrent vehicle writes are all visible — the store is genuinely concurrent")
    void concurrentVehicleWritesAllLand() throws InterruptedException {
        int count = 300;
        ExecutorService pool = Executors.newFixedThreadPool(16);
        CountDownLatch done = new CountDownLatch(count);

        IntStream.range(0, count).forEach(i -> pool.submit(() -> {
            try {
                repository.saveVehicle(vehicle("V" + i, VehicleType.SEDAN, "BR-1"));
            } finally {
                done.countDown();
            }
        }));

        assertTrue(done.await(10, TimeUnit.SECONDS), "writes did not finish");
        pool.shutdown();

        assertEquals(count, repository.getAllVehicles().size(),
                "a HashMap would have lost writes here; the store must be concurrent");
    }
}
