package com.lld.cricinfo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;

/**
 * Audit trail entry — one per ball (and per lifecycle transition), used by
 * both the general event log and the /sim/* telemetry stream. Mirrors
 * splitwise's ExpenseEventType / zomato's ZomatoEvent idiom.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CricinfoEvent {
    private long sequence;
    private String type;
    private String matchId;
    private String message;
    private Map<String, Object> detail;
    @Builder.Default
    private Instant timestamp = Instant.now();
}
