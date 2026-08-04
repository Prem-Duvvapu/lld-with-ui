package com.lld.zomato.model;

public class Customer {
    private String id;
    private String name;
    private String email;
    private String phone;
    private String deliveryAddress;

    public Customer() {}

    public Customer(String id, String name, String email, String phone, String deliveryAddress) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.deliveryAddress = deliveryAddress;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getDeliveryAddress() { return deliveryAddress; }
    public void setDeliveryAddress(String deliveryAddress) { this.deliveryAddress = deliveryAddress; }
}
