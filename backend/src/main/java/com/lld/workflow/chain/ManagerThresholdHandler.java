package com.lld.workflow.chain;

import com.lld.workflow.model.ApproverRole;
import org.springframework.stereotype.Component;

/** A Manager is always required, no matter how small the amount. */
@Component
public class ManagerThresholdHandler extends ApprovalThresholdHandler {
    @Override
    protected ApproverRole role() {
        return ApproverRole.MANAGER;
    }

    @Override
    protected boolean isRequired(double amount) {
        return true;
    }
}
