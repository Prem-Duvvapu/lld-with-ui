package com.lld.carrental.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Vehicle {
    private String id;
    private String make;
    private String model;
    private int year;
    private String licensePlate;
    private VehicleType type;
    private VehicleStatus status;
    private String branchId;
    private int odometer;
}
