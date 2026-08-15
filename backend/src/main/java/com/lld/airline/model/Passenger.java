package com.lld.airline.model;

public class Passenger {
    private final String passengerId;
    private final String name;
    private final String email;
    private final String passportOrId;

    public Passenger(String passengerId, String name, String email, String passportOrId) {
        this.passengerId = passengerId;
        this.name = name != null ? name.trim() : "Passenger";
        this.email = email != null ? email.trim() : "";
        this.passportOrId = passportOrId != null ? passportOrId.trim() : "";
    }

    public String getPassengerId() {
        return passengerId;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public String getPassportOrId() {
        return passportOrId;
    }
}
