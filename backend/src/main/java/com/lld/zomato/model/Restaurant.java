package com.lld.zomato.model;

import java.util.ArrayList;
import java.util.List;

public class Restaurant {
    private String id;
    private String name;
    private String address;
    private String cuisine;
    private double rating;
    private boolean open;
    private List<MenuItem> menu;

    public Restaurant() {
        this.menu = new ArrayList<>();
        this.open = true;
    }

    public Restaurant(String id, String name, String address, String cuisine, double rating, List<MenuItem> menu) {
        this.id = id;
        this.name = name;
        this.address = address;
        this.cuisine = cuisine;
        this.rating = rating;
        this.open = true;
        this.menu = menu != null ? menu : new ArrayList<>();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getCuisine() { return cuisine; }
    public void setCuisine(String cuisine) { this.cuisine = cuisine; }

    public double getRating() { return rating; }
    public void setRating(double rating) { this.rating = rating; }

    public boolean isOpen() { return open; }
    public void setOpen(boolean open) { this.open = open; }

    public List<MenuItem> getMenu() { return menu; }
    public void setMenu(List<MenuItem> menu) { this.menu = menu; }

    public void addMenuItem(MenuItem item) {
        if (this.menu == null) this.menu = new ArrayList<>();
        this.menu.add(item);
    }

    public void removeMenuItem(String itemId) {
        if (this.menu != null) {
            this.menu.removeIf(item -> item.getId().equals(itemId));
        }
    }

    public MenuItem getMenuItem(String itemId) {
        if (this.menu != null) {
            for (MenuItem item : this.menu) {
                if (item.getId().equals(itemId)) return item;
            }
        }
        return null;
    }
}
