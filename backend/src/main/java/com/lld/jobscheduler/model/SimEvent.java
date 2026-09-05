package com.lld.jobscheduler.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/** One telemetry row in the isolated {@code /sim/*} engine's event log. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SimEvent {
    private String id;
    private int stepNumber;
    private String eventType;
    private String title;
    private String description;
    private String status; // SUCCESS, INFO, WARNING, ERROR

    @Builder.Default
    private Instant timestamp = Instant.now();

    @Builder.Default
    private Map<String, Object> details = new LinkedHashMap<>();

    public SimEvent addDetail(String key, Object value) {
        this.details.put(key, value);
        return this;
    }
}
