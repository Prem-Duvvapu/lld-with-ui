package com.lld.vendingmachine.model;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

public class SimEvent {
    private String id;
    private int stepNumber;
    private String eventType;
    private String title;
    private String description;
    private String status; // SUCCESS, INFO, WARNING, ERROR
    private LocalDateTime timestamp;
    private Map<String, Object> details = new HashMap<>();

    public SimEvent() {
        this.timestamp = LocalDateTime.now();
    }

    public SimEvent(String id, int stepNumber, String eventType, String title, String description, String status) {
        this.id = id;
        this.stepNumber = stepNumber;
        this.eventType = eventType;
        this.title = title;
        this.description = description;
        this.status = status;
        this.timestamp = LocalDateTime.now();
        this.details = new HashMap<>();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public int getStepNumber() { return stepNumber; }
    public void setStepNumber(int stepNumber) { this.stepNumber = stepNumber; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public Map<String, Object> getDetails() { return details; }
    public void setDetails(Map<String, Object> details) { this.details = details; }

    public SimEvent addDetail(String key, Object value) {
        this.details.put(key, value);
        return this;
    }
}
