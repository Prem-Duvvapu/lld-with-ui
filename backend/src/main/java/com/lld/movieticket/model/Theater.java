package com.lld.movieticket.model;

import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
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
}
