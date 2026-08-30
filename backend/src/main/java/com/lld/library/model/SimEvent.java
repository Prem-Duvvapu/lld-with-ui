package com.lld.library.model;

import lombok.Getter;

import java.util.Map;

@Getter
public class SimEvent {
    private final long id;
    private final String timestamp;
    private final String type;
    private final String actor;
    private final String description;
    private final Map<String, Object> data;

    public SimEvent(long id, String timestamp, String type, String actor, String description, Map<String, Object> data) {
        this.id = id;
        this.timestamp = timestamp;
        this.type = type;
        this.actor = actor;
        this.description = description;
        this.data = data;
    }
}
