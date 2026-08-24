package com.lld.concertticket.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * One telemetry row in the isolated /sim/* engine's event log — an actor, what they did,
 * and a snapshot of every seat's status right after the action, so the frontend HUD can
 * replay the whole race step by step. Shape mirrors {@code movieticket.SimEvent}.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SimEvent {
    private long id;
    private String timestamp;
    private String eventType;
    private String actor;
    private String description;
    private Map<String, Object> data;
    private Map<String, String> seatSnapshot;
}
