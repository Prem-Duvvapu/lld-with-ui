package com.lld.uber.model;

import com.lld.uber.payment.Payment;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

public class Ride {
    private String id;
    private String userId;
    private Rider rider;
    private String driverId;
    private Driver driver;
    private String driverName;
    private String vehicleNumber;
    private VehicleType vehicleType;
    private Location pickup;
    private Location dropoff;
    private double distanceKm;
    private double fare;
    private RideStatus status;
    private Payment payment;
    private LocalDateTime createdAt;
    private Set<String> declinedDriverIds = new HashSet<>();

    public Ride() {}

    public Ride(String id, String userId, Location pickup, Location dropoff,
                double distanceKm, double fare, VehicleType vehicleType) {
        this.id = id;
        this.userId = userId;
        this.pickup = pickup;
        this.dropoff = dropoff;
        this.distanceKm = distanceKm;
        this.fare = fare;
        this.vehicleType = vehicleType;
        this.status = RideStatus.REQUESTED;
        this.createdAt = LocalDateTime.now();
    }

    public String getId() { return id; }
    public String getUserId() { return userId; }
    public Rider getRider() { return rider; }
    public void setRider(Rider rider) { this.rider = rider; }

    public String getDriverId() { return driverId; }
    public void setDriverId(String driverId) { this.driverId = driverId; }

    public Driver getDriver() { return driver; }
    public void setDriver(Driver driver) { this.driver = driver; }

    public String getDriverName() { return driverName; }
    public void setDriverName(String driverName) { this.driverName = driverName; }

    public String getVehicleNumber() { return vehicleNumber; }
    public void setVehicleNumber(String vehicleNumber) { this.vehicleNumber = vehicleNumber; }

    public VehicleType getVehicleType() { return vehicleType; }
    public Location getPickup() { return pickup; }
    public Location getDropoff() { return dropoff; }
    public double getDistanceKm() { return distanceKm; }
    public double getFare() { return fare; }

    public RideStatus getStatus() { return status; }
    public void setStatus(RideStatus status) { this.status = status; }

    public Payment getPayment() { return payment; }
    public void setPayment(Payment payment) { this.payment = payment; }

    public LocalDateTime getCreatedAt() { return createdAt; }

    public Set<String> getDeclinedDriverIds() { return declinedDriverIds; }
    public void addDeclinedDriver(String driverId) {
        if (declinedDriverIds == null) declinedDriverIds = new HashSet<>();
        declinedDriverIds.add(driverId);
    }
    public boolean isDeclinedBy(String driverId) {
        return declinedDriverIds != null && declinedDriverIds.contains(driverId);
    }
}
