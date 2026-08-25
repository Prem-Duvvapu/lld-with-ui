package com.lld.minesweeper.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * One telemetry row in the isolated /sim/* engine's event log. Shape mirrors {@code chess.SimEvent}.
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
    private GameStatus status;
    private int revealedCount;
}
