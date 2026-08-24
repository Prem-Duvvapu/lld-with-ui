package com.lld.cricinfo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Aggregate stats accrued across every match a player appears in. Updated
 * incrementally, ball by ball, by {@code PlayerCareerStatsObserver} — a
 * simplification of the real-world rule that career stats finalize only at
 * match end, made so the live demo shows a player's numbers ticking up.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CareerStats {
    @Builder.Default
    private int matchesPlayed = 0;
    @Builder.Default
    private int totalRuns = 0;
    @Builder.Default
    private int totalBallsFaced = 0;
    @Builder.Default
    private int totalFours = 0;
    @Builder.Default
    private int totalSixes = 0;
    @Builder.Default
    private int dismissals = 0;
    @Builder.Default
    private int totalWicketsTaken = 0;
    @Builder.Default
    private int totalRunsConceded = 0;
    @Builder.Default
    private int totalBallsBowled = 0;

    public double getBattingAverage() {
        return dismissals == 0 ? totalRuns : round((double) totalRuns / dismissals);
    }

    public double getBattingStrikeRate() {
        return totalBallsFaced == 0 ? 0.0 : round((totalRuns * 100.0) / totalBallsFaced);
    }

    public double getBowlingAverage() {
        return totalWicketsTaken == 0 ? 0.0 : round((double) totalRunsConceded / totalWicketsTaken);
    }

    public double getEconomy() {
        return totalBallsBowled == 0 ? 0.0 : round((totalRunsConceded * 6.0) / totalBallsBowled);
    }

    private static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
