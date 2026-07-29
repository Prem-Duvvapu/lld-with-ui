package com.lld.zomato.model;

public class DeliveryPartner {
    private String id;
    private String name;
    private String phone;
    private boolean available;

    public DeliveryPartner(String id, String name, String phone) {
        this.id = id;
        this.name = name;
        this.phone = phone;
        this.available = true;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getPhone() { return phone; }
    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }
}
