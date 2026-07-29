package com.lld.socialnetwork.model;

public class User {
    private long id;
    private String name;
    private String email;
    private String bio;

    public User(long id, String name, String email, String bio) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.bio = bio;
    }

    public long getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getBio() { return bio; }
    public void setName(String name) { this.name = name; }
    public void setEmail(String email) { this.email = email; }
    public void setBio(String bio) { this.bio = bio; }
}
