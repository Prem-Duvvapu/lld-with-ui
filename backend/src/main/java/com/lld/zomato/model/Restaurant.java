package com.lld.zomato.model;

import java.util.List;

public class Restaurant {
    private String id;
    private String name;
    private String cuisine;
    private double rating;
    private String location;
    private List<MenuItem> menu;

    public Restaurant(String id, String name, String cuisine, double rating, String location, List<MenuItem> menu) {
        this.id = id;
        this.name = name;
        this.cuisine = cuisine;
        this.rating = rating;
        this.location = location;
        this.menu = menu;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getCuisine() { return cuisine; }
    public double getRating() { return rating; }
    public String getLocation() { return location; }
    public List<MenuItem> getMenu() { return menu; }
}
