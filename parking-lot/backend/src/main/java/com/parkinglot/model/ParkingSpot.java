package com.parkinglot.model;

public class ParkingSpot {
    private String id;
    private int floorNumber;
    private int spotNumber;
    private VehicleType vehicleType;
    private boolean occupied;

    public ParkingSpot(String id, int floorNumber, int spotNumber, VehicleType vehicleType) {
        this.id = id;
        this.floorNumber = floorNumber;
        this.spotNumber = spotNumber;
        this.vehicleType = vehicleType;
        this.occupied = false;
    }

    public String getId() { return id; }
    public int getFloorNumber() { return floorNumber; }
    public int getSpotNumber() { return spotNumber; }
    public VehicleType getVehicleType() { return vehicleType; }
    public boolean isOccupied() { return occupied; }
    public void setOccupied(boolean occupied) { this.occupied = occupied; }
}
