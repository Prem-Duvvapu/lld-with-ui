package com.lld.cricinfo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BattingStat {
    private String playerId;
    private String playerName;
    @Builder.Default
    private int runs = 0;
    @Builder.Default
    private int ballsFaced = 0;
    @Builder.Default
    private int fours = 0;
    @Builder.Default
    private int sixes = 0;
    @Builder.Default
    private boolean out = false;
    private String dismissalDescription;

    public double getStrikeRate() {
        return ballsFaced == 0 ? 0.0 : Math.round((runs * 100.0 / ballsFaced) * 100.0) / 100.0;
    }
}
