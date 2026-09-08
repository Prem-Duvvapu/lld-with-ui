package com.lld.workflow.strategy;

import com.lld.workflow.model.ApprovalStep;
import com.lld.workflow.model.ApproverRole;
import com.lld.workflow.model.EscalationStrategyType;
import com.lld.workflow.model.StepDecision;
import com.lld.workflow.model.WorkflowInstance;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Proves {@link AutoEscalateStrategy} and {@link NotifyOnlyStrategy} are genuinely different
 * policies, not two names for the same behavior: one advances routing, the other never touches
 * the step at all.
 */
public class EscalationStrategyTest {

    private WorkflowInstance newInstance(ApproverRole... roles) {
        List<ApprovalStep> steps = List.of(roles).stream().map(ApprovalStep::new).toList();
        return new WorkflowInstance("WF-1", "alice", 7500.0, EscalationStrategyType.AUTO_ESCALATE, steps);
    }

    @Test
    void autoEscalateAdvancesTheCurrentStepToEscalatedAndMovesToTheNextStep() {
        WorkflowInstance instance = newInstance(ApproverRole.MANAGER, ApproverRole.DIRECTOR);
        ApprovalStep firstStep = instance.currentStep();

        boolean escalated = new AutoEscalateStrategy().escalate(instance);

        assertTrue(escalated);
        assertEquals(StepDecision.ESCALATED, firstStep.getDecision());
        assertEquals("SYSTEM", firstStep.getApproverId());
        assertEquals(1, instance.getCurrentStepIndex(), "escalation must advance routing to the next approver");
    }

    @Test
    void autoEscalateOnTheLastStepDegradesToANoOpRatherThanClosingTheWorkflow() {
        WorkflowInstance instance = newInstance(ApproverRole.MANAGER);
        ApprovalStep onlyStep = instance.currentStep();

        boolean escalated = new AutoEscalateStrategy().escalate(instance);

        assertFalse(escalated, "there is no next approver to route to on the last step");
        assertEquals(StepDecision.PENDING, onlyStep.getDecision(), "must not silently close the workflow out");
        assertEquals(0, instance.getCurrentStepIndex());
    }

    @Test
    void notifyOnlyNeverTouchesTheStepOrAdvancesRouting() {
        WorkflowInstance instance = newInstance(ApproverRole.MANAGER, ApproverRole.DIRECTOR);
        ApprovalStep firstStep = instance.currentStep();

        boolean escalated = new NotifyOnlyStrategy().escalate(instance);

        assertFalse(escalated);
        assertEquals(StepDecision.PENDING, firstStep.getDecision());
        assertNull(firstStep.getApproverId());
        assertEquals(0, instance.getCurrentStepIndex());
    }

    @Test
    void theFactoryResolvesEachTypeToItsOwnStrategy() {
        EscalationStrategyFactory factory = new EscalationStrategyFactory(new AutoEscalateStrategy(), new NotifyOnlyStrategy());
        assertInstanceOf(AutoEscalateStrategy.class, factory.forType(EscalationStrategyType.AUTO_ESCALATE));
        assertInstanceOf(NotifyOnlyStrategy.class, factory.forType(EscalationStrategyType.NOTIFY_ONLY));
    }
}
