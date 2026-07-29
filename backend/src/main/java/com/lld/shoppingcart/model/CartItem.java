package com.lld.shoppingcart.model;

public class CartItem {
    private long productId;
    private int quantity;
    private double unitPrice;
    private double totalPrice;

    public CartItem() {}

    public CartItem(long productId, int quantity, double unitPrice) {
        this.productId = productId;
        this.quantity = quantity;
        this.unitPrice = unitPrice;
        this.totalPrice = unitPrice * quantity;
    }

    public long getProductId() { return productId; }
    public void setProductId(long productId) { this.productId = productId; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; recalculateTotal(); }
    public double getUnitPrice() { return unitPrice; }
    public void setUnitPrice(double unitPrice) { this.unitPrice = unitPrice; recalculateTotal(); }
    public double getTotalPrice() { return totalPrice; }
    public void setTotalPrice(double totalPrice) { this.totalPrice = totalPrice; }

    private void recalculateTotal() {
        this.totalPrice = this.unitPrice * this.quantity;
    }
}