package com.lld.learning.examples.dry;

/** A separately owned loyalty requirement, measured in POINTS rather than cents. */
public final class RewardRule {
    private RewardRule() { }

    public static boolean canRedeem(int points) {
        if (points < 0) throw new IllegalArgumentException("Negative points");
        return points >= 6000;
    }
}
