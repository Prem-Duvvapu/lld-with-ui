package com.uber.model;

import java.time.LocalDateTime;

public class Ride {
    private String id;
    private String userId;
    private String driverId;
    private String driverName;
    private String vehicleNumber;
    private VehicleType vehicleType;
    private Location pickup;
    private Location dropoff;
    private double distanceKm;
    private double fare;
    private RideStatus status;
    private LocalDateTime createdAt;

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
    public String getDriverId() { return driverId; }
    public void setDriverId(String driverId) { this.driverId = driverId; }
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
    public LocalDateTime getCreatedAt() { return createdAt; }
}
