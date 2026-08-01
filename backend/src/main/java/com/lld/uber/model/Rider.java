package com.lld.uber.model;

public class Rider extends User {
    private Location currentLocation;

    public Rider() {}

    public Rider(String id, String name, String phone, Location currentLocation) {
        super(id, name, phone);
        this.currentLocation = currentLocation;
    }

    public Location getCurrentLocation() { return currentLocation; }
    public void setCurrentLocation(Location currentLocation) { this.currentLocation = currentLocation; }
}
