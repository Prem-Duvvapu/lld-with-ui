package com.lld.workflow;

import com.lld.workflow.chain.ApprovalChainFactory;
import com.lld.workflow.chain.DirectorThresholdHandler;
import com.lld.workflow.chain.FinanceThresholdHandler;
import com.lld.workflow.chain.ManagerThresholdHandler;
import com.lld.workflow.exception.InvalidStepTransitionException;
import com.lld.workflow.exception.UnauthorizedApproverException;
import com.lld.workflow.exception.WorkflowNotFoundException;
import com.lld.workflow.model.ApproverRole;
import com.lld.workflow.model.EscalationStrategyType;
import com.lld.workflow.model.StepDecision;
import com.lld.workflow.model.WorkflowInstance;
import com.lld.workflow.model.WorkflowStatus;
import com.lld.workflow.repository.WorkflowRepository;
import com.lld.workflow.service.WorkflowService;
import com.lld.workflow.strategy.AutoEscalateStrategy;
import com.lld.workflow.strategy.EscalationStrategyFactory;
import com.lld.workflow.strategy.NotifyOnlyStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class WorkflowServiceTest {

    private WorkflowService service;

    @BeforeEach
    void setUp() {
        ApprovalChainFactory chainFactory = new ApprovalChainFactory(
                new ManagerThresholdHandler(), new DirectorThresholdHandler(), new FinanceThresholdHandler());
        EscalationStrategyFactory strategyFactory = new EscalationStrategyFactory(new AutoEscalateStrategy(), new NotifyOnlyStrategy());
        service = new WorkflowService(new WorkflowRepository(), chainFactory, strategyFactory);
    }

    @Test
    void submittingASmallAmountCreatesAManagerOnlyChainInPendingStatus() {
        WorkflowInstance instance = service.submit("alice", 50.0, EscalationStrategyType.AUTO_ESCALATE);
        assertEquals(WorkflowStatus.PENDING, instance.getStatus());
        assertEquals(List.of(ApproverRole.MANAGER), instance.getSteps().stream().map(s -> s.getRole()).toList());
    }

    @Test
    void submittingALargeAmountCreatesTheFullThreeStepChain() {
        WorkflowInstance instance = service.submit("carol", 7500.0, EscalationStrategyType.AUTO_ESCALATE);
        assertEquals(List.of(ApproverRole.MANAGER, ApproverRole.DIRECTOR, ApproverRole.FINANCE),
                instance.getSteps().stream().map(s -> s.getRole()).toList());
    }

    @Test
    void approvingTheOnlyStepMovesTheInstanceStraightToApproved() {
        WorkflowInstance instance = service.submit("alice", 50.0, EscalationStrategyType.AUTO_ESCALATE);
        WorkflowInstance result = service.approve(instance.getId(), "mgr-1", ApproverRole.MANAGER);

        assertEquals(WorkflowStatus.APPROVED, result.getStatus());
        assertEquals(StepDecision.APPROVED, result.getSteps().get(0).getDecision());
    }

    @Test
    void approvingAMiddleStepAdvancesToInReviewRatherThanClosingTheWorkflow() {
        WorkflowInstance instance = service.submit("bob", 1500.0, EscalationStrategyType.AUTO_ESCALATE);
        WorkflowInstance result = service.approve(instance.getId(), "mgr-1", ApproverRole.MANAGER);

        assertEquals(WorkflowStatus.IN_REVIEW, result.getStatus());
        assertEquals(1, result.getCurrentStepIndex());
        assertEquals(StepDecision.APPROVED, result.getSteps().get(0).getDecision());
        assertEquals(StepDecision.PENDING, result.getSteps().get(1).getDecision());
    }

    @Test
    void rejectingAnyStepMovesTheWholeWorkflowStraightToRejected() {
        WorkflowInstance instance = service.submit("bob", 1500.0, EscalationStrategyType.AUTO_ESCALATE);
        WorkflowInstance result = service.reject(instance.getId(), "mgr-1", ApproverRole.MANAGER, "over budget");

        assertEquals(WorkflowStatus.REJECTED, result.getStatus());
        assertEquals(StepDecision.REJECTED, result.getSteps().get(0).getDecision());
        assertEquals("over budget", result.getSteps().get(0).getReason());
    }

    @Test
    void approvingWithTheWrongRoleThrowsUnauthorizedApproverException() {
        WorkflowInstance instance = service.submit("bob", 1500.0, EscalationStrategyType.AUTO_ESCALATE);
        assertThrows(UnauthorizedApproverException.class,
                () -> service.approve(instance.getId(), "dir-1", ApproverRole.DIRECTOR));
    }

    @Test
    void actingOnAnAlreadyTerminalWorkflowThrowsInvalidStepTransitionException() {
        WorkflowInstance instance = service.submit("alice", 50.0, EscalationStrategyType.AUTO_ESCALATE);
        service.approve(instance.getId(), "mgr-1", ApproverRole.MANAGER);

        assertThrows(InvalidStepTransitionException.class,
                () -> service.approve(instance.getId(), "mgr-1", ApproverRole.MANAGER));
    }

    @Test
    void gettingAnUnknownWorkflowThrowsWorkflowNotFoundException() {
        assertThrows(WorkflowNotFoundException.class, () -> service.getWorkflow("nope"));
    }

    @Test
    void triggerEscalationWithAutoEscalateAdvancesToTheNextStepAndInReview() {
        WorkflowInstance instance = service.submit("bob", 1500.0, EscalationStrategyType.AUTO_ESCALATE);
        WorkflowInstance result = service.triggerEscalation(instance.getId(), 0);

        assertEquals(WorkflowStatus.ESCALATED, result.getStatus());
        assertEquals(StepDecision.ESCALATED, result.getSteps().get(0).getDecision());
        assertEquals(1, result.getCurrentStepIndex());
    }

    @Test
    void afterEscalationTheNextApproverCanStillResolveTheWorkflow() {
        WorkflowInstance instance = service.submit("bob", 1500.0, EscalationStrategyType.AUTO_ESCALATE);
        service.triggerEscalation(instance.getId(), 0);
        WorkflowInstance result = service.approve(instance.getId(), "dir-1", ApproverRole.DIRECTOR);

        assertEquals(WorkflowStatus.APPROVED, result.getStatus(), "escalation must not be a dead end -- the workflow can still resolve");
    }

    @Test
    void triggerEscalationForAStepThatIsNoLongerCurrentThrowsInvalidStepTransitionException() {
        WorkflowInstance instance = service.submit("bob", 1500.0, EscalationStrategyType.AUTO_ESCALATE);
        service.approve(instance.getId(), "mgr-1", ApproverRole.MANAGER);

        assertThrows(InvalidStepTransitionException.class, () -> service.triggerEscalation(instance.getId(), 0),
                "step 0 was already approved and routing moved on -- a stale escalation for it must be rejected");
    }

    @Test
    void simEngineIsFullyIsolatedFromLiveState() {
        WorkflowInstance live = service.submit("alice", 50.0, EscalationStrategyType.AUTO_ESCALATE);

        Map<String, Object> snapshot = service.simSubmit("simUser", 50.0, EscalationStrategyType.AUTO_ESCALATE);
        @SuppressWarnings("unchecked")
        List<WorkflowInstance> simWorkflows = (List<WorkflowInstance>) (List<?>) snapshot.get("workflows");

        assertTrue(simWorkflows.stream().noneMatch(w -> w.getId().equals(live.getId())), "the sim sandbox must never see live workflows");
        assertEquals(1, service.getAllWorkflows().size(), "live state must be untouched by sim activity");
    }

    @Test
    void simResetWipesSimStateBackToEmpty() {
        service.simSubmit("simUser", 50.0, EscalationStrategyType.AUTO_ESCALATE);
        service.initSimState();

        @SuppressWarnings("unchecked")
        List<WorkflowInstance> simWorkflows = (List<WorkflowInstance>) (List<?>) service.getSimSnapshots().get("workflows");
        assertTrue(simWorkflows.isEmpty());
    }
}
