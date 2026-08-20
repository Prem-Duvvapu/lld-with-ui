package com.lld.uber.service;

import com.lld.uber.exception.*;
import com.lld.uber.model.*;
import com.lld.uber.payment.Payment;
import com.lld.uber.payment.PaymentProcessor;
import com.lld.uber.repository.UberRepository;
import com.lld.uber.strategy.FarePricingStrategy;
import com.lld.uber.strategy.FarePricingStrategyFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class UberService {

    private final UberRepository repository;
    private final PaymentProcessor paymentProcessor;
    private final FarePricingStrategyFactory pricingFactory;
    private final DriverAssignmentService driverAssignment;

    public UberService(UberRepository repository,
                       PaymentProcessor paymentProcessor,
                       FarePricingStrategyFactory pricingFactory,
                       DriverAssignmentService driverAssignment) {
        this.repository = repository;
        this.paymentProcessor = paymentProcessor;
        this.pricingFactory = pricingFactory;
        this.driverAssignment = driverAssignment;
    }

    /**
     * Single gate for every ride status change. Each caller used to carry its own list of
     * acceptable source states, and nothing stopped a move out of a terminal state.
     */
    private void transition(Ride ride, RideStatus next) {
        RideStatus current = ride.getStatus();
        if (!current.canTransitionTo(next)) {
            throw new InvalidRideTransitionException(
                    "Ride " + ride.getId() + " cannot move from " + current + " to " + next
                            + ". Allowed: " + current.allowedNext());
        }
        ride.setStatus(next);
    }

    public Rider registerRider(Rider rider) {
        if (rider.getId() == null || rider.getId().isEmpty()) {
            rider.setId("RIDER-" + UUID.randomUUID().toString().substring(0, 5).toUpperCase());
        }
        repository.registerRider(rider);
        return rider;
    }

    public Driver registerDriver(Driver driver) {
        if (driver.getId() == null || driver.getId().isEmpty()) {
            driver.setId("DRIVER-" + UUID.randomUUID().toString().substring(0, 5).toUpperCase());
        }
        repository.registerDriver(driver);
        return driver;
    }

    public Driver updateDriverStatus(String driverId, DriverStatus status) {
        Driver driver = repository.getDriver(driverId);
        if (driver == null) throw new DriverNotFoundException("Driver not found: " + driverId);
        driver.setStatus(status);
        repository.updateDriver(driver);
        return driver;
    }

    public List<Driver> getAllDrivers() {
        return repository.getAllDrivers();
    }

    public List<Rider> getAllRiders() {
        return repository.getAllRiders();
    }

    public FareEstimate estimate(String pickupLat, String pickupLng, String pickupLabel,
                                 String dropoffLat, String dropoffLng, String dropoffLabel,
                                 String vehicleTypeStr, boolean surgeActive) {
        VehicleType vehicleType = VehicleType.valueOf(vehicleTypeStr.toUpperCase());
        Location pickup = new Location(Double.parseDouble(pickupLat), Double.parseDouble(pickupLng), pickupLabel);
        Location dropoff = new Location(Double.parseDouble(dropoffLat), Double.parseDouble(dropoffLng), dropoffLabel);

        double distance = pickup.distanceTo(dropoff);
        FarePricingStrategy pricing = pricingFactory.forDemand(surgeActive);
        double fare = pricing.calculateFare(distance, vehicleType);
        int estimatedMinutes = (int) Math.round(distance * 3.0);

        return new FareEstimate(
                Math.round(distance * 10.0) / 10.0,
                fare,
                estimatedMinutes,
                vehicleType,
                pricing.getName()
        );
    }

    public Ride requestRide(String userId, String pickupLat, String pickupLng, String pickupLabel,
                            String dropoffLat, String dropoffLng, String dropoffLabel,
                            String vehicleTypeStr, Double preCalculatedFare, Double preCalculatedDistanceKm) {
        Location pickup = new Location(Double.parseDouble(pickupLat), Double.parseDouble(pickupLng), pickupLabel);
        Location dropoff = new Location(Double.parseDouble(dropoffLat), Double.parseDouble(dropoffLng), dropoffLabel);
        VehicleType vehicleType = VehicleType.valueOf(vehicleTypeStr.toUpperCase());

        // Use pre-calculated fare and distance from estimate if provided by UI
        double distanceKm = (preCalculatedDistanceKm != null && preCalculatedDistanceKm > 0)
                ? preCalculatedDistanceKm : pickup.distanceTo(dropoff);

        double fare = (preCalculatedFare != null && preCalculatedFare > 0)
                ? preCalculatedFare
                : pricingFactory.forDemand(false).calculateFare(distanceKm, vehicleType);

        String rideId = repository.generateRideId();
        Ride ride = new Ride(rideId, userId, pickup, dropoff, distanceKm, fare, vehicleType);

        Rider rider = repository.getRider(userId);
        if (rider != null) {
            ride.setRider(rider);
            rider.setCurrentLocation(pickup);
        }

        repository.saveRide(ride);
        return ride;
    }

    public List<Ride> getAvailableRideRequestsForDriver(String driverId) {
        return repository.getAvailableRideRequestsForDriver(driverId);
    }

    public Ride acceptRide(String rideId, String driverId) {
        return assignDriver(rideId, driverId);
    }

    public Ride declineRide(String rideId, String driverId) {
        Ride ride = getRide(rideId);
        ride.addDeclinedDriver(driverId);
        repository.updateRide(ride);
        return ride;
    }

    /**
     * Accepting a ride is the one genuinely contended operation here: several drivers may be
     * looking at the same request, and one driver may be offered several. Both races are
     * resolved under a per-driver lock inside DriverAssignmentService.
     */
    public Ride assignDriver(String rideId, String driverId) {
        Ride ride = getRide(rideId);
        if (ride.getStatus() != RideStatus.REQUESTED) {
            throw new InvalidRideTransitionException(
                    "Ride " + rideId + " is " + ride.getStatus() + " and can no longer be accepted");
        }
        driverAssignment.assign(ride, driverId);
        return ride;
    }

    public Ride verifyOtpAndStart(String rideId, String otp) {
        Ride ride = getRide(rideId);
        if (!ride.verifyOtp(otp)) {
            throw new OtpVerificationException("Invalid OTP for ride " + rideId + ". Verification failed.");
        }
        return startTrip(rideId);
    }

    public Ride startTrip(String rideId) {
        Ride ride = getRide(rideId);
        transition(ride, RideStatus.ONGOING);
        repository.updateRide(ride);
        return ride;
    }

    public Ride arriveAtDestination(String rideId) {
        Ride ride = getRide(rideId);
        transition(ride, RideStatus.DESTINATION_REACHED);
        transition(ride, RideStatus.PAYMENT_PENDING);
        repository.updateRide(ride);
        return ride;
    }

    public Ride completeTrip(String rideId, String paymentMethod) {
        Ride ride = getRide(rideId);
        if (ride.getStatus().isTerminal()) {
            throw new InvalidRideTransitionException(
                    "Ride " + rideId + " is already " + ride.getStatus() + " and cannot be completed");
        }
        // Payment is only attempted once the trip has actually finished.
        if (ride.getStatus() == RideStatus.ONGOING) {
            transition(ride, RideStatus.DESTINATION_REACHED);
        }
        if (ride.getStatus() == RideStatus.DESTINATION_REACHED) {
            transition(ride, RideStatus.PAYMENT_PENDING);
        }

        String paymentId = "PAY-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        String method = (paymentMethod != null && !paymentMethod.isEmpty()) ? paymentMethod : "UPI";
        Payment payment = new Payment(paymentId, rideId, ride.getFare(), method);
        payment = paymentProcessor.process(payment);
        repository.savePayment(payment);

        ride.setPayment(payment);

        if (payment.getStatus() == com.lld.uber.payment.PaymentStatus.COMPLETED) {
            transition(ride, RideStatus.COMPLETED);
            driverAssignment.release(ride.getDriverId(), ride.getDropoff());
        } else {
            transition(ride, RideStatus.PAYMENT_FAILED);
        }

        repository.updateRide(ride);
        return ride;
    }

    public Ride cancelTrip(String rideId) {
        Ride ride = getRide(rideId);
        transition(ride, RideStatus.CANCELLED);
        driverAssignment.release(ride.getDriverId(), null);
        repository.updateRide(ride);
        return ride;
    }

    public Ride getRide(String rideId) {
        Ride ride = repository.getRide(rideId);
        if (ride == null) throw new RideNotFoundException("Ride not found: " + rideId);
        return ride;
    }

    public List<Ride> getUserRides(String userId) {
        return repository.getRidesByUser(userId);
    }

    public List<Ride> getAllRides() {
        return repository.getAllRides();
    }

    public record FareEstimate(double distanceKm, double fare, int estimatedMinutes,
                               VehicleType vehicleType, String pricingStrategy) {}
}
