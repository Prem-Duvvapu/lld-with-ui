package com.lld.snakeladders.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * One telemetry row in the isolated /sim/* engine's event log — a roll, who made it and where
 * every player stood right after, so the frontend HUD can replay the demo step by step. Shape
 * mirrors {@code chess.SimEvent}.
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
    private int diceValue;
    private List<Player> playersSnapshot;
    private GameState status;
}
