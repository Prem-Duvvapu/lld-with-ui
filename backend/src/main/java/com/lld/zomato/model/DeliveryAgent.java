package com.lld.zomato.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryAgent {
    private String id;
    private String name;
    private String phone;
    private String vehicleNumber;
    @Builder.Default
    private boolean available = true;
    @Builder.Default
    private double currentLat = 12.9716;
    @Builder.Default
    private double currentLng = 77.5946;
    @Builder.Default
    private int totalDeliveries = 0;

    public DeliveryAgent(String id, String name, String phone, String vehicleNumber, boolean available) {
        this.id = id;
        this.name = name;
        this.phone = phone;
        this.vehicleNumber = vehicleNumber;
        this.available = available;
        this.currentLat = 12.9716;
        this.currentLng = 77.5946;
        this.totalDeliveries = 0;
    }

    public void incrementDeliveries() {
        this.totalDeliveries++;
    }
}
