package com.lld.shoppingcart.model;

public class OrderItem {
    private final String productId;
    private final String productName;
    private final double unitPrice;
    private final int quantity;

    public OrderItem(String productId, String productName, double unitPrice, int quantity) {
        this.productId = productId;
        this.productName = productName;
        this.unitPrice = unitPrice;
        this.quantity = quantity;
    }

    public String getProductId() {
        return productId;
    }

    public String getProductName() {
        return productName;
    }

    public double getUnitPrice() {
        return unitPrice;
    }

    public int getQuantity() {
        return quantity;
    }

    public double getTotalPrice() {
        return unitPrice * quantity;
    }
}
