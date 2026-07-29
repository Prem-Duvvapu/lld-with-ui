package com.lld.uber.repository;

import com.lld.uber.model.Driver;
import com.lld.uber.model.Ride;
import com.lld.uber.model.VehicleType;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Repository
public class UberRepository {

    private final Map<String, Driver> drivers = new LinkedHashMap<>();
    private final Map<String, Ride> rides = new ConcurrentHashMap<>();
    private int rideCounter = 0;

    public void addDriver(Driver driver) {
        drivers.put(driver.getId(), driver);
    }

    public List<Driver> getAvailableDrivers(VehicleType vehicleType) {
        return drivers.values().stream()
                .filter(d -> d.isAvailable() && d.getVehicleType() == vehicleType)
                .collect(Collectors.toList());
    }

    public Driver getDriver(String id) {
        return drivers.get(id);
    }

    public void updateDriver(Driver driver) {
        drivers.put(driver.getId(), driver);
    }

    public String generateRideId() {
        rideCounter++;
        return "RIDE-" + String.format("%05d", rideCounter);
    }

    public void saveRide(Ride ride) {
        rides.put(ride.getId(), ride);
    }

    public Ride getRide(String id) {
        return rides.get(id);
    }

    public void updateRide(Ride ride) {
        rides.put(ride.getId(), ride);
    }

    public List<Ride> getRidesByUser(String userId) {
        return rides.values().stream()
                .filter(r -> r.getUserId().equals(userId))
                .sorted(Comparator.comparing(Ride::getCreatedAt).reversed())
                .collect(Collectors.toList());
    }
}
