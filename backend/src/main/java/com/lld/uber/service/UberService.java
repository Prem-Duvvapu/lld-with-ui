package com.lld.uber.service;

import com.lld.uber.model.*;
import com.lld.uber.repository.UberRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UberService {

    private static final double RATE_GO = 12.0;
    private static final double RATE_XL = 18.0;
    private static final double RATE_PREMIUM = 25.0;

    private final UberRepository repository;

    public UberService(UberRepository repository) {
        this.repository = repository;
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

        List<Driver> available = repository.getAvailableDrivers(vehicleType);

        return new FareEstimate(distance, Math.round(fare * 100.0) / 100.0, vehicleType, !available.isEmpty());
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
        double fare = 25 + distance * rate;
        fare = Math.round(fare * 100.0) / 100.0;

        String rideId = repository.generateRideId();
        Ride ride = new Ride(rideId, userId, pickup, dropoff, distance, fare, vehicleType);
        repository.saveRide(ride);

        List<Driver> available = repository.getAvailableDrivers(vehicleType);
        if (!available.isEmpty()) {
            Driver driver = available.get(0);
            driver.setAvailable(false);
            ride.setDriverId(driver.getId());
            ride.setDriverName(driver.getName());
            ride.setVehicleNumber(driver.getVehicleNumber());
            ride.setStatus(RideStatus.ACCEPTED);
            repository.updateDriver(driver);
            repository.updateRide(ride);
        }

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

    public Ride updateStatus(String rideId, String statusStr) {
        Ride ride = getRide(rideId);
        RideStatus newStatus = RideStatus.valueOf(statusStr.toUpperCase());

        ride.setStatus(newStatus);

        if (newStatus == RideStatus.CANCELLED || newStatus == RideStatus.COMPLETED) {
            String driverId = ride.getDriverId();
            if (driverId != null) {
                Driver driver = repository.getDriver(driverId);
                if (driver != null) {
                    if (newStatus == RideStatus.COMPLETED && ride.getDropoff() != null) {
                        driver.setLocation(ride.getDropoff());
                    }
                    driver.setAvailable(true);
                    repository.updateDriver(driver);
                }
            }
        }

        repository.updateRide(ride);
        return ride;
    }

    public record FareEstimate(double distanceKm, double fare, VehicleType vehicleType, boolean driversAvailable) {}
}
