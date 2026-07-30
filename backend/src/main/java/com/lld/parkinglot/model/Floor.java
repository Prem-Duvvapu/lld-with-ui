package com.lld.parkinglot.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Floor {
    private int floorNumber;
    private List<ParkingSpot> spots;
}
