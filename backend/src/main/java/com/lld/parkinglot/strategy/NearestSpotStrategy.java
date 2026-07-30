package com.lld.parkinglot.strategy;

import com.lld.parkinglot.model.ParkingSpot;
import com.lld.parkinglot.model.VehicleType;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;

@Component("nearestSpotStrategy")
public class NearestSpotStrategy implements SpotAssignmentStrategy {

    @Override
    public ParkingSpot findSpot(List<ParkingSpot> availableSpots, VehicleType vehicleType) {
        return availableSpots.stream()
                .filter(spot -> !spot.isOccupied() && spot.getVehicleType() == vehicleType)
                .min(Comparator.comparingInt(ParkingSpot::getFloorNumber)
                        .thenComparingInt(ParkingSpot::getSpotNumber))
                .orElse(null);
    }
}
