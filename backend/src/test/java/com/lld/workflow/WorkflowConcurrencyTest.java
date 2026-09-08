package com.lld.workflow;

import com.lld.workflow.chain.ApprovalChainFactory;
import com.lld.workflow.chain.DirectorThresholdHandler;
import com.lld.workflow.chain.FinanceThresholdHandler;
import com.lld.workflow.chain.ManagerThresholdHandler;
import com.lld.workflow.exception.InvalidStepTransitionException;
import com.lld.workflow.exception.UnauthorizedApproverException;
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
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * This module's centerpiece: a human {@code approve()} racing an automatic
 * {@code triggerEscalation()} on the SAME pending step of the SAME instance. Both must serialize
 * on {@link WorkflowInstance#getLock()} -- whichever wins must leave the instance in a single,
 * well-defined state: never both APPROVED and ESCALATED, never a step decided twice.
 */
public class WorkflowConcurrencyTest {

    private static WorkflowService newService() {
        ApprovalChainFactory chainFactory = new ApprovalChainFactory(
                new ManagerThresholdHandler(), new DirectorThresholdHandler(), new FinanceThresholdHandler());
        EscalationStrategyFactory strategyFactory = new EscalationStrategyFactory(new AutoEscalateStrategy(), new NotifyOnlyStrategy());
        return new WorkflowService(new WorkflowRepository(), chainFactory, strategyFactory);
    }

    @Test
    @DisplayName("approve() vs triggerEscalation() on the same pending step: exactly one wins -- 300 rounds")
    void approveAndEscalateRaceNeverBothTakeEffect() throws InterruptedException {
        int rounds = 300;
        AtomicInteger approveWon = new AtomicInteger();
        AtomicInteger escalateWon = new AtomicInteger();

        for (int round = 0; round < rounds; round++) {
            WorkflowService service = newService();
            // A mid-size expense: Manager -> Director, so escalation has somewhere to route to.
            WorkflowInstance instance = service.submit("racer", 1500.0, EscalationStrategyType.AUTO_ESCALATE);

            CountDownLatch start = new CountDownLatch(1);
            CountDownLatch done = new CountDownLatch(2);
            AtomicInteger successes = new AtomicInteger();

            Thread approver = new Thread(() -> {
                try {
                    start.await();
                    service.approve(instance.getId(), "mgr-1", ApproverRole.MANAGER);
                    successes.incrementAndGet();
                    approveWon.incrementAndGet();
                } catch (InvalidStepTransitionException expected) {
                    // lost the race -- fine
                } catch (UnauthorizedApproverException expected) {
                    // escalation won first and routing moved to Director -- MANAGER no longer applies, fine
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
            Thread escalator = new Thread(() -> {
                try {
                    start.await();
                    service.triggerEscalation(instance.getId(), 0);
                    successes.incrementAndGet();
                    escalateWon.incrementAndGet();
                } catch (InvalidStepTransitionException expected) {
                    // lost the race -- fine
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });

            approver.start();
            escalator.start();
            start.countDown();
            assertTrue(done.await(5, TimeUnit.SECONDS), "round " + round + " timed out");

            assertEquals(1, successes.get(), "round " + round + ": exactly one of approve/escalate must take effect, never both, never neither");

            WorkflowInstance finalState = service.getWorkflow(instance.getId());
            StepDecision firstStepDecision = finalState.getSteps().get(0).getDecision();
            assertNotEquals(StepDecision.PENDING, firstStepDecision, "round " + round + ": the step must have been decided by exactly one racer");
            assertTrue(finalState.getStatus() == WorkflowStatus.IN_REVIEW || finalState.getStatus() == WorkflowStatus.ESCALATED,
                    "round " + round + ": with a second step still pending the workflow must land in IN_REVIEW (approved) or ESCALATED, got " + finalState.getStatus());

            if (finalState.getStatus() == WorkflowStatus.IN_REVIEW) {
                assertEquals(StepDecision.APPROVED, firstStepDecision);
            } else {
                assertEquals(StepDecision.ESCALATED, firstStepDecision);
            }
        }

        assertTrue(approveWon.get() > 0, "over 300 rounds approve should win at least once");
        assertTrue(escalateWon.get() > 0, "over 300 rounds escalate should win at least once");
        assertEquals(rounds, approveWon.get() + escalateWon.get());
    }

    @Test
    @DisplayName("Repeated concurrent approve attempts on the same step: exactly one succeeds -- 200 rounds")
    void repeatedConcurrentApprovalsOnTheSameStepNeverDoubleDecideIt() throws InterruptedException {
        int rounds = 200;
        int racerCount = 8;

        for (int round = 0; round < rounds; round++) {
            WorkflowService service = newService();
            WorkflowInstance instance = service.submit("racer", 50.0, EscalationStrategyType.AUTO_ESCALATE);

            CountDownLatch start = new CountDownLatch(1);
            CountDownLatch done = new CountDownLatch(racerCount);
            AtomicInteger succeeded = new AtomicInteger();

            for (int i = 0; i < racerCount; i++) {
                Thread t = new Thread(() -> {
                    try {
                        start.await();
                        service.approve(instance.getId(), "mgr-1", ApproverRole.MANAGER);
                        succeeded.incrementAndGet();
                    } catch (InvalidStepTransitionException expected) {
                        // lost the race -- fine
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    } finally {
                        done.countDown();
                    }
                });
                t.start();
            }

            start.countDown();
            assertTrue(done.await(5, TimeUnit.SECONDS), "round " + round + " timed out");

            assertEquals(1, succeeded.get(), "round " + round + ": exactly one concurrent approve() call must succeed");
            assertEquals(WorkflowStatus.APPROVED, service.getWorkflow(instance.getId()).getStatus());
        }
    }
}
