package com.lld.ludo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * One telemetry row in the isolated /sim/* engine's event log — an action, who took it, the die
 * value involved (0 when not applicable) and a deep-copied token snapshot right after, so the
 * frontend HUD can replay the demo step by step. Shape mirrors {@code snakeladders.model.SimEvent}.
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
    private List<List<Token>> tokensSnapshot;
    private GameStatus status;
}
