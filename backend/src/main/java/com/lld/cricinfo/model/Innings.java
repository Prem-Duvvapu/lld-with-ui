package com.lld.cricinfo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * One team's batting innings. {@code balls} is the raw event stream; every
 * other field here is a projection folded from it by
 * {@code ScorecardProjectionObserver} — Innings itself never appends to its
 * own aggregates, so there is exactly one place that turns a Ball into score.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Innings {
    private int index;
    private String battingTeamId;
    private String battingTeamName;
    private String bowlingTeamId;
    private String bowlingTeamName;

    @Builder.Default
    private int totalRuns = 0;
    @Builder.Default
    private int wickets = 0;
    @Builder.Default
    private int legalBallsBowled = 0;

    @Builder.Default
    private int extraWides = 0;
    @Builder.Default
    private int extraNoBalls = 0;
    @Builder.Default
    private int extraByes = 0;
    @Builder.Default
    private int extraLegByes = 0;
    @Builder.Default
    private int extraPenalties = 0;

    @Builder.Default
    private List<Ball> balls = new ArrayList<>();
    @Builder.Default
    private Map<String, BattingStat> battingStats = new LinkedHashMap<>();
    @Builder.Default
    private Map<String, BowlingStat> bowlingStats = new LinkedHashMap<>();
    @Builder.Default
    private List<FallOfWicket> fallOfWickets = new ArrayList<>();

    private String strikerId;
    private String nonStrikerId;
    private String currentBowlerId;
    private String previousOverBowlerId;

    @Builder.Default
    private boolean completed = false;
    /** Set only on the chasing innings (2nd of a limited-overs match, 4th of a Test). */
    private Integer targetRuns;

    public int totalExtras() {
        return extraWides + extraNoBalls + extraByes + extraLegByes + extraPenalties;
    }

    public String oversDisplay() {
        return (legalBallsBowled / 6) + "." + (legalBallsBowled % 6);
    }

    public double runRate() {
        if (legalBallsBowled == 0) return 0.0;
        double overs = legalBallsBowled / 6.0;
        return Math.round((totalRuns / overs) * 100.0) / 100.0;
    }
}
