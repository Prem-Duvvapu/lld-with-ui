package com.lld.workflow.chain;

import com.lld.workflow.model.ApproverRole;

import java.util.List;

/**
 * Chain of Responsibility, same {@code setNext}-linking shape as {@code logging.chain.LogHandler},
 * {@code payment.fraud.FraudCheckHandler} and this repo's own {@code coupon.chain.EligibilityHandler}
 * — a fourth genuine use of this exact pattern, because it is the actually-right shape for this
 * domain, not a forced fit.
 *
 * <p>Unlike a claim-and-stop chain (e.g. {@code coupon.chain.EligibilityHandler}, which
 * short-circuits on the first rejection), this chain deliberately lets EVERY handler
 * contribute: real approval routing is cumulative — a $5,000 expense needs Manager AND Director
 * AND Finance, not just whichever threshold handler happens to match first. Each handler decides
 * independently whether its own role is required for the given amount, appends itself if so, and
 * always delegates onward so every applicable link gets a say.
 */
public abstract class ApprovalThresholdHandler {

    private ApprovalThresholdHandler next;

    public ApprovalThresholdHandler setNext(ApprovalThresholdHandler next) {
        this.next = next;
        return next;
    }

    public final void collectRequiredRoles(double amount, List<ApproverRole> roles) {
        if (isRequired(amount)) {
            roles.add(role());
        }
        if (next != null) {
            next.collectRequiredRoles(amount, roles);
        }
    }

    protected abstract ApproverRole role();

    protected abstract boolean isRequired(double amount);
}
