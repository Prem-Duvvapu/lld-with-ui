package com.stackoverflow.model;

import java.time.LocalDateTime;

public class User {
    private String id;
    private String username;
    private String email;
    private int reputation;
    private LocalDateTime createdAt;

    public User(String id, String username, String email) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.reputation = 1;
        this.createdAt = LocalDateTime.now();
    }

    public String getId() { return id; }
    public String getUsername() { return username; }
    public String getEmail() { return email; }
    public int getReputation() { return reputation; }
    public void setReputation(int reputation) { this.reputation = reputation; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
