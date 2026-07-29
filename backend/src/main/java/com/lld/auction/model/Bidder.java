package com.lld.auction.model;

public class Bidder {
    private static long idCounter = 0;
    private final long id;
    private final String name;
    private final String email;

    public Bidder(String name, String email) {
        this.id = ++idCounter;
        this.name = name;
        this.email = email;
    }

    public long getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
}