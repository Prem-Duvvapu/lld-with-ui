package com.lld.workflow.strategy;

import com.lld.workflow.model.ApprovalStep;
import com.lld.workflow.model.StepDecision;
import com.lld.workflow.model.WorkflowInstance;
import org.springframework.stereotype.Component;

/**
 * Automatically hands the current step off to the next approver in the chain. If the current
 * step is already the last one, there is no next approver to route to — this degrades to a pure
 * notification (the step stays {@code PENDING} for the same approver) rather than silently
 * closing the workflow out.
 */
@Component
public class AutoEscalateStrategy implements EscalationStrategy {
    @Override
    public boolean escalate(WorkflowInstance instance) {
        if (instance.isLastStep()) {
            return false;
        }
        ApprovalStep step = instance.currentStep();
        step.setDecision(StepDecision.ESCALATED);
        step.setApproverId("SYSTEM");
        step.setDecidedAtEpoch(System.currentTimeMillis());
        instance.setCurrentStepIndex(instance.getCurrentStepIndex() + 1);
        return true;
    }
}
