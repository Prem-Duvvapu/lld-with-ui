package com.lld.hotel.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/** One telemetry row in the isolated {@code /sim/*} engine's event log. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SimEvent {
    private long id;
    private int stepNumber;
    private String eventType;
    private String actor;
    private String description;
    private String status; // SUCCESS, INFO, WARNING, ERROR

    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();

    @Builder.Default
    private Map<String, Object> detail = new LinkedHashMap<>();

    public SimEvent addDetail(String key, Object value) {
        this.detail.put(key, value);
        return this;
    }
}
