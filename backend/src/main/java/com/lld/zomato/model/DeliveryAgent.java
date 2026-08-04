package com.lld.zomato.model;

public class DeliveryAgent {
    private String id;
    private String name;
    private String phone;
    private String vehicleNumber;
    private boolean available;
    private double currentLat;
    private double currentLng;
    private int totalDeliveries;

    public DeliveryAgent() {}

    public DeliveryAgent(String id, String name, String phone, String vehicleNumber, boolean available) {
        this.id = id;
        this.name = name;
        this.phone = phone;
        this.vehicleNumber = vehicleNumber;
        this.available = available;
        this.currentLat = 12.9716;
        this.currentLng = 77.5946;
        this.totalDeliveries = 0;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getVehicleNumber() { return vehicleNumber; }
    public void setVehicleNumber(String vehicleNumber) { this.vehicleNumber = vehicleNumber; }

    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }

    public double getCurrentLat() { return currentLat; }
    public void setCurrentLat(double currentLat) { this.currentLat = currentLat; }

    public double getCurrentLng() { return currentLng; }
    public void setCurrentLng(double currentLng) { this.currentLng = currentLng; }

    public int getTotalDeliveries() { return totalDeliveries; }
    public void incrementDeliveries() { this.totalDeliveries++; }
}
