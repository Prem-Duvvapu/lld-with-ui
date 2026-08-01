package com.lld.uber.repository;

import com.lld.uber.model.*;
import com.lld.uber.payment.Payment;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

@Repository
public class UberRepository {

    private final Map<String, Driver> drivers = new ConcurrentHashMap<>();
    private final Map<String, Rider> riders = new ConcurrentHashMap<>();
    private final Map<String, Ride> rides = new ConcurrentHashMap<>();
    private final Map<String, Payment> payments = new ConcurrentHashMap<>();

    private final ReentrantLock rideLock = new ReentrantLock();
    private int rideCounter = 0;

    public void registerRider(Rider rider) {
        riders.put(rider.getId(), rider);
    }

    public Rider getRider(String id) {
        return riders.get(id);
    }

    public List<Rider> getAllRiders() {
        return new ArrayList<>(riders.values());
    }

    public void registerDriver(Driver driver) {
        drivers.put(driver.getId(), driver);
    }

    public void addDriver(Driver driver) {
        registerDriver(driver);
    }

    public Driver getDriver(String id) {
        return drivers.get(id);
    }

    public List<Driver> getAllDrivers() {
        return new ArrayList<>(drivers.values());
    }

    public List<Driver> getAvailableDrivers(VehicleType vehicleType) {
        return drivers.values().stream()
                .filter(d -> d.getStatus() == DriverStatus.AVAILABLE && d.getVehicleType() == vehicleType)
                .collect(Collectors.toList());
    }

    public List<Driver> findNearestAvailableDrivers(Location pickup, VehicleType vehicleType, double radiusKm) {
        return drivers.values().stream()
                .filter(d -> d.getStatus() == DriverStatus.AVAILABLE && d.getVehicleType() == vehicleType)
                .filter(d -> d.getCurrentLocation() != null && pickup != null && d.getCurrentLocation().distanceTo(pickup) <= radiusKm)
                .sorted(Comparator.comparingDouble(d -> d.getCurrentLocation().distanceTo(pickup)))
                .collect(Collectors.toList());
    }

    public void updateDriver(Driver driver) {
        drivers.put(driver.getId(), driver);
    }

    public String generateRideId() {
        rideLock.lock();
        try {
            rideCounter++;
            return "RIDE-" + String.format("%05d", rideCounter);
        } finally {
            rideLock.unlock();
        }
    }

    public void saveRide(Ride ride) {
        rides.put(ride.getId(), ride);
    }

    public Ride getRide(String id) {
        return rides.get(id);
    }

    public List<Ride> getAllRides() {
        return rides.values().stream()
                .sorted(Comparator.comparing(Ride::getCreatedAt).reversed())
                .collect(Collectors.toList());
    }

    public List<Ride> getAvailableRideRequestsForDriver(String driverId) {
        Driver driver = getDriver(driverId);
        if (driver == null) return Collections.emptyList();

        return rides.values().stream()
                .filter(r -> r.getStatus() == RideStatus.REQUESTED)
                .filter(r -> r.getVehicleType() == driver.getVehicleType())
                .filter(r -> !r.isDeclinedBy(driverId))
                .sorted(Comparator.comparing(Ride::getCreatedAt).reversed())
                .collect(Collectors.toList());
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

    public void savePayment(Payment payment) {
        payments.put(payment.getId(), payment);
    }

    public Payment getPayment(String id) {
        return payments.get(id);
    }
}
