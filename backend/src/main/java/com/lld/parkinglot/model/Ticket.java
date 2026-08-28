package com.lld.parkinglot.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
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

    public enum PaymentStatus { UNPAID, PAID }

    @Builder.Default
    private PaymentStatus paymentStatus = PaymentStatus.UNPAID;
    private String paymentMethod;

    public Ticket(String ticketNumber, String vehicleNumber, VehicleType vehicleType, String spotId, LocalDateTime entryTime) {
        this.ticketNumber = ticketNumber;
        this.vehicleNumber = vehicleNumber;
        this.vehicleType = vehicleType;
        this.spotId = spotId;
        this.entryTime = entryTime;
        this.paymentStatus = PaymentStatus.UNPAID;
    }
}
