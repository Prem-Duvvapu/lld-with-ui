package com.lld.cricinfo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * A single delivery — the atomic event this module's Observer fan-out is
 * built around. Everything else (innings totals, the live scorecard, career
 * stats, commentary) is derived from a stream of these.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Ball {
    private long id;
    private int inningsIndex;
    /** 0-indexed over currently being bowled at the time this ball landed. */
    private int overNumber;
    /** 1-6, legal deliveries only; extras keep the same ballInOver as the delivery they replace. */
    private int ballInOver;
    private boolean legalDelivery;

    private String strikerId;
    private String nonStrikerId;
    private String bowlerId;

    @Builder.Default
    private int runsOffBat = 0;
    private ExtraType extraType;
    @Builder.Default
    private int extraRuns = 0;

    @Builder.Default
    private boolean wicket = false;
    private WicketType wicketType;
    private String dismissedPlayerId;
    private String fielderId;

    private boolean isFour;
    private boolean isSix;

    private String commentary;
    @Builder.Default
    private Instant timestamp = Instant.now();

    public int totalRuns() {
        return runsOffBat + extraRuns;
    }
}
