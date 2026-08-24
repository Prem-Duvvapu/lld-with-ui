package com.lld.carrental;

import com.lld.carrental.exception.*;
import com.lld.carrental.model.*;
import com.lld.carrental.payment.PaymentProcessor;
import com.lld.carrental.repository.CarRentalRepository;
import com.lld.carrental.service.CarRentalService;
import com.lld.carrental.service.ReservationLockService;
import com.lld.carrental.strategy.LongRentalDiscountPricingStrategy;
import com.lld.carrental.strategy.PricingStrategyFactory;
import com.lld.carrental.strategy.StandardPricingStrategy;
import com.lld.carrental.strategy.WeeklyDiscountPricingStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Car Rental Service Workflow & Rejections")
class CarRentalServiceTest {

    private CarRentalRepository repository;
    private CarRentalService service;
    private static final LocalDate TODAY = LocalDate.now();

    @BeforeEach
    void setUp() {
        repository = new CarRentalRepository();
        ReservationLockService lockService = new ReservationLockService(repository);
        PricingStrategyFactory pricingFactory = new PricingStrategyFactory(
                new StandardPricingStrategy(), new WeeklyDiscountPricingStrategy(), new LongRentalDiscountPricingStrategy());
        service = new CarRentalService(repository, lockService, pricingFactory, new PaymentProcessor());
        repository.saveBranch(RentalBranch.builder().id("BR-1").name("Downtown").address("101 Market St").city("SF").build());
    }

    private Vehicle givenVehicle(String id, VehicleType type) {
        Vehicle v = Vehicle.builder().id(id).make("Honda").model("Civic").year(2023)
                .licensePlate("PL-" + id).type(type).status(VehicleStatus.AVAILABLE)
                .branchId("BR-1").odometer(0).build();
        repository.saveVehicle(v);
        return v;
    }

    private Customer givenCustomer(String name) {
        return service.registerCustomer(Customer.builder().name(name).email(name + "@test.com")
                .phone("9000000000").licenseNumber("DL-" + name).build());
    }

    // ---------- reservation creation ----------

    @Test
    @DisplayName("Reserving a vehicle creates a PENDING reservation with a priced cost")
    void reserveCreatesPendingReservationWithCost() {
        Vehicle v = givenVehicle("V1", VehicleType.SEDAN);
        Customer c = givenCustomer("Alice");

        Reservation r = service.reserveVehicle(c.getId(), v.getId(), TODAY.plusDays(1), TODAY.plusDays(3));

        assertEquals(ReservationStatus.PENDING, r.getStatus());
        assertEquals(1800.0 * 2, r.getEstimatedCost(), 0.001); // 2 days standard rate
        assertEquals(v.getId(), r.getVehicleId());
        assertEquals(c.getId(), r.getCustomerId());
    }

    @Test
    @DisplayName("Reserving an unknown vehicle throws VehicleNotFoundException")
    void reserveUnknownVehicleThrows() {
        Customer c = givenCustomer("Alice");
        assertThrows(VehicleNotFoundException.class,
                () -> service.reserveVehicle(c.getId(), "GHOST", TODAY.plusDays(1), TODAY.plusDays(2)));
    }

    @Test
    @DisplayName("Reserving with an unknown customer throws CustomerNotFoundException")
    void reserveUnknownCustomerThrows() {
        Vehicle v = givenVehicle("V1", VehicleType.SEDAN);
        assertThrows(CustomerNotFoundException.class,
                () -> service.reserveVehicle("GHOST", v.getId(), TODAY.plusDays(1), TODAY.plusDays(2)));
    }

    @Test
    @DisplayName("End date not after start date is rejected")
    void invalidDateRangeRejected() {
        Vehicle v = givenVehicle("V1", VehicleType.SEDAN);
        Customer c = givenCustomer("Alice");
        assertThrows(InvalidReservationDatesException.class,
                () -> service.reserveVehicle(c.getId(), v.getId(), TODAY.plusDays(3), TODAY.plusDays(3)));
        assertThrows(InvalidReservationDatesException.class,
                () -> service.reserveVehicle(c.getId(), v.getId(), TODAY.plusDays(5), TODAY.plusDays(3)));
    }

    @Test
    @DisplayName("A MAINTENANCE vehicle cannot be reserved")
    void maintenanceVehicleCannotBeReserved() {
        Vehicle v = givenVehicle("V1", VehicleType.SEDAN);
        v.setStatus(VehicleStatus.MAINTENANCE);
        repository.updateVehicle(v);
        Customer c = givenCustomer("Alice");

        assertThrows(VehicleNotAvailableException.class,
                () -> service.reserveVehicle(c.getId(), v.getId(), TODAY.plusDays(1), TODAY.plusDays(2)));
    }

    @Test
    @DisplayName("Overlapping dates on the same vehicle are rejected")
    void overlappingDatesRejected() {
        Vehicle v = givenVehicle("V1", VehicleType.SEDAN);
        Customer alice = givenCustomer("Alice");
        Customer bob = givenCustomer("Bob");

        service.reserveVehicle(alice.getId(), v.getId(), TODAY.plusDays(5), TODAY.plusDays(10));

        assertThrows(VehicleNotAvailableException.class,
                () -> service.reserveVehicle(bob.getId(), v.getId(), TODAY.plusDays(8), TODAY.plusDays(12)),
                "overlapping range must be rejected");
        assertThrows(VehicleNotAvailableException.class,
                () -> service.reserveVehicle(bob.getId(), v.getId(), TODAY.plusDays(1), TODAY.plusDays(6)),
                "partially overlapping range must be rejected");
    }

    @Test
    @DisplayName("Non-overlapping dates on the same vehicle both succeed — the whole point of date-range booking")
    void nonOverlappingDatesBothSucceed() {
        Vehicle v = givenVehicle("V1", VehicleType.SEDAN);
        Customer alice = givenCustomer("Alice");
        Customer bob = givenCustomer("Bob");

        Reservation first = service.reserveVehicle(alice.getId(), v.getId(), TODAY.plusDays(1), TODAY.plusDays(3));
        Reservation second = service.reserveVehicle(bob.getId(), v.getId(), TODAY.plusDays(3), TODAY.plusDays(5));

        assertNotEquals(first.getId(), second.getId());
        assertEquals(ReservationStatus.PENDING, first.getStatus());
        assertEquals(ReservationStatus.PENDING, second.getStatus());
    }

    @Test
    @DisplayName("Same-day return and pickup does not count as an overlap (half-open interval)")
    void sameDayReturnAndPickupIsNotAnOverlap() {
        Vehicle v = givenVehicle("V1", VehicleType.SEDAN);
        Customer alice = givenCustomer("Alice");
        Customer bob = givenCustomer("Bob");

        service.reserveVehicle(alice.getId(), v.getId(), TODAY.plusDays(1), TODAY.plusDays(5));
        assertDoesNotThrow(() -> service.reserveVehicle(bob.getId(), v.getId(), TODAY.plusDays(5), TODAY.plusDays(8)));
    }

    @Test
    @DisplayName("A cancelled reservation frees its dates for a new booking")
    void cancelledReservationFreesDates() {
        Vehicle v = givenVehicle("V1", VehicleType.SEDAN);
        Customer alice = givenCustomer("Alice");
        Customer bob = givenCustomer("Bob");

        Reservation r = service.reserveVehicle(alice.getId(), v.getId(), TODAY.plusDays(1), TODAY.plusDays(5));
        service.cancelReservation(r.getId());

        assertDoesNotThrow(() -> service.reserveVehicle(bob.getId(), v.getId(), TODAY.plusDays(2), TODAY.plusDays(4)));
    }

    // ---------- full lifecycle ----------

    @Test
    @DisplayName("Full lifecycle: reserve -> confirm -> pickup -> return")
    void fullLifecycleSucceeds() {
        Vehicle v = givenVehicle("V1", VehicleType.SEDAN);
        Customer c = givenCustomer("Alice");

        Reservation reserved = service.reserveVehicle(c.getId(), v.getId(), TODAY.plusDays(1), TODAY.plusDays(3));
        Reservation confirmed = service.confirmReservation(reserved.getId(), PaymentMethod.UPI);
        assertEquals(ReservationStatus.CONFIRMED, confirmed.getStatus());
        assertNotNull(confirmed.getPaymentId());

        Reservation active = service.pickup(confirmed.getId());
        assertEquals(ReservationStatus.ACTIVE, active.getStatus());
        assertEquals(VehicleStatus.RENTED, repository.getVehicle(v.getId()).getStatus());

        Reservation completed = service.returnVehicle(active.getId(), 500, null);
        assertEquals(ReservationStatus.COMPLETED, completed.getStatus());
        assertEquals(VehicleStatus.AVAILABLE, repository.getVehicle(v.getId()).getStatus());
        assertEquals(completed.getEstimatedCost(), completed.getActualCost(), 0.001, "on-time return costs the estimate");
        assertEquals(500, repository.getVehicle(v.getId()).getOdometer());
    }

    @Test
    @DisplayName("Returning after the booked end date adds a late fee to the actual cost")
    void lateReturnAddsLateFee() {
        Vehicle v = givenVehicle("V1", VehicleType.SEDAN);
        Customer c = givenCustomer("Alice");

        Reservation reserved = service.reserveVehicle(c.getId(), v.getId(), TODAY.plusDays(1), TODAY.plusDays(3));
        service.confirmReservation(reserved.getId(), PaymentMethod.UPI);
        service.pickup(reserved.getId());

        Reservation completed = service.returnVehicle(reserved.getId(), 100, TODAY.plusDays(5)); // 2 days late
        double expectedLateFee = 2 * (1800.0 * 1.5);
        assertEquals(reserved.getEstimatedCost() + expectedLateFee, completed.getActualCost(), 0.001);
    }

    @Test
    @DisplayName("Cancelling a CONFIRMED (paid) reservation refunds the payment")
    void cancellingConfirmedReservationRefunds() {
        Vehicle v = givenVehicle("V1", VehicleType.SEDAN);
        Customer c = givenCustomer("Alice");

        Reservation reserved = service.reserveVehicle(c.getId(), v.getId(), TODAY.plusDays(1), TODAY.plusDays(3));
        Reservation confirmed = service.confirmReservation(reserved.getId(), PaymentMethod.UPI);

        service.cancelReservation(confirmed.getId());

        var payment = repository.getPayment(confirmed.getPaymentId());
        assertEquals(PaymentStatus.REFUNDED, payment.getStatus());
    }

    @Test
    @DisplayName("An ACTIVE reservation cannot be cancelled")
    void activeReservationCannotBeCancelled() {
        Vehicle v = givenVehicle("V1", VehicleType.SEDAN);
        Customer c = givenCustomer("Alice");

        Reservation reserved = service.reserveVehicle(c.getId(), v.getId(), TODAY.plusDays(1), TODAY.plusDays(3));
        service.confirmReservation(reserved.getId(), PaymentMethod.UPI);
        service.pickup(reserved.getId());

        assertThrows(InvalidReservationTransitionException.class, () -> service.cancelReservation(reserved.getId()));
    }

    @Test
    @DisplayName("Picking up a PENDING (unconfirmed) reservation is rejected")
    void pickupBeforeConfirmRejected() {
        Vehicle v = givenVehicle("V1", VehicleType.SEDAN);
        Customer c = givenCustomer("Alice");

        Reservation reserved = service.reserveVehicle(c.getId(), v.getId(), TODAY.plusDays(1), TODAY.plusDays(3));
        assertThrows(InvalidReservationTransitionException.class, () -> service.pickup(reserved.getId()));
    }

    @Test
    @DisplayName("A completed reservation cannot be returned again")
    void doubleReturnRejected() {
        Vehicle v = givenVehicle("V1", VehicleType.SEDAN);
        Customer c = givenCustomer("Alice");

        Reservation reserved = service.reserveVehicle(c.getId(), v.getId(), TODAY.plusDays(1), TODAY.plusDays(3));
        service.confirmReservation(reserved.getId(), PaymentMethod.UPI);
        service.pickup(reserved.getId());
        service.returnVehicle(reserved.getId(), 100, null);

        assertThrows(InvalidReservationTransitionException.class, () -> service.returnVehicle(reserved.getId(), 200, null));
    }

    @Test
    @DisplayName("Operating on an unknown reservation throws ReservationNotFoundException")
    void unknownReservationThrows() {
        assertThrows(ReservationNotFoundException.class, () -> service.getReservation("GHOST"));
        assertThrows(ReservationNotFoundException.class, () -> service.confirmReservation("GHOST", PaymentMethod.UPI));
        assertThrows(ReservationNotFoundException.class, () -> service.pickup("GHOST"));
        assertThrows(ReservationNotFoundException.class, () -> service.cancelReservation("GHOST"));
    }

    @Test
    @DisplayName("Operating on an unknown branch/customer throws the right not-found exception")
    void unknownLookupsThrow() {
        assertThrows(BranchNotFoundException.class, () -> service.getBranch("GHOST"));
        assertThrows(CustomerNotFoundException.class, () -> service.getCustomer("GHOST"));
        assertThrows(VehicleNotFoundException.class, () -> service.getVehicle("GHOST"));
    }

    // ---------- search ----------

    @Test
    @DisplayName("Available-vehicle search excludes vehicles with an overlapping reservation")
    void searchExcludesOverlappingVehicles() {
        Vehicle v1 = givenVehicle("V1", VehicleType.SEDAN);
        Vehicle v2 = givenVehicle("V2", VehicleType.SEDAN);
        Customer c = givenCustomer("Alice");

        service.reserveVehicle(c.getId(), v1.getId(), TODAY.plusDays(1), TODAY.plusDays(5));

        List<Vehicle> results = service.searchAvailableVehicles("BR-1", VehicleType.SEDAN, TODAY.plusDays(2), TODAY.plusDays(3));
        assertEquals(1, results.size());
        assertEquals(v2.getId(), results.get(0).getId());
    }

    @Test
    @DisplayName("Available-vehicle search excludes MAINTENANCE and RETIRED vehicles")
    void searchExcludesMaintenanceAndRetired() {
        Vehicle v1 = givenVehicle("V1", VehicleType.SEDAN);
        v1.setStatus(VehicleStatus.MAINTENANCE);
        repository.updateVehicle(v1);
        Vehicle v2 = givenVehicle("V2", VehicleType.SEDAN);
        v2.setStatus(VehicleStatus.RETIRED);
        repository.updateVehicle(v2);
        givenVehicle("V3", VehicleType.SEDAN);

        List<Vehicle> results = service.searchAvailableVehicles(null, null, TODAY.plusDays(1), TODAY.plusDays(2));
        assertEquals(1, results.size());
        assertEquals("V3", results.get(0).getId());
    }

    // ---------- pricing tiers via the facade ----------

    @Test
    @DisplayName("estimateCost applies the correct tier for the duration")
    void estimateCostAppliesCorrectTier() {
        assertEquals(1800.0 * 2, service.estimateCost(VehicleType.SEDAN, TODAY, TODAY.plusDays(2)), 0.001);
        assertEquals(1800.0 * 4 * 0.9, service.estimateCost(VehicleType.SEDAN, TODAY, TODAY.plusDays(4)), 0.001);
        assertEquals(1800.0 * 8 * 0.8, service.estimateCost(VehicleType.SEDAN, TODAY, TODAY.plusDays(8)), 0.001);
    }
}
