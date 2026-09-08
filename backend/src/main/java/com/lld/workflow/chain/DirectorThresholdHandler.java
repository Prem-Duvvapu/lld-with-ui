package com.lld.workflow.chain;

import com.lld.workflow.model.ApproverRole;
import org.springframework.stereotype.Component;

/** A Director is additionally required once the amount exceeds $1,000. */
@Component
public class DirectorThresholdHandler extends ApprovalThresholdHandler {

    private static final double THRESHOLD = 1000.0;

    @Override
    protected ApproverRole role() {
        return ApproverRole.DIRECTOR;
    }

    @Override
    protected boolean isRequired(double amount) {
        return amount > THRESHOLD;
    }
}
