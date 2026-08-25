package com.lld.taskmanagement.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

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
    private LocalDateTime timestamp = LocalDateTime.now();
}
