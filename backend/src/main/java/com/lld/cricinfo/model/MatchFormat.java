package com.lld.cricinfo.model;

/**
 * Match format drives overs-per-innings and innings-per-team directly on the enum,
 * so a new format is one arm here rather than a new if-else in MatchService.
 */
public enum MatchFormat {
    T20(20, 1),
    ODI(50, 1),
    TEST(null, 2);

    /** Overs bowled per innings; null means unlimited (TEST). */
    private final Integer oversLimit;
    private final int inningsPerTeam;

    MatchFormat(Integer oversLimit, int inningsPerTeam) {
        this.oversLimit = oversLimit;
        this.inningsPerTeam = inningsPerTeam;
    }

    public Integer getOversLimit() {
        return oversLimit;
    }

    public int getInningsPerTeam() {
        return inningsPerTeam;
    }

    public int getTotalInnings() {
        return inningsPerTeam * 2;
    }
}
