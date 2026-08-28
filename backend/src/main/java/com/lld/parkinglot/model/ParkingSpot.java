package com.lld.parkinglot.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
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
}
