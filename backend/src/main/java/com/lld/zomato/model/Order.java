package com.lld.zomato.model;

import java.time.LocalDateTime;
import java.util.List;

public class Order {
    private String id;
    private String customerId;
    private String customerName;
    private String customerPhone;
    private String deliveryAddress;

    private String restaurantId;
    private String restaurantName;
    
    private List<OrderItem> items;
    private double itemTotal;
    private double deliveryFee;
    private double tax;
    private double totalAmount;

    private OrderStatus status;
    private String deliveryAgentId;
    private String deliveryAgentName;
    private String deliveryAgentPhone;

    private Payment payment;
    private String deliveryOtp;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Order() {
        this.status = OrderStatus.PLACED;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

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

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }

    public String getDeliveryAddress() { return deliveryAddress; }
    public void setDeliveryAddress(String deliveryAddress) { this.deliveryAddress = deliveryAddress; }

    public String getRestaurantId() { return restaurantId; }
    public void setRestaurantId(String restaurantId) { this.restaurantId = restaurantId; }

    public String getRestaurantName() { return restaurantName; }
    public void setRestaurantName(String restaurantName) { this.restaurantName = restaurantName; }

    public List<OrderItem> getItems() { return items; }
    public void setItems(List<OrderItem> items) { this.items = items; }

    public double getItemTotal() { return itemTotal; }
    public void setItemTotal(double itemTotal) { this.itemTotal = itemTotal; }

    public double getDeliveryFee() { return deliveryFee; }
    public void setDeliveryFee(double deliveryFee) { this.deliveryFee = deliveryFee; }

    public double getTax() { return tax; }
    public void setTax(double tax) { this.tax = tax; }

    public double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(double totalAmount) { this.totalAmount = totalAmount; }

    public OrderStatus getStatus() { return status; }
    public void setStatus(OrderStatus status) {
        this.status = status;
        this.updatedAt = LocalDateTime.now();
    }

    public String getDeliveryAgentId() { return deliveryAgentId; }
    public void setDeliveryAgentId(String deliveryAgentId) { this.deliveryAgentId = deliveryAgentId; }

    public String getDeliveryAgentName() { return deliveryAgentName; }
    public void setDeliveryAgentName(String deliveryAgentName) { this.deliveryAgentName = deliveryAgentName; }

    public String getDeliveryAgentPhone() { return deliveryAgentPhone; }
    public void setDeliveryAgentPhone(String deliveryAgentPhone) { this.deliveryAgentPhone = deliveryAgentPhone; }

    public Payment getPayment() { return payment; }
    public void setPayment(Payment payment) { this.payment = payment; }

    public String getDeliveryOtp() { return deliveryOtp; }
    public void setDeliveryOtp(String deliveryOtp) { this.deliveryOtp = deliveryOtp; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
