package com.lld.zomato.model;

public class OrderItem {
    private String menuItemId;
    private String name;
    private int quantity;
    private double price;

    public OrderItem(String menuItemId, String name, int quantity, double price) {
        this.menuItemId = menuItemId;
        this.name = name;
        this.quantity = quantity;
        this.price = price;
    }

    public String getMenuItemId() { return menuItemId; }
    public String getName() { return name; }
    public int getQuantity() { return quantity; }
    public double getPrice() { return price; }
}
