package com.lld.parkinglot.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Ticket {
    private String ticketNumber;
    private String vehicleNumber;
    private VehicleType vehicleType;
    private String spotId;
    private LocalDateTime entryTime;
    private LocalDateTime exitTime;
    private double amount;

    public Ticket(String ticketNumber, String vehicleNumber, VehicleType vehicleType, String spotId, LocalDateTime entryTime) {
        this.ticketNumber = ticketNumber;
        this.vehicleNumber = vehicleNumber;
        this.vehicleType = vehicleType;
        this.spotId = spotId;
        this.entryTime = entryTime;
    }
}
