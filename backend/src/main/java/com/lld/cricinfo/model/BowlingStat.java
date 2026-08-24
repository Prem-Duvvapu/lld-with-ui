package com.lld.cricinfo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BowlingStat {
    private String playerId;
    private String playerName;
    @Builder.Default
    private int legalBallsBowled = 0;
    @Builder.Default
    private int runsConceded = 0;
    @Builder.Default
    private int wickets = 0;

    public String getOversDisplay() {
        return (legalBallsBowled / 6) + "." + (legalBallsBowled % 6);
    }

    public double getEconomy() {
        return legalBallsBowled == 0 ? 0.0 : Math.round((runsConceded * 6.0 / legalBallsBowled) * 100.0) / 100.0;
    }
}
