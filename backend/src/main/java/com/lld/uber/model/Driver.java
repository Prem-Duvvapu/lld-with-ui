package com.lld.uber.model;

public class Driver extends User {
    private VehicleType vehicleType;
    private String vehicleNumber;
    private Location currentLocation;
    private DriverStatus status;

    public Driver() {}

    public Driver(String id, String name, String phone, VehicleType vehicleType,
                  String vehicleNumber, Location currentLocation) {
        super(id, name, phone);
        this.vehicleType = vehicleType;
        this.vehicleNumber = vehicleNumber;
        this.currentLocation = currentLocation;
        this.status = DriverStatus.AVAILABLE;
    }

    public VehicleType getVehicleType() { return vehicleType; }
    public void setVehicleType(VehicleType vehicleType) { this.vehicleType = vehicleType; }

    public String getVehicleNumber() { return vehicleNumber; }
    public void setVehicleNumber(String vehicleNumber) { this.vehicleNumber = vehicleNumber; }

    public Location getCurrentLocation() { return currentLocation; }
    public void setCurrentLocation(Location currentLocation) { this.currentLocation = currentLocation; }

    public Location getLocation() { return currentLocation; }
    public void setLocation(Location location) { this.currentLocation = location; }

    public DriverStatus getStatus() { return status; }
    public void setStatus(DriverStatus status) { this.status = status; }

    public boolean isAvailable() { return this.status == DriverStatus.AVAILABLE; }
    public void setAvailable(boolean available) {
        this.status = available ? DriverStatus.AVAILABLE : DriverStatus.ON_TRIP;
    }
}
