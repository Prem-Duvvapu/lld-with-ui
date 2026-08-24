package com.lld.carrental.payment;

import com.lld.carrental.model.PaymentMethod;
import com.lld.carrental.model.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment {
    private String id;
    private String reservationId;
    private double amount;
    private PaymentMethod method;
    private PaymentStatus status;
    private LocalDateTime timestamp;
}
