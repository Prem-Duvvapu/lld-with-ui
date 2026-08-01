package com.lld.uber.service;

import com.lld.uber.model.*;
import com.lld.uber.payment.Payment;
import com.lld.uber.payment.PaymentProcessor;
import com.lld.uber.repository.UberRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class UberService {

    private static final double RATE_GO = 12.0;
    private static final double RATE_XL = 18.0;
    private static final double RATE_PREMIUM = 25.0;

    private final UberRepository repository;
    private final PaymentProcessor paymentProcessor;

    public UberService(UberRepository repository, PaymentProcessor paymentProcessor) {
        this.repository = repository;
        this.paymentProcessor = paymentProcessor;
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
        if (driver == null) throw new IllegalArgumentException("Driver not found: " + driverId);
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
                                 String vehicleTypeStr) {
        VehicleType vehicleType = VehicleType.valueOf(vehicleTypeStr.toUpperCase());
        Location pickup = new Location(Double.parseDouble(pickupLat), Double.parseDouble(pickupLng), pickupLabel);
        Location dropoff = new Location(Double.parseDouble(dropoffLat), Double.parseDouble(dropoffLng), dropoffLabel);

        double distance = pickup.distanceTo(dropoff);
        double rate = switch (vehicleType) {
            case UBER_GO -> RATE_GO;
            case UBER_XL -> RATE_XL;
            case UBER_PREMIUM -> RATE_PREMIUM;
        };

        double baseFare = 25;
        double fare = baseFare + distance * rate;

        List<Driver> available = repository.findNearestAvailableDrivers(pickup, vehicleType, 50.0);
        Driver nearestDriver = available.isEmpty() ? null : available.get(0);
        double driverDistance = (nearestDriver != null && nearestDriver.getCurrentLocation() != null)
                ? nearestDriver.getCurrentLocation().distanceTo(pickup) : 0.0;

        return new FareEstimate(distance, Math.round(fare * 100.0) / 100.0, vehicleType, !available.isEmpty(), nearestDriver != null ? nearestDriver.getName() : null, Math.round(driverDistance * 10.0) / 10.0);
    }

    public Ride requestRide(String userId, String pickupLat, String pickupLng, String pickupLabel,
                            String dropoffLat, String dropoffLng, String dropoffLabel,
                            String vehicleTypeStr) {
        Location pickup = new Location(Double.parseDouble(pickupLat), Double.parseDouble(pickupLng), pickupLabel);
        Location dropoff = new Location(Double.parseDouble(dropoffLat), Double.parseDouble(dropoffLng), dropoffLabel);
        VehicleType vehicleType = VehicleType.valueOf(vehicleTypeStr.toUpperCase());

        double distance = pickup.distanceTo(dropoff);
        double rate = switch (vehicleType) {
            case UBER_GO -> RATE_GO;
            case UBER_XL -> RATE_XL;
            case UBER_PREMIUM -> RATE_PREMIUM;
        };
        double fare = Math.round((25 + distance * rate) * 100.0) / 100.0;

        String rideId = repository.generateRideId();
        Ride ride = new Ride(rideId, userId, pickup, dropoff, distance, fare, vehicleType);

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

    public Ride assignDriver(String rideId, String driverId) {
        Ride ride = getRide(rideId);
        Driver driver = repository.getDriver(driverId);
        if (driver == null) throw new IllegalArgumentException("Driver not found: " + driverId);
        if (!driver.isAvailable()) throw new IllegalStateException("Driver is not available");

        assignDriverToRide(ride, driver);
        return ride;
    }

    private void assignDriverToRide(Ride ride, Driver driver) {
        driver.setStatus(DriverStatus.ON_TRIP);
        ride.setDriverId(driver.getId());
        ride.setDriver(driver);
        ride.setDriverName(driver.getName());
        ride.setVehicleNumber(driver.getVehicleNumber());
        ride.setStatus(RideStatus.ACCEPTED);
        repository.updateDriver(driver);
        repository.updateRide(ride);
    }

    public Ride startTrip(String rideId) {
        Ride ride = getRide(rideId);
        if (ride.getStatus() != RideStatus.ACCEPTED && ride.getStatus() != RideStatus.REQUESTED) {
            throw new IllegalStateException("Ride cannot be started from status: " + ride.getStatus());
        }
        ride.setStatus(RideStatus.ONGOING);
        repository.updateRide(ride);
        return ride;
    }

    public Ride completeTrip(String rideId, String paymentMethod) {
        Ride ride = getRide(rideId);
        if (ride.getStatus() != RideStatus.ONGOING && ride.getStatus() != RideStatus.ACCEPTED) {
            throw new IllegalStateException("Ride cannot be completed from status: " + ride.getStatus());
        }

        String paymentId = "PAY-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        String method = (paymentMethod != null && !paymentMethod.isEmpty()) ? paymentMethod : "UPI";
        Payment payment = new Payment(paymentId, rideId, ride.getFare(), method);
        payment = paymentProcessor.process(payment);
        repository.savePayment(payment);

        ride.setPayment(payment);
        ride.setStatus(RideStatus.COMPLETED);

        String driverId = ride.getDriverId();
        if (driverId != null) {
            Driver driver = repository.getDriver(driverId);
            if (driver != null) {
                if (ride.getDropoff() != null) {
                    driver.setCurrentLocation(ride.getDropoff());
                }
                driver.setStatus(DriverStatus.AVAILABLE);
                repository.updateDriver(driver);
            }
        }

        repository.updateRide(ride);
        return ride;
    }

    public Ride cancelTrip(String rideId) {
        Ride ride = getRide(rideId);
        ride.setStatus(RideStatus.CANCELLED);

        String driverId = ride.getDriverId();
        if (driverId != null) {
            Driver driver = repository.getDriver(driverId);
            if (driver != null) {
                driver.setStatus(DriverStatus.AVAILABLE);
                repository.updateDriver(driver);
            }
        }

        repository.updateRide(ride);
        return ride;
    }

    public Ride getRide(String rideId) {
        Ride ride = repository.getRide(rideId);
        if (ride == null) throw new IllegalArgumentException("Ride not found: " + rideId);
        return ride;
    }

    public List<Ride> getUserRides(String userId) {
        return repository.getRidesByUser(userId);
    }

    public List<Ride> getAllRides() {
        return repository.getAllRides();
    }

    public record FareEstimate(double distanceKm, double fare, VehicleType vehicleType, boolean driversAvailable, String nearestDriverName, double driverDistanceKm) {}
}
