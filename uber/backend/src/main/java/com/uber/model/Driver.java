package com.uber.model;

public class Driver {
    private String id;
    private String name;
    private String phone;
    private VehicleType vehicleType;
    private String vehicleNumber;
    private Location location;
    private boolean available;

    public Driver(String id, String name, String phone, VehicleType vehicleType,
                  String vehicleNumber, Location location) {
        this.id = id;
        this.name = name;
        this.phone = phone;
        this.vehicleType = vehicleType;
        this.vehicleNumber = vehicleNumber;
        this.location = location;
        this.available = true;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getPhone() { return phone; }
    public VehicleType getVehicleType() { return vehicleType; }
    public String getVehicleNumber() { return vehicleNumber; }
    public Location getLocation() { return location; }
    public void setLocation(Location location) { this.location = location; }
    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }
}
