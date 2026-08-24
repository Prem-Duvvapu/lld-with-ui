package com.lld.chess.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * One telemetry row in the isolated /sim/* engine's event log — an actor, what they did, and
 * the board right after the action, so the frontend HUD can replay the demo step by step.
 * Shape mirrors {@code concertticket.SimEvent}.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SimEvent {
    private long id;
    private String timestamp;
    private String actor;
    private String description;
    private Piece[][] boardSnapshot;
    private GameStatus status;
}
