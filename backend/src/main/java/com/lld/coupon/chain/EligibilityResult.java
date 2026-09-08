package com.lld.coupon.chain;

public class EligibilityResult {

    private final boolean eligible;
    private final String rejectionReason;

    private EligibilityResult(boolean eligible, String rejectionReason) {
        this.eligible = eligible;
        this.rejectionReason = rejectionReason;
    }

    public static EligibilityResult eligible() {
        return new EligibilityResult(true, null);
    }

    public static EligibilityResult rejected(String reason) {
        return new EligibilityResult(false, reason);
    }

    public boolean isEligible() {
        return eligible;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }
}
