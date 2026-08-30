package com.lld.movieticket.model;

import lombok.Getter;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
public class SimEvent {
    private long id;
    private String timestamp;
    private String eventType;
    private String actorName;
    private String description;
    private Map<String, Object> data;
    private Map<Long, String> seatMapSnapshot;

    public SimEvent() {}

    public SimEvent(long id, String timestamp, String eventType, String actorName, String description, Map<String, Object> data, Map<Long, String> seatMapSnapshot) {
        this.id = id;
        this.timestamp = timestamp;
        this.eventType = eventType;
        this.actorName = actorName;
        this.description = description;
        this.data = data;
        this.seatMapSnapshot = seatMapSnapshot;
    }
}
