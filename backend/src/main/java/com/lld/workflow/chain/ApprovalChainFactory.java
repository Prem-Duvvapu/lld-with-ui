package com.lld.workflow.chain;

import com.lld.workflow.model.ApproverRole;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Wires the fixed handler order (Manager -> Director -> Finance) and runs it — the same shape
 * as {@code payment.fraud.FraudCheckChainFactory} and {@code coupon.chain.EligibilityChainFactory}.
 */
@Component
public class ApprovalChainFactory {

    private final ApprovalThresholdHandler chainHead;

    public ApprovalChainFactory(ManagerThresholdHandler manager, DirectorThresholdHandler director, FinanceThresholdHandler finance) {
        manager.setNext(director).setNext(finance);
        this.chainHead = manager;
    }

    public List<ApproverRole> resolveRequiredRoles(double amount) {
        List<ApproverRole> roles = new ArrayList<>();
        chainHead.collectRequiredRoles(amount, roles);
        return roles;
    }
}
