package com.lld.workflow.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.concurrent.locks.ReentrantLock;

/**
 * A single approval request. {@code instanceLock} is a fair, per-instance {@code ReentrantLock}
 * — this module's concurrency centerpiece, matching {@code locker.model.Locker}'s and
 * {@code coupon.model.Coupon}'s precedent. {@code WorkflowService#approve},
 * {@code #reject} and {@code #triggerEscalation} all hold "is the current step still PENDING?
 * decide it if so" as one atomic block under this lock — never split across two separate lock
 * acquisitions, which is exactly the check-then-act race a human approval and an automatic
 * timeout-escalation racing on the same step would otherwise fall into.
 */
@Getter
public class WorkflowInstance {

    private final String id;
    private final String requester;
    private final double amount;
    private final EscalationStrategyType escalationStrategyType;
    private final List<ApprovalStep> steps;

    @Setter
    private volatile int currentStepIndex = 0;

    @Setter
    private volatile WorkflowStatus status = WorkflowStatus.PENDING;

    @Getter(AccessLevel.NONE)
    private final ReentrantLock instanceLock = new ReentrantLock(true);

    public WorkflowInstance(String id, String requester, double amount, EscalationStrategyType escalationStrategyType, List<ApprovalStep> steps) {
        this.id = id;
        this.requester = requester;
        this.amount = amount;
        this.escalationStrategyType = escalationStrategyType;
        this.steps = steps;
    }

    /** Callers must already hold {@link #getLock()}. */
    public void transitionTo(WorkflowStatus target) {
        if (!status.canTransitionTo(target)) {
            throw new IllegalStateException("Workflow " + id + " cannot move from " + status + " to " + target);
        }
        this.status = target;
    }

    public ApprovalStep currentStep() {
        return steps.get(currentStepIndex);
    }

    public boolean isLastStep() {
        return currentStepIndex == steps.size() - 1;
    }

    @JsonIgnore
    public ReentrantLock getLock() {
        return instanceLock;
    }
}
