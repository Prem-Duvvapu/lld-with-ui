package com.lld.cricinfo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * The live scorecard projection — read-side state folded from the ball
 * stream by {@code ScorecardProjectionObserver}. Clients poll this instead
 * of re-deriving score from raw balls themselves.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Scorecard {
    private String matchId;
    private int inningsIndex;
    private String battingTeamName;
    private String bowlingTeamName;

    private int totalRuns;
    private int wickets;
    private String oversDisplay;
    private Integer oversLimit;
    private double runRate;
    private Double requiredRunRate;
    private Integer target;

    private String strikerName;
    private int strikerRuns;
    private int strikerBalls;
    private String nonStrikerName;
    private int nonStrikerRuns;
    private int nonStrikerBalls;

    private String currentBowlerName;
    private String currentBowlerFigures;

    @Builder.Default
    private List<String> recentBalls = new ArrayList<>();
    @Builder.Default
    private List<FallOfWicket> fallOfWickets = new ArrayList<>();
    @Builder.Default
    private List<BattingStat> battingStats = new ArrayList<>();
    @Builder.Default
    private List<BowlingStat> bowlingStats = new ArrayList<>();

    private boolean inningsCompleted;
    private boolean matchCompleted;
    private String matchStatusSummary;

    @Builder.Default
    private Instant lastUpdated = Instant.now();
}
