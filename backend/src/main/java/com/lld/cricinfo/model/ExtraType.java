package com.lld.cricinfo.model;

/**
 * WIDE and NO_BALL are illegal deliveries (do not count toward the over).
 * BYE, LEG_BYE and PENALTY are legal deliveries that simply credit the extra
 * run(s) to the team total instead of the striker/bowler.
 */
public enum ExtraType {
    WIDE,
    NO_BALL,
    BYE,
    LEG_BYE,
    PENALTY;

    public boolean isLegalDelivery() {
        return this != WIDE && this != NO_BALL;
    }
}
