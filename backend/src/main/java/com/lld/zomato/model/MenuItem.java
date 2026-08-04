package com.lld.zomato.model;

public class MenuItem {
    private String id;
    private String name;
    private String description;
    private double price;
    private String category;
    private boolean isVeg;
    private boolean available;

    public MenuItem() {}

    public MenuItem(String id, String name, String description, double price, String category, boolean isVeg, boolean available) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.price = price;
        this.category = category;
        this.isVeg = isVeg;
        this.available = available;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public boolean isVeg() { return isVeg; }
    public void setVeg(boolean veg) { isVeg = veg; }

    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }
}
