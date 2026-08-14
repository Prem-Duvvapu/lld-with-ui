package com.lld.movieticket.model;

import java.util.ArrayList;
import java.util.List;

public class Theater {
    private long id;
    private String name;
    private String location;
    private List<Long> screenIds = new ArrayList<>();

    public Theater() {}

    public Theater(long id, String name, String location, List<Long> screenIds) {
        this.id = id;
        this.name = name;
        this.location = location;
        if (screenIds != null) {
            this.screenIds = screenIds;
        }
    }

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public List<Long> getScreenIds() { return screenIds; }
    public void setScreenIds(List<Long> screenIds) { this.screenIds = screenIds; }
}
