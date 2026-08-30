package com.lld.linkedin.model;

import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.Objects;

@Getter
public class User {
    private final String id;
    private String name;
    private final String email;
    @Setter
    private String passwordHash;
    @Setter
    private Profile profile;
    private final Instant createdAt;
    @Setter
    private volatile Instant lastLoginAt;

    public User(String id, String name, String email, String passwordHash) {
        if (id == null || id.trim().isEmpty()) {
            throw new IllegalArgumentException("User ID cannot be null or empty");
        }
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Name cannot be null or empty");
        }
        if (email == null || !email.contains("@")) {
            throw new IllegalArgumentException("Invalid email format");
        }
        if (passwordHash == null || passwordHash.trim().isEmpty()) {
            throw new IllegalArgumentException("Password hash cannot be null or empty");
        }
        this.id = id;
        this.name = name.trim();
        this.email = email.trim().toLowerCase();
        this.passwordHash = passwordHash;
        this.profile = new Profile(id);
        this.createdAt = Instant.now();
        this.lastLoginAt = Instant.now();
    }

    public void setName(String name) {
        this.name = name != null ? name.trim() : "";
    }

    public boolean validatePassword(String rawPassword) {
        if (rawPassword == null) return false;
        // Simple hash comparison for in-memory demo (or SHA-256 equivalent)
        return Integer.toHexString(rawPassword.hashCode()).equals(this.passwordHash) ||
               rawPassword.equals(this.passwordHash);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        User user = (User) o;
        return Objects.equals(id, user.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
