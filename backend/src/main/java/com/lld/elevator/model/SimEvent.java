package com.lld.elevator.model;

import java.util.Map;

public class SimEvent {
    private long id;
    private String timestamp;
    private String eventType;
    private String actorName;
    private String description;
    private Map<String, Object> data;
    private Map<Long, ElevatorSnapshot> elevatorSnapshots;

    public SimEvent() {}

    public SimEvent(long id, String timestamp, String eventType, String actorName, String description, Map<String, Object> data, Map<Long, ElevatorSnapshot> elevatorSnapshots) {
        this.id = id;
        this.timestamp = timestamp;
        this.eventType = eventType;
        this.actorName = actorName;
        this.description = description;
        this.data = data;
        this.elevatorSnapshots = elevatorSnapshots;
    }

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public String getActorName() { return actorName; }
    public void setActorName(String actorName) { this.actorName = actorName; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Map<String, Object> getData() { return data; }
    public void setData(Map<String, Object> data) { this.data = data; }

    public Map<Long, ElevatorSnapshot> getElevatorSnapshots() { return elevatorSnapshots; }
    public void setElevatorSnapshots(Map<Long, ElevatorSnapshot> elevatorSnapshots) { this.elevatorSnapshots = elevatorSnapshots; }
}
