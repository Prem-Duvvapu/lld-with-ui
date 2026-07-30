package com.lld.parkinglot.strategy;

import com.lld.parkinglot.model.ParkingSpot;
import com.lld.parkinglot.model.VehicleType;

import java.util.List;

public interface SpotAssignmentStrategy {
    ParkingSpot findSpot(List<ParkingSpot> availableSpots, VehicleType vehicleType);
}
