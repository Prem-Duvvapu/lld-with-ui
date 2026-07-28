package com.zomato.model;

import java.time.LocalDateTime;
import java.util.List;

public class Order {
    private String id;
    private String userId;
    private String restaurantId;
    private String restaurantName;
    private List<OrderItem> items;
    private double totalAmount;
    private OrderStatus status;
    private String deliveryPartnerId;
    private String deliveryPartnerName;
    private LocalDateTime createdAt;

    public Order(String id, String userId, String restaurantId, String restaurantName,
                 List<OrderItem> items, double totalAmount) {
        this.id = id;
        this.userId = userId;
        this.restaurantId = restaurantId;
        this.restaurantName = restaurantName;
        this.items = items;
        this.totalAmount = totalAmount;
        this.status = OrderStatus.PLACED;
        this.createdAt = LocalDateTime.now();
    }

    public String getId() { return id; }
    public String getUserId() { return userId; }
    public String getRestaurantId() { return restaurantId; }
    public String getRestaurantName() { return restaurantName; }
    public List<OrderItem> getItems() { return items; }
    public double getTotalAmount() { return totalAmount; }
    public OrderStatus getStatus() { return status; }
    public void setStatus(OrderStatus status) { this.status = status; }
    public String getDeliveryPartnerId() { return deliveryPartnerId; }
    public void setDeliveryPartnerId(String deliveryPartnerId) { this.deliveryPartnerId = deliveryPartnerId; }
    public String getDeliveryPartnerName() { return deliveryPartnerName; }
    public void setDeliveryPartnerName(String deliveryPartnerName) { this.deliveryPartnerName = deliveryPartnerName; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
