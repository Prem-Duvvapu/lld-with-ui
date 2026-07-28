package com.parkinglot.model;

import java.util.List;

public class Floor {
    private int floorNumber;
    private List<ParkingSpot> spots;

    public Floor(int floorNumber, List<ParkingSpot> spots) {
        this.floorNumber = floorNumber;
        this.spots = spots;
    }

    public int getFloorNumber() { return floorNumber; }
    public List<ParkingSpot> getSpots() { return spots; }
}
