package com.lld.coupon.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AccessLevel;
import lombok.Getter;

import java.util.concurrent.locks.ReentrantLock;

/**
 * A single coupon. {@code couponLock} is a fair, per-coupon {@code ReentrantLock} — this
 * module's concurrency centerpiece, matching {@code locker.model.Locker}'s precedent. Lombok
 * {@code @Getter} only (no {@code @Builder}): a mutable {@code ReentrantLock} must never end up
 * in a generated {@code equals}/{@code hashCode}, so it is excluded via
 * {@code @Getter(AccessLevel.NONE)} and exposed through a hand-written, {@code @JsonIgnore}d
 * getter instead.
 *
 * <p>{@link #tryRedeem()} is the single enforcement point for the redemption budget: it holds
 * "read count, compare to limit, increment" as one method the caller must invoke under
 * {@link #getLock()} — never split across two separate lock acquisitions, which is exactly the
 * check-then-act race this module exists to close.
 */
@Getter
public class Coupon {
    private final String code;
    private final DiscountType discountType;
    private final double discountValue;
    private final double minCartValue;
    private final String requiredCategory;
    private final boolean firstOrderOnly;
    private final int maxRedemptions;
    private final Long expiresAtEpoch;
    private volatile int currentRedemptions;

    @Getter(AccessLevel.NONE)
    private final ReentrantLock couponLock = new ReentrantLock(true);

    public Coupon(String code, DiscountType discountType, double discountValue, double minCartValue,
                  String requiredCategory, boolean firstOrderOnly, int maxRedemptions, Long expiresAtEpoch) {
        this.code = code;
        this.discountType = discountType;
        this.discountValue = discountValue;
        this.minCartValue = minCartValue;
        this.requiredCategory = requiredCategory;
        this.firstOrderOnly = firstOrderOnly;
        this.maxRedemptions = maxRedemptions;
        this.expiresAtEpoch = expiresAtEpoch;
        this.currentRedemptions = 0;
    }

    /** Callers must already hold {@link #getLock()}. Returns true if the redemption was accepted. */
    public boolean tryRedeem() {
        if (currentRedemptions >= maxRedemptions) {
            return false;
        }
        currentRedemptions++;
        return true;
    }

    public boolean isExpired() {
        return expiresAtEpoch != null && System.currentTimeMillis() >= expiresAtEpoch;
    }

    @JsonIgnore
    public ReentrantLock getLock() {
        return couponLock;
    }
}
