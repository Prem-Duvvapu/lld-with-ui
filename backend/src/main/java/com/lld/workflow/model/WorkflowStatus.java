package com.lld.workflow.model;

import java.util.Collections;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Instance lifecycle, with the legal transitions declared rather than implied — the same
 * declared-transition-table idiom as {@code uber.model.RideStatus}.
 *
 * <p>A deliberate design choice: unlike {@code REJECTED}/{@code APPROVED} (fully terminal —
 * an outcome, not a state of waiting), {@code ESCALATED} is NOT terminal. It marks "the current
 * step's timeout fired and something was auto-routed or flagged," not "this workflow is done."
 * The escalation target (or, for a step {@code NotifyOnlyStrategy} merely flagged, the original
 * approver) can still act — that action moves the instance back to {@code IN_REVIEW} (more steps
 * remain) or straight to {@code APPROVED}/{@code REJECTED} (it resolves the whole chain). Treating
 * {@code ESCALATED} as terminal would mean an auto-escalated request could never actually be
 * approved, which defeats the point of escalating it forward rather than just rejecting it.
 */
public enum WorkflowStatus {
    PENDING,
    IN_REVIEW,
    APPROVED,
    REJECTED,
    ESCALATED;

    private static final Map<WorkflowStatus, Set<WorkflowStatus>> ALLOWED = Map.of(
            PENDING, EnumSet.of(IN_REVIEW, APPROVED, REJECTED, ESCALATED),
            IN_REVIEW, EnumSet.of(APPROVED, REJECTED, ESCALATED),
            ESCALATED, EnumSet.of(IN_REVIEW, APPROVED, REJECTED),
            APPROVED, EnumSet.noneOf(WorkflowStatus.class),
            REJECTED, EnumSet.noneOf(WorkflowStatus.class)
    );

    public boolean isTerminal() {
        return ALLOWED.get(this).isEmpty();
    }

    public boolean canTransitionTo(WorkflowStatus next) {
        return next != null && ALLOWED.get(this).contains(next);
    }

    public Set<WorkflowStatus> allowedNext() {
        return Collections.unmodifiableSet(ALLOWED.get(this));
    }
}
