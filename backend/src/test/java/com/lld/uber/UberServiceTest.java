package com.lld.uber;

import com.lld.uber.exception.*;
import com.lld.uber.model.*;
import com.lld.uber.payment.PaymentProcessor;
import com.lld.uber.payment.PaymentStatus;
import com.lld.uber.repository.UberRepository;
import com.lld.uber.service.DriverAssignmentService;
import com.lld.uber.service.UberService;
import com.lld.uber.strategy.FarePricingStrategyFactory;
import com.lld.uber.strategy.StandardFarePricingStrategy;
import com.lld.uber.strategy.SurgeFarePricingStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Uber Service Workflow & Rejections")
class UberServiceTest {

    private UberRepository repository;
    private UberService service;
    private SurgeFarePricingStrategy surge;

    @BeforeEach
    void setUp() {
        repository = new UberRepository();
        StandardFarePricingStrategy standard = new StandardFarePricingStrategy();
        surge = new SurgeFarePricingStrategy(standard);
        FarePricingStrategyFactory pricing = new FarePricingStrategyFactory(standard, surge);
        service = new UberService(repository, new PaymentProcessor(), pricing,
                new DriverAssignmentService(repository));
    }

    private Driver givenAvailableDriver(String id) {
        Driver d = new Driver(id, "Driver " + id, "9000000000", VehicleType.UBER_GO,
                "KA-01-" + id, new Location(12.9716, 77.5946, "MG Road"));
        d.setStatus(DriverStatus.AVAILABLE);
        return service.registerDriver(d);
    }

    private Ride givenRide(String riderId) {
        return service.requestRide(riderId, "12.9716", "77.5946", "MG Road",
                "12.9352", "77.6245", "Koramangala", "UBER_GO", null, null);
    }

    /** Drives a ride all the way to PAYMENT_PENDING so payment paths can be tested. */
    private Ride givenRideAtDestination(String riderId, String driverId) {
        Ride ride = givenRide(riderId);
        service.assignDriver(ride.getId(), driverId);
        service.verifyOtpAndStart(ride.getId(), ride.getOtp());
        service.arriveAtDestination(ride.getId());
        return ride;
    }

    // ---------- registration ----------

    @Test
    @DisplayName("Riders and drivers without an id are given a generated one")
    void registrationGeneratesIds() {
        Rider rider = service.registerRider(new Rider(null, "Alice", "9111111111", null));
        assertNotNull(rider.getId());
        assertTrue(rider.getId().startsWith("RIDER-"));

        Driver driver = service.registerDriver(new Driver(null, "Bob", "9222222222",
                VehicleType.UBER_XL, "KA-05-9999", null));
        assertTrue(driver.getId().startsWith("DRIVER-"));
        assertEquals(DriverStatus.AVAILABLE, driver.getStatus());
    }

    @Test
    @DisplayName("Supplied ids are respected rather than overwritten")
    void suppliedIdsAreKept() {
        assertEquals("RIDER-CUSTOM",
                service.registerRider(new Rider("RIDER-CUSTOM", "Alice", "9111111111", null)).getId());
    }

    @Test
    @DisplayName("Updating the status of an unknown driver is a 404, not a silent no-op")
    void unknownDriverStatusUpdateThrows() {
        assertThrows(DriverNotFoundException.class,
                () -> service.updateDriverStatus("GHOST", DriverStatus.OFFLINE));
    }

    // ---------- estimation ----------

    @Test
    @DisplayName("An estimate reports distance, fare, ETA and the strategy that priced it")
    void estimateReportsStrategy() {
        UberService.FareEstimate estimate = service.estimate(
                "12.9716", "77.5946", "MG Road",
                "12.9352", "77.6245", "Koramangala", "UBER_GO", false);

        assertTrue(estimate.distanceKm() > 0);
        assertTrue(estimate.fare() > StandardFarePricingStrategy.BASE_FARE);
        assertTrue(estimate.estimatedMinutes() > 0);
        assertEquals(VehicleType.UBER_GO, estimate.vehicleType());
        assertEquals("STANDARD", estimate.pricingStrategy());
    }

    @Test
    @DisplayName("The same trip costs more under surge, and says so")
    void surgeEstimateCostsMoreAndIsLabelled() {
        UberService.FareEstimate normal = service.estimate("12.9716", "77.5946", "MG Road",
                "12.9352", "77.6245", "Koramangala", "UBER_GO", false);
        UberService.FareEstimate surged = service.estimate("12.9716", "77.5946", "MG Road",
                "12.9352", "77.6245", "Koramangala", "UBER_GO", true);

        assertTrue(surged.fare() > normal.fare(), "surge did not raise the fare");
        assertEquals(normal.distanceKm(), surged.distanceKm(), 0.001, "surge changed the distance");
        assertTrue(surged.pricingStrategy().startsWith("SURGE_"));
    }

    @Test
    @DisplayName("Vehicle class is parsed case-insensitively; an unknown class is rejected")
    void vehicleTypeParsing() {
        assertEquals(VehicleType.UBER_XL, service.estimate("12.9716", "77.5946", "A",
                "12.9352", "77.6245", "B", "uber_xl", false).vehicleType());

        assertThrows(IllegalArgumentException.class, () -> service.estimate("12.9716", "77.5946", "A",
                "12.9352", "77.6245", "B", "UBER_HELICOPTER", false));
    }

    // ---------- requesting ----------

    @Test
    @DisplayName("A new ride starts REQUESTED with an OTP and no driver")
    void newRideStartsRequested() {
        Rider rider = service.registerRider(new Rider("RIDER-1", "Alice", "9111111111", null));
        Ride ride = givenRide(rider.getId());

        assertEquals(RideStatus.REQUESTED, ride.getStatus());
        assertNull(ride.getDriverId());
        assertNotNull(ride.getOtp());
        assertEquals(4, ride.getOtp().length());
        assertTrue(ride.getFare() > 0);
        assertSame(ride, service.getRide(ride.getId()));
    }

    @Test
    @DisplayName("A pre-calculated fare from the estimate screen is honoured")
    void preCalculatedFareIsHonoured() {
        Ride ride = service.requestRide("alice", "12.9716", "77.5946", "MG Road",
                "12.9352", "77.6245", "Koramangala", "UBER_GO", 999.0, 42.0);

        assertEquals(999.0, ride.getFare(), 0.001);
        assertEquals(42.0, ride.getDistanceKm(), 0.001);
    }

    @Test
    @DisplayName("A zero or negative pre-calculated fare falls back to real pricing")
    void invalidPreCalculatedFareFallsBack() {
        Ride ride = service.requestRide("alice", "12.9716", "77.5946", "MG Road",
                "12.9352", "77.6245", "Koramangala", "UBER_GO", 0.0, 0.0);

        assertTrue(ride.getFare() > 0, "fare should have been recalculated");
        assertTrue(ride.getDistanceKm() > 0, "distance should have been recalculated");
    }

    @Test
    @DisplayName("Looking up a ride that does not exist is a 404")
    void unknownRideThrows() {
        assertThrows(RideNotFoundException.class, () -> service.getRide("RIDE-99999"));
    }

    // ---------- assignment ----------

    @Test
    @DisplayName("Accepting a ride binds driver and vehicle onto it and marks the driver ON_TRIP")
    void acceptBindsDriver() {
        Driver driver = givenAvailableDriver("D1");
        Ride ride = givenRide("alice");

        service.acceptRide(ride.getId(), "D1");

        assertEquals(RideStatus.ACCEPTED, ride.getStatus());
        assertEquals("D1", ride.getDriverId());
        assertEquals(driver.getName(), ride.getDriverName());
        assertEquals(driver.getVehicleNumber(), ride.getVehicleNumber());
        assertEquals(DriverStatus.ON_TRIP, repository.getDriver("D1").getStatus());
    }

    @Test
    @DisplayName("An unknown driver cannot accept a ride")
    void unknownDriverCannotAccept() {
        Ride ride = givenRide("alice");
        assertThrows(DriverNotFoundException.class, () -> service.assignDriver(ride.getId(), "GHOST"));
        assertEquals(RideStatus.REQUESTED, ride.getStatus(), "the ride must be untouched");
    }

    @Test
    @DisplayName("An offline driver cannot accept a ride")
    void offlineDriverCannotAccept() {
        givenAvailableDriver("D1");
        service.updateDriverStatus("D1", DriverStatus.OFFLINE);
        Ride ride = givenRide("alice");

        assertThrows(DriverUnavailableException.class, () -> service.assignDriver(ride.getId(), "D1"));
    }

    @Test
    @DisplayName("A ride that is no longer REQUESTED cannot be accepted again")
    void alreadyAcceptedRideCannotBeReaccepted() {
        givenAvailableDriver("D1");
        givenAvailableDriver("D2");
        Ride ride = givenRide("alice");
        service.assignDriver(ride.getId(), "D1");

        assertThrows(InvalidRideTransitionException.class, () -> service.assignDriver(ride.getId(), "D2"));
        assertEquals("D1", ride.getDriverId(), "the original driver must survive the failed attempt");
        assertEquals(DriverStatus.AVAILABLE, repository.getDriver("D2").getStatus(),
                "the rejected driver must not have been consumed");
    }

    @Test
    @DisplayName("Declining hides the ride from that driver but leaves it open to others")
    void declineHidesRideFromThatDriverOnly() {
        givenAvailableDriver("D1");
        givenAvailableDriver("D2");
        Ride ride = givenRide("alice");

        service.declineRide(ride.getId(), "D1");

        assertTrue(ride.isDeclinedBy("D1"));
        assertEquals(RideStatus.REQUESTED, ride.getStatus(), "declining must not kill the ride");
        assertTrue(service.getAvailableRideRequestsForDriver("D1").isEmpty());
        assertEquals(1, service.getAvailableRideRequestsForDriver("D2").size());
    }

    // ---------- OTP and the trip ----------

    @Test
    @DisplayName("The correct OTP starts the trip")
    void correctOtpStartsTrip() {
        givenAvailableDriver("D1");
        Ride ride = givenRide("alice");
        service.assignDriver(ride.getId(), "D1");

        service.verifyOtpAndStart(ride.getId(), ride.getOtp());

        assertEquals(RideStatus.ONGOING, ride.getStatus());
    }

    @Test
    @DisplayName("A wrong OTP is rejected and the ride does not start")
    void wrongOtpIsRejected() {
        givenAvailableDriver("D1");
        Ride ride = givenRide("alice");
        service.assignDriver(ride.getId(), "D1");

        String wrong = ride.getOtp().equals("0000") ? "1111" : "0000";
        assertThrows(OtpVerificationException.class, () -> service.verifyOtpAndStart(ride.getId(), wrong));
        assertEquals(RideStatus.ACCEPTED, ride.getStatus(), "a failed OTP must not advance the ride");
    }

    @Test
    @DisplayName("A trip cannot start before a driver has accepted")
    void tripCannotStartBeforeAcceptance() {
        Ride ride = givenRide("alice");
        assertThrows(InvalidRideTransitionException.class, () -> service.startTrip(ride.getId()));
    }

    @Test
    @DisplayName("Arriving moves the ride through DESTINATION_REACHED to PAYMENT_PENDING")
    void arrivalMovesToPaymentPending() {
        givenAvailableDriver("D1");
        Ride ride = givenRideAtDestination("alice", "D1");
        assertEquals(RideStatus.PAYMENT_PENDING, ride.getStatus());
    }

    @Test
    @DisplayName("A ride cannot arrive before it has started")
    void cannotArriveBeforeStarting() {
        givenAvailableDriver("D1");
        Ride ride = givenRide("alice");
        service.assignDriver(ride.getId(), "D1");

        assertThrows(InvalidRideTransitionException.class, () -> service.arriveAtDestination(ride.getId()));
    }

    // ---------- completion and payment ----------

    @Test
    @DisplayName("Completing a trip takes payment, marks it COMPLETED and frees the driver")
    void completionTakesPaymentAndFreesDriver() {
        givenAvailableDriver("D1");
        Ride ride = givenRideAtDestination("alice", "D1");

        service.completeTrip(ride.getId(), "UPI");

        assertEquals(RideStatus.COMPLETED, ride.getStatus());
        assertNotNull(ride.getPayment());
        assertEquals(PaymentStatus.COMPLETED, ride.getPayment().getStatus());
        assertEquals(ride.getFare(), ride.getPayment().getAmount(), 0.001);
        assertEquals(DriverStatus.AVAILABLE, repository.getDriver("D1").getStatus(),
                "the driver must be back in the pool");
        assertEquals(ride.getDropoff().getLabel(),
                repository.getDriver("D1").getCurrentLocation().getLabel(),
                "the driver should now be at the dropoff");
    }

    @Test
    @DisplayName("Payment defaults to UPI when no method is supplied")
    void paymentMethodDefaults() {
        givenAvailableDriver("D1");
        Ride ride = givenRideAtDestination("alice", "D1");

        service.completeTrip(ride.getId(), null);
        assertEquals("UPI", ride.getPayment().getMethod());
    }

    @Test
    @DisplayName("Completing straight from ONGOING walks the intermediate states rather than skipping them")
    void completionFromOngoingWalksTheStates() {
        givenAvailableDriver("D1");
        Ride ride = givenRide("alice");
        service.assignDriver(ride.getId(), "D1");
        service.verifyOtpAndStart(ride.getId(), ride.getOtp());

        service.completeTrip(ride.getId(), "CARD");

        assertEquals(RideStatus.COMPLETED, ride.getStatus());
    }

    @Test
    @DisplayName("An already-completed ride cannot be completed twice")
    void completedRideCannotBeCompletedAgain() {
        givenAvailableDriver("D1");
        Ride ride = givenRideAtDestination("alice", "D1");
        service.completeTrip(ride.getId(), "UPI");

        assertThrows(InvalidRideTransitionException.class, () -> service.completeTrip(ride.getId(), "UPI"));
    }

    @Test
    @DisplayName("A cancelled ride cannot then be completed")
    void cancelledRideCannotBeCompleted() {
        givenAvailableDriver("D1");
        Ride ride = givenRide("alice");
        service.assignDriver(ride.getId(), "D1");
        service.cancelTrip(ride.getId());

        assertThrows(InvalidRideTransitionException.class, () -> service.completeTrip(ride.getId(), "UPI"));
    }

    // ---------- cancellation ----------

    @Test
    @DisplayName("Cancelling an accepted ride frees the driver")
    void cancellationFreesDriver() {
        givenAvailableDriver("D1");
        Ride ride = givenRide("alice");
        service.assignDriver(ride.getId(), "D1");

        service.cancelTrip(ride.getId());

        assertEquals(RideStatus.CANCELLED, ride.getStatus());
        assertEquals(DriverStatus.AVAILABLE, repository.getDriver("D1").getStatus());
    }

    @Test
    @DisplayName("A ride can be cancelled before any driver accepts")
    void unassignedRideCanBeCancelled() {
        Ride ride = givenRide("alice");
        assertDoesNotThrow(() -> service.cancelTrip(ride.getId()));
        assertEquals(RideStatus.CANCELLED, ride.getStatus());
    }

    @Test
    @DisplayName("A ride cannot be cancelled twice")
    void cancelledRideCannotBeCancelledAgain() {
        Ride ride = givenRide("alice");
        service.cancelTrip(ride.getId());

        assertThrows(InvalidRideTransitionException.class, () -> service.cancelTrip(ride.getId()));
    }

    @Test
    @DisplayName("A completed ride cannot be cancelled after the fact")
    void completedRideCannotBeCancelled() {
        givenAvailableDriver("D1");
        Ride ride = givenRideAtDestination("alice", "D1");
        service.completeTrip(ride.getId(), "UPI");

        assertThrows(InvalidRideTransitionException.class, () -> service.cancelTrip(ride.getId()));
    }

    // ---------- history ----------

    @Test
    @DisplayName("Ride history is scoped to the rider who took them")
    void historyIsScopedToRider() {
        givenRide("alice");
        givenRide("alice");
        givenRide("bob");

        assertEquals(2, service.getUserRides("alice").size());
        assertEquals(1, service.getUserRides("bob").size());
        assertTrue(service.getUserRides("carol").isEmpty());
        assertEquals(3, service.getAllRides().size());
    }
}
