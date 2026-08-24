package com.lld.cricinfo.model;

public enum WicketType {
    BOWLED,
    CAUGHT,
    LBW,
    RUN_OUT,
    STUMPED,
    HIT_WICKET;

    /** Run-outs are a fielding effort, not a bowling one — no bowler credit. */
    public boolean creditsBowler() {
        return this != RUN_OUT;
    }
}
