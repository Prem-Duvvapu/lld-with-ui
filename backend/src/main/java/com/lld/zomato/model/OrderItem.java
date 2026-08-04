package com.lld.zomato.model;

public class OrderItem {
    private String itemId;
    private String name;
    private double price;
    private int quantity;
    private String specialInstructions;

    public OrderItem() {}

    public OrderItem(String itemId, String name, double price, int quantity) {
        this.itemId = itemId;
        this.name = name;
        this.price = price;
        this.quantity = quantity;
        this.specialInstructions = "";
    }

    public OrderItem(String itemId, String name, double price, int quantity, String specialInstructions) {
        this.itemId = itemId;
        this.name = name;
        this.price = price;
        this.quantity = quantity;
        this.specialInstructions = specialInstructions;
    }

    public String getItemId() { return itemId; }
    public void setItemId(String itemId) { this.itemId = itemId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public String getSpecialInstructions() { return specialInstructions; }
    public void setSpecialInstructions(String specialInstructions) { this.specialInstructions = specialInstructions; }
}
