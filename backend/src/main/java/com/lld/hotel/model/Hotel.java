package com.lld.hotel.model;

import java.util.List;

public class Hotel {
    private String id;
    private String name;
    private String location;
    private double rating;
    private List<String> amenities;

    public Hotel() {}

    public Hotel(String id, String name, String location, double rating, List<String> amenities) {
        this.id = id;
        this.name = name;
        this.location = location;
        this.rating = rating;
        this.amenities = amenities;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public double getRating() { return rating; }
    public void setRating(double rating) { this.rating = rating; }
    public List<String> getAmenities() { return amenities; }
    public void setAmenities(List<String> amenities) { this.amenities = amenities; }
}
