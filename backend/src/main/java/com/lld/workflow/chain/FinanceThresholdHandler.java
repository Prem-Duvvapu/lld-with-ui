package com.lld.workflow.chain;

import com.lld.workflow.model.ApproverRole;
import org.springframework.stereotype.Component;

/** Finance is additionally required once the amount exceeds $5,000. */
@Component
public class FinanceThresholdHandler extends ApprovalThresholdHandler {

    private static final double THRESHOLD = 5000.0;

    @Override
    protected ApproverRole role() {
        return ApproverRole.FINANCE;
    }

    @Override
    protected boolean isRequired(double amount) {
        return amount > THRESHOLD;
    }
}
