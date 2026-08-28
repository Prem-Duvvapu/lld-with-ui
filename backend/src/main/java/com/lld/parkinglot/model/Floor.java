package com.lld.parkinglot.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Floor {
    private int floorNumber;
    private List<ParkingSpot> spots;
}
