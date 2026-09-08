package com.lld.payment.fraud;

import lombok.Data;

@Data
public class FraudCheckResult {
    private final boolean approved;
    private final String rejectionReason;

    public static FraudCheckResult approved() {
        return new FraudCheckResult(true, null);
    }

    public static FraudCheckResult rejected(String reason) {
        return new FraudCheckResult(false, reason);
    }

    private FraudCheckResult(boolean approved, String rejectionReason) {
        this.approved = approved;
        this.rejectionReason = rejectionReason;
    }
}
