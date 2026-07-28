package com.stackoverflow.model;

public class Tag {
    private String name;
    private String description;

    public Tag(String name, String description) {
        this.name = name;
        this.description = description;
    }

    public String getName() { return name; }
    public String getDescription() { return description; }
}
