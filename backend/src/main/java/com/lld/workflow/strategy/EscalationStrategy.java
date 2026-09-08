package com.lld.workflow.strategy;

import com.lld.workflow.model.WorkflowInstance;

/**
 * What happens when a step isn't acted on in time — mirrors {@code jobscheduler}'s
 * {@code MisfirePolicy} shape.
 */
public interface EscalationStrategy {
    /**
     * Applies escalation to the instance's CURRENT pending step. Caller must already hold
     * {@link WorkflowInstance#getLock()}.
     *
     * @return true if the step's own decision was mutated (a genuine hand-off happened);
     *         false if this was a pure notification with no step-level effect.
     */
    boolean escalate(WorkflowInstance instance);
}
