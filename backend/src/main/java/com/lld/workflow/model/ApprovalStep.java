package com.lld.workflow.model;

import lombok.Getter;
import lombok.Setter;

/**
 * One required step in an instance's approval chain. {@code decision} starts at
 * {@code PENDING} and is the field {@code WorkflowService#approve}/{@code #reject}/
 * {@code #triggerEscalation} all race to mutate — the concurrency centerpiece of this module.
 */
@Getter
public class ApprovalStep {

    private final ApproverRole role;

    @Setter
    private volatile StepDecision decision = StepDecision.PENDING;

    @Setter
    private volatile String approverId;

    @Setter
    private volatile Long decidedAtEpoch;

    @Setter
    private volatile String reason;

    public ApprovalStep(ApproverRole role) {
        this.role = role;
    }
}
