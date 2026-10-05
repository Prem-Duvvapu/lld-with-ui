package com.lld.workflow;

import com.lld.workflow.chain.ApprovalChainFactory;
import com.lld.workflow.chain.DirectorThresholdHandler;
import com.lld.workflow.chain.FinanceThresholdHandler;
import com.lld.workflow.chain.ManagerThresholdHandler;
import com.lld.workflow.exception.InvalidStepTransitionException;
import com.lld.workflow.exception.UnauthorizedApproverException;
import com.lld.workflow.model.ApprovalStep;
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

import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;

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

    // -------------------------------------------------------------------------------------
    // Shared fixtures: a 1500.0 expense routes Manager -> Director, so an AUTO_ESCALATE timeout
    // on step 0 has a next approver to hand off to. Step 0 is what approve() and escalation race on.
    // -------------------------------------------------------------------------------------

    private enum Winner { APPROVE, ESCALATE }

    /** One contender: runs its action on its own thread and records whether it took effect or why it was rejected. */
    private static final class Racer {
        private final Thread thread;
        private volatile boolean succeeded;
        private volatile Throwable failure;

        Racer(String name, CountDownLatch startGate, Callable<?> action) {
            this.thread = new Thread(() -> {
                try {
                    if (startGate != null) {
                        startGate.await();
                    }
                    action.call();
                    succeeded = true;
                } catch (Throwable t) {
                    failure = t;
                }
            }, name);
        }

        void join(String context) throws InterruptedException {
            thread.join(TimeUnit.SECONDS.toMillis(5));
            assertFalse(thread.isAlive(), context + ": " + thread.getName() + " did not finish within 5s");
        }
    }

    private static Racer approver(WorkflowService service, String id, CountDownLatch startGate) {
        return new Racer("approver", startGate, () -> service.approve(id, "mgr-1", ApproverRole.MANAGER));
    }

    private static Racer escalator(WorkflowService service, String id, CountDownLatch startGate) {
        return new Racer("escalator", startGate, () -> service.triggerEscalation(id, 0));
    }

    /** Approve took effect on step 0: routing advanced to the still-pending Director step, nothing escalated. */
    private static void assertApprovedState(WorkflowInstance state, String context) {
        ApprovalStep managerStep = state.getSteps().get(0);
        ApprovalStep directorStep = state.getSteps().get(1);
        assertEquals(WorkflowStatus.IN_REVIEW, state.getStatus(), context + ": approve won, more steps remain -> IN_REVIEW");
        assertEquals(StepDecision.APPROVED, managerStep.getDecision(), context + ": step 0 must be APPROVED");
        assertEquals("mgr-1", managerStep.getApproverId(), context + ": step 0 must be decided by the manager, not SYSTEM");
        assertEquals(1, state.getCurrentStepIndex(), context + ": routing must advance exactly one step");
        assertEquals(ApproverRole.DIRECTOR, directorStep.getRole());
        assertEquals(StepDecision.PENDING, directorStep.getDecision(), context + ": the loser must not have decided the next step");
    }

    /** Escalation took effect on step 0: routing handed off to the still-pending Director step, nothing approved. */
    private static void assertEscalatedState(WorkflowInstance state, String context) {
        ApprovalStep managerStep = state.getSteps().get(0);
        ApprovalStep directorStep = state.getSteps().get(1);
        assertEquals(WorkflowStatus.ESCALATED, state.getStatus(), context + ": escalation won -> ESCALATED");
        assertEquals(StepDecision.ESCALATED, managerStep.getDecision(), context + ": step 0 must be ESCALATED");
        assertEquals("SYSTEM", managerStep.getApproverId(), context + ": step 0 must be decided by SYSTEM, not the manager");
        assertEquals(1, state.getCurrentStepIndex(), context + ": routing must advance exactly one step");
        assertEquals(ApproverRole.DIRECTOR, directorStep.getRole());
        assertEquals(StepDecision.PENDING, directorStep.getDecision(), context + ": the loser must not have decided the next step");
    }

    /**
     * The per-race atomicity invariant: exactly one contender took effect, the loser got the typed
     * rejection that matches the winner's state change, and the instance is in that winner's state.
     */
    private static Winner assertExactlyOneTookEffect(WorkflowService service, String id, Racer approver, Racer escalator, String context) {
        assertNotEquals(approver.succeeded, escalator.succeeded,
                context + ": exactly one of approve/escalate must take effect, never both, never neither"
                        + " (approve failure=" + approver.failure + ", escalate failure=" + escalator.failure + ")");
        WorkflowInstance state = service.getWorkflow(id);
        if (approver.succeeded) {
            assertNull(approver.failure, context);
            // Approval moved routing past step 0 -> the escalation armed against step 0 is stale.
            assertInstanceOf(InvalidStepTransitionException.class, escalator.failure,
                    context + ": the losing escalation must be rejected as a stale step transition");
            assertApprovedState(state, context);
            return Winner.APPROVE;
        }
        assertNull(escalator.failure, context);
        // Escalation handed step 0 off to the Director -> MANAGER no longer applies to the current step.
        assertInstanceOf(UnauthorizedApproverException.class, approver.failure,
                context + ": the losing manager approval must be rejected because the current step now needs a DIRECTOR");
        assertEscalatedState(state, context);
        return Winner.ESCALATE;
    }

    /**
     * Makes both racers genuinely contend on the instance lock in a fixed order: the test thread
     * holds the lock, starts {@code first} and waits until it is parked in the lock's wait queue,
     * then does the same for {@code second}, then releases. The instance lock is fair (FIFO), so
     * the longest waiter -- {@code first} -- is guaranteed to acquire it first. No sleeps.
     */
    private static void contendInOrder(WorkflowInstance instance, Racer first, Racer second, String context) throws InterruptedException {
        ReentrantLock lock = instance.getLock();
        assertTrue(lock.isFair(), "this ordering guarantee relies on the per-instance lock being fair");
        lock.lock();
        try {
            first.thread.start();
            awaitQueuedOn(lock, first.thread, context);
            second.thread.start();
            awaitQueuedOn(lock, second.thread, context);
        } finally {
            lock.unlock();
        }
        first.join(context);
        second.join(context);
    }

    private static void awaitQueuedOn(ReentrantLock lock, Thread thread, String context) {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (!lock.hasQueuedThread(thread)) {
            assertTrue(thread.isAlive(), context + ": " + thread.getName() + " finished without ever blocking on the instance lock");
            assertTrue(System.nanoTime() < deadline, context + ": " + thread.getName() + " never queued on the instance lock");
            Thread.onSpinWait();
        }
    }

    // -------------------------------------------------------------------------------------
    // Simultaneous race: atomicity only. Which side wins is up to the scheduler and is NOT asserted.
    // -------------------------------------------------------------------------------------

    @Test
    @DisplayName("approve() vs triggerEscalation() on the same pending step: exactly one wins -- 300 rounds")
    void approveAndEscalateRaceNeverBothTakeEffect() throws InterruptedException {
        int rounds = 300;
        AtomicInteger approveWon = new AtomicInteger();
        AtomicInteger escalateWon = new AtomicInteger();

        for (int round = 0; round < rounds; round++) {
            String context = "round " + round;
            WorkflowService service = newService();
            WorkflowInstance instance = service.submit("racer", 1500.0, EscalationStrategyType.AUTO_ESCALATE);

            CountDownLatch start = new CountDownLatch(1);
            Racer approver = approver(service, instance.getId(), start);
            Racer escalator = escalator(service, instance.getId(), start);
            approver.thread.start();
            escalator.thread.start();
            start.countDown();
            approver.join(context);
            escalator.join(context);

            Winner winner = assertExactlyOneTookEffect(service, instance.getId(), approver, escalator, context);
            (winner == Winner.APPROVE ? approveWon : escalateWon).incrementAndGet();
        }

        // Every round produced exactly one winner. The split between approve/escalate wins is
        // scheduler-dependent and deliberately not asserted -- each outcome is pinned down
        // deterministically by the ordered tests below (RCA-085).
        assertEquals(rounds, approveWon.get() + escalateWon.get());
    }

    // -------------------------------------------------------------------------------------
    // Deterministic coverage of each legal outcome.
    // -------------------------------------------------------------------------------------

    @Test
    @DisplayName("Approve first, then escalation of the same step: escalation is rejected as stale, step stays APPROVED")
    void approveFirstThenEscalationIsRejectedAsStale() {
        WorkflowService service = newService();
        WorkflowInstance instance = service.submit("racer", 1500.0, EscalationStrategyType.AUTO_ESCALATE);

        service.approve(instance.getId(), "mgr-1", ApproverRole.MANAGER);
        assertThrows(InvalidStepTransitionException.class, () -> service.triggerEscalation(instance.getId(), 0));

        assertApprovedState(service.getWorkflow(instance.getId()), "approve-then-escalate");
    }

    @Test
    @DisplayName("Escalate first, then manager approval of the same step: approval is rejected, step stays ESCALATED")
    void escalateFirstThenManagerApprovalIsRejected() {
        WorkflowService service = newService();
        WorkflowInstance instance = service.submit("racer", 1500.0, EscalationStrategyType.AUTO_ESCALATE);

        service.triggerEscalation(instance.getId(), 0);
        assertThrows(UnauthorizedApproverException.class, () -> service.approve(instance.getId(), "mgr-1", ApproverRole.MANAGER));

        assertEscalatedState(service.getWorkflow(instance.getId()), "escalate-then-approve");
    }

    @Test
    @DisplayName("Approver queued first on the contended instance lock: approve wins, escalation rejected")
    void contendedApproverQueuedFirstWins() throws InterruptedException {
        WorkflowService service = newService();
        WorkflowInstance instance = service.submit("racer", 1500.0, EscalationStrategyType.AUTO_ESCALATE);
        Racer approver = approver(service, instance.getId(), null);
        Racer escalator = escalator(service, instance.getId(), null);

        contendInOrder(instance, approver, escalator, "approver-queued-first");

        assertEquals(Winner.APPROVE, assertExactlyOneTookEffect(service, instance.getId(), approver, escalator, "approver-queued-first"));
    }

    @Test
    @DisplayName("Escalator queued first on the contended instance lock: escalation wins, approval rejected")
    void contendedEscalatorQueuedFirstWins() throws InterruptedException {
        WorkflowService service = newService();
        WorkflowInstance instance = service.submit("racer", 1500.0, EscalationStrategyType.AUTO_ESCALATE);
        Racer approver = approver(service, instance.getId(), null);
        Racer escalator = escalator(service, instance.getId(), null);

        contendInOrder(instance, escalator, approver, "escalator-queued-first");

        assertEquals(Winner.ESCALATE, assertExactlyOneTookEffect(service, instance.getId(), approver, escalator, "escalator-queued-first"));
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
