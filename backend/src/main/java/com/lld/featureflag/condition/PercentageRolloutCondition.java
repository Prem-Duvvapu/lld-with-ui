package com.lld.featureflag.condition;

import com.lld.featureflag.exception.InvalidRuleException;
import com.lld.featureflag.model.UserContext;

/**
 * Leaf condition: matches for a stable {@code percentage}% slice of users, based on a
 * <em>consistent</em> hash of {@code userId} rather than a fresh coin-flip per call — the same
 * user always lands in the same in/out bucket for a given percentage, which is what lets a real
 * rollout be widened later (10% -&gt; 25%) without flipping users who were already in.
 *
 * <p>{@link Math#floorMod(int, int)} rather than {@code Math.abs(hash) % 100}: {@code Math.abs}
 * overflows for {@code Integer.MIN_VALUE} (there is no positive counterpart, it stays negative),
 * which would make the modulo result negative for that one hash value and corrupt the bucket
 * comparison for whichever unlucky userId happens to hash there. {@code floorMod} always returns
 * a value in {@code [0, 100)} with no such edge case.
 */
public class PercentageRolloutCondition implements Condition {

    private final int percentage;

    public PercentageRolloutCondition(int percentage) {
        if (percentage < 0 || percentage > 100) {
            throw new InvalidRuleException("Percentage rollout must be between 0 and 100, got " + percentage + ".");
        }
        this.percentage = percentage;
    }

    public int getPercentage() {
        return percentage;
    }

    /** The stable [0, 100) bucket a given userId hashes into. Exposed so tests (and the UI) can reason about it directly. */
    public static int bucketOf(String userId) {
        return Math.floorMod(userId.hashCode(), 100);
    }

    @Override
    public boolean evaluate(UserContext ctx) {
        if (ctx == null || ctx.getUserId() == null || ctx.getUserId().isBlank()) return false;
        return bucketOf(ctx.getUserId()) < percentage;
    }

    @Override
    public String describe() {
        return "percentageRollout(" + percentage + "%)";
    }
}
