package com.lld.workflow.service;

import com.lld.workflow.chain.ApprovalChainFactory;
import com.lld.workflow.exception.InvalidStepTransitionException;
import com.lld.workflow.exception.UnauthorizedApproverException;
import com.lld.workflow.model.ApprovalStep;
import com.lld.workflow.model.ApproverRole;
import com.lld.workflow.model.EscalationStrategyType;
import com.lld.workflow.model.SimEvent;
import com.lld.workflow.model.StepDecision;
import com.lld.workflow.model.WorkflowInstance;
import com.lld.workflow.model.WorkflowStatus;
import com.lld.workflow.repository.WorkflowRepository;
import com.lld.workflow.strategy.EscalationStrategy;
import com.lld.workflow.strategy.EscalationStrategyFactory;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

/**
 * Facade owning workflow submission, approval and the isolated simulation engine.
 * {@link #doApprove}/{@link #doReject}/{@link #doTriggerEscalation} are the concurrency
 * centerpiece: each holds "is the current step still PENDING? decide it if so" as one atomic
 * block under that instance's own {@link WorkflowInstance#getLock()} — the same per-entity-lock
 * idiom {@code locker.service.LockerService#deposit} and {@code coupon.service.CouponService}
 * use, applied here to a human approval racing an automatic timeout escalation.
 */
@Service
public class WorkflowService {

    private final WorkflowRepository repository;
    private final ApprovalChainFactory chainFactory;
    private final EscalationStrategyFactory escalationStrategyFactory;
    private final AtomicLong idGen = new AtomicLong(1001);

    // Isolated Simulation Engine State
    private final WorkflowRepository simRepository = new WorkflowRepository();
    private final AtomicLong simIdGen = new AtomicLong(1);
    private final List<SimEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong simEventIdGen = new AtomicLong(1);

    public WorkflowService(WorkflowRepository repository, ApprovalChainFactory chainFactory,
                            EscalationStrategyFactory escalationStrategyFactory) {
        this.repository = repository;
        this.chainFactory = chainFactory;
        this.escalationStrategyFactory = escalationStrategyFactory;
        initSimState();
    }

    public WorkflowInstance submit(String requester, double amount, EscalationStrategyType escalationStrategyType) {
        return doSubmit(repository, idGen, requester, amount, escalationStrategyType);
    }

    public WorkflowInstance getWorkflow(String id) {
        return repository.get(id);
    }

    public List<WorkflowInstance> getAllWorkflows() {
        return repository.getAll();
    }

    public WorkflowInstance approve(String id, String approverId, ApproverRole role) {
        return doApprove(repository, id, approverId, role);
    }

    public WorkflowInstance reject(String id, String approverId, ApproverRole role, String reason) {
        return doReject(repository, id, approverId, role, reason);
    }

    public WorkflowInstance triggerEscalation(String id, int stepIndex) {
        return doTriggerEscalation(repository, id, stepIndex);
    }

    private WorkflowInstance doSubmit(WorkflowRepository targetRepository, AtomicLong targetIdGen,
                                       String requester, double amount, EscalationStrategyType escalationStrategyType) {
        List<ApproverRole> roles = chainFactory.resolveRequiredRoles(amount);
        List<ApprovalStep> steps = roles.stream().map(ApprovalStep::new).collect(Collectors.toList());
        WorkflowInstance instance = new WorkflowInstance(
                "WF-" + targetIdGen.getAndIncrement(), requester, amount, escalationStrategyType, steps);
        targetRepository.save(instance);
        return instance;
    }

    private WorkflowInstance doApprove(WorkflowRepository targetRepository, String id, String approverId, ApproverRole role) {
        WorkflowInstance instance = targetRepository.get(id);
        instance.getLock().lock();
        try {
            requirePending(instance, id);
            ApprovalStep step = instance.currentStep();
            requireStepPending(step, id);
            requireCorrectRole(step, role, approverId, id);

            step.setDecision(StepDecision.APPROVED);
            step.setApproverId(approverId);
            step.setDecidedAtEpoch(System.currentTimeMillis());

            if (instance.isLastStep()) {
                instance.transitionTo(WorkflowStatus.APPROVED);
            } else {
                instance.setCurrentStepIndex(instance.getCurrentStepIndex() + 1);
                if (instance.getStatus() != WorkflowStatus.IN_REVIEW) {
                    instance.transitionTo(WorkflowStatus.IN_REVIEW);
                }
            }
            return instance;
        } finally {
            instance.getLock().unlock();
        }
    }

    private WorkflowInstance doReject(WorkflowRepository targetRepository, String id, String approverId, ApproverRole role, String reason) {
        WorkflowInstance instance = targetRepository.get(id);
        instance.getLock().lock();
        try {
            requirePending(instance, id);
            ApprovalStep step = instance.currentStep();
            requireStepPending(step, id);
            requireCorrectRole(step, role, approverId, id);

            step.setDecision(StepDecision.REJECTED);
            step.setApproverId(approverId);
            step.setDecidedAtEpoch(System.currentTimeMillis());
            step.setReason(reason);
            instance.transitionTo(WorkflowStatus.REJECTED);
            return instance;
        } finally {
            instance.getLock().unlock();
        }
    }

    private WorkflowInstance doTriggerEscalation(WorkflowRepository targetRepository, String id, int stepIndex) {
        WorkflowInstance instance = targetRepository.get(id);
        instance.getLock().lock();
        try {
            requirePending(instance, id);
            requireStepStillCurrent(instance, stepIndex, id);
            ApprovalStep step = instance.currentStep();
            requireStepPending(step, id);

            EscalationStrategy strategy = escalationStrategyFactory.forType(instance.getEscalationStrategyType());
            strategy.escalate(instance);
            if (instance.getStatus() != WorkflowStatus.ESCALATED) {
                instance.transitionTo(WorkflowStatus.ESCALATED);
            }
            return instance;
        } finally {
            instance.getLock().unlock();
        }
    }

    private void requirePending(WorkflowInstance instance, String id) {
        if (instance.getStatus().isTerminal()) {
            throw new InvalidStepTransitionException("Workflow " + id + " is already " + instance.getStatus());
        }
    }

    /**
     * A timeout escalation is armed against a specific step at the moment it was scheduled. If
     * an approval (or an earlier escalation) already moved the instance past that step by the
     * time this escalation acquires the lock, the escalation is stale -- routing has already
     * moved on -- and must be rejected rather than silently acting on whatever step is current
     * now. This is what keeps the approve-vs-escalate race exclusive on a single step: re-checked
     * inside the lock, never assumed from outside it.
     */
    private void requireStepStillCurrent(WorkflowInstance instance, int stepIndex, String id) {
        if (instance.getCurrentStepIndex() != stepIndex) {
            throw new InvalidStepTransitionException(
                    "Workflow " + id + "'s step " + stepIndex + " is no longer the current step -- routing already moved on");
        }
    }

    private void requireStepPending(ApprovalStep step, String id) {
        if (step.getDecision() != StepDecision.PENDING) {
            throw new InvalidStepTransitionException("The current step for workflow " + id + " is not pending -- it is already " + step.getDecision());
        }
    }

    private void requireCorrectRole(ApprovalStep step, ApproverRole role, String approverId, String id) {
        if (step.getRole() != role) {
            throw new UnauthorizedApproverException(
                    "Workflow " + id + "'s current step requires " + step.getRole() + ", but " + approverId + " acted as " + role);
        }
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE
    // =========================================================================

    public final synchronized void initSimState() {
        simRepository.reset();
        simEventLog.clear();
        logSimEvent("SIM_RESET", "System", "Sandbox reset -- no workflow instances", null);
    }

    public Map<String, Object> simSubmit(String requester, double amount, EscalationStrategyType escalationStrategyType) {
        WorkflowInstance instance = doSubmit(simRepository, simIdGen, requester, amount, escalationStrategyType);
        logSimEvent("SUBMITTED", "System", String.format(
                "%s submitted $%.2f -- requires %s", instance.getId(), amount,
                instance.getSteps().stream().map(s -> s.getRole().toString()).collect(Collectors.joining(" -> "))), null);
        return getSimSnapshots();
    }

    public Map<String, Object> simApprove(String id, String approverId, ApproverRole role) {
        try {
            WorkflowInstance instance = doApprove(simRepository, id, approverId, role);
            logSimEvent("APPROVED_STEP", approverId, approverId + " (" + role + ") approved a step on " + id + " -- now " + instance.getStatus(), null);
        } catch (InvalidStepTransitionException | UnauthorizedApproverException e) {
            logSimEvent("APPROVE_REJECTED", approverId, "Approval by " + approverId + " on " + id + " failed: " + e.getMessage(), null);
        }
        return getSimSnapshots();
    }

    public Map<String, Object> simReject(String id, String approverId, ApproverRole role, String reason) {
        try {
            WorkflowInstance instance = doReject(simRepository, id, approverId, role, reason);
            logSimEvent("REJECTED", approverId, approverId + " (" + role + ") rejected " + id + ": " + reason, null);
        } catch (InvalidStepTransitionException | UnauthorizedApproverException e) {
            logSimEvent("REJECT_FAILED", approverId, "Rejection by " + approverId + " on " + id + " failed: " + e.getMessage(), null);
        }
        return getSimSnapshots();
    }

    /**
     * Live demonstration of the approve-vs-escalate race: one thread approves the current
     * pending step while another simultaneously triggers its timeout escalation. Not
     * {@code synchronized} -- a method-level lock here would serialize both callers before
     * either reached {@link WorkflowInstance#getLock()}, and the race this module exists to
     * demonstrate would never actually happen.
     */
    public Map<String, Object> simRace(String id, String approverId) throws InterruptedException {
        WorkflowInstance instance = simRepository.get(id);
        ApproverRole roleAtRaceStart = instance.currentStep().getRole();
        int stepIndexAtRaceStart = instance.getCurrentStepIndex();

        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(2);
        Map<String, Object> results = new HashMap<>();

        Thread approver = new Thread(() -> {
            try {
                startLatch.await();
                doApprove(simRepository, id, approverId, roleAtRaceStart);
                results.put("approve", "WON");
                logSimEvent("APPROVED_STEP", approverId, approverId + " won the race and approved the step", null);
            } catch (InvalidStepTransitionException | UnauthorizedApproverException e) {
                results.put("approve", "LOST: " + e.getMessage());
                logSimEvent("APPROVE_LOST_RACE", approverId, approverId + " lost the race: " + e.getMessage(), null);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                doneLatch.countDown();
            }
        });
        Thread escalator = new Thread(() -> {
            try {
                startLatch.await();
                doTriggerEscalation(simRepository, id, stepIndexAtRaceStart);
                results.put("escalate", "WON");
                logSimEvent("ESCALATED", "TimeoutMonitor", "TimeoutMonitor won the race and escalated the step", null);
            } catch (InvalidStepTransitionException e) {
                results.put("escalate", "LOST: " + e.getMessage());
                logSimEvent("ESCALATE_LOST_RACE", "TimeoutMonitor", "TimeoutMonitor lost the race: " + e.getMessage(), null);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                doneLatch.countDown();
            }
        });

        approver.start();
        escalator.start();
        startLatch.countDown();
        doneLatch.await();

        Map<String, Object> details = new HashMap<>(results);
        logSimEvent("RACE_COMPLETE", "System", String.format(
                "Approve-vs-escalate race on %s -- approve: %s, escalate: %s", id, results.get("approve"), results.get("escalate")), details);

        Map<String, Object> snapshot = getSimSnapshots();
        snapshot.put("raceResult", details);
        return snapshot;
    }

    public List<SimEvent> getSimEvents() {
        return simEventLog;
    }

    public Map<String, Object> getSimSnapshots() {
        Map<String, Object> res = new HashMap<>();
        res.put("workflows", simRepository.getAll());
        res.put("events", simEventLog);
        return res;
    }

    private void logSimEvent(String type, String actor, String desc, Map<String, Object> data) {
        String ts = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss.SSS"));
        SimEvent event = new SimEvent(simEventIdGen.getAndIncrement(), ts, type, actor, desc, data);
        simEventLog.add(event);
    }
}
