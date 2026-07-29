package com.lld.splitwise.model;

import java.util.List;

public class Group {
    private long id;
    private String name;
    private List<User> members;

    public Group() {}

    public Group(long id, String name, List<User> members) {
        this.id = id;
        this.name = name;
        this.members = members;
    }

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public List<User> getMembers() { return members; }
    public void setMembers(List<User> members) { this.members = members; }
}
