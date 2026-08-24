package com.lld.zomato.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Order {
    private String id;
    private String customerId;
    private String customerName;
    private String customerPhone;
    private String deliveryAddress;

    private String restaurantId;
    private String restaurantName;

    @Builder.Default
    private List<OrderItem> items = new ArrayList<>();
    private double itemTotal;
    private double deliveryFee;
    private double tax;
    private double totalAmount;

    @Builder.Default
    private OrderStatus status = OrderStatus.PLACED;
    private String deliveryAgentId;
    private String deliveryAgentName;
    private String deliveryAgentPhone;

    private Payment payment;
    private String deliveryOtp;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    public Order(String id, String customerId, String customerName, String customerPhone, String deliveryAddress,
                 String restaurantId, String restaurantName, List<OrderItem> items,
                 double itemTotal, double deliveryFee, double tax, double totalAmount,
                 Payment payment, String deliveryOtp) {
        this.id = id;
        this.customerId = customerId;
        this.customerName = customerName;
        this.customerPhone = customerPhone;
        this.deliveryAddress = deliveryAddress;
        this.restaurantId = restaurantId;
        this.restaurantName = restaurantName;
        this.items = items;
        this.itemTotal = itemTotal;
        this.deliveryFee = deliveryFee;
        this.tax = tax;
        this.totalAmount = totalAmount;
        this.status = OrderStatus.PLACED;
        this.payment = payment;
        this.deliveryOtp = deliveryOtp;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public void setStatus(OrderStatus status) {
        this.status = status;
        this.updatedAt = LocalDateTime.now();
    }
}
