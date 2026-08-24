package com.lld.carrental.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Reservation {
    private String id;
    private String customerId;
    private String vehicleId;
    private String branchId;
    private LocalDate startDate;
    private LocalDate endDate;
    private ReservationStatus status;
    private double estimatedCost;
    private Double actualCost;
    private String pricingStrategyName;
    private Integer returnOdometer;
    private String paymentId;
    private LocalDateTime createdAt;
}
