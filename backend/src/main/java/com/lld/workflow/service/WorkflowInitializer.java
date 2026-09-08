package com.lld.workflow.service;

import com.lld.workflow.model.ApproverRole;
import com.lld.workflow.model.EscalationStrategyType;
import com.lld.workflow.model.WorkflowInstance;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/** Seeds a few realistic demo workflow instances so the UI shows something meaningful on first load. */
@Component
public class WorkflowInitializer implements CommandLineRunner {

    private final WorkflowService workflowService;

    public WorkflowInitializer(WorkflowService workflowService) {
        this.workflowService = workflowService;
    }

    @Override
    public void run(String... args) {
        // Small expense: Manager-only chain, awaiting the manager's decision.
        workflowService.submit("alice", 50.0, EscalationStrategyType.AUTO_ESCALATE);

        // Mid expense: Manager -> Director chain, manager already approved.
        WorkflowInstance midExpense = workflowService.submit("bob", 1500.0, EscalationStrategyType.NOTIFY_ONLY);
        workflowService.approve(midExpense.getId(), "manager-priya", ApproverRole.MANAGER);

        // Large expense: full Manager -> Director -> Finance chain, freshly submitted.
        workflowService.submit("carol", 7500.0, EscalationStrategyType.AUTO_ESCALATE);

        // Fully approved historical expense, for reference.
        WorkflowInstance approvedExpense = workflowService.submit("dave", 200.0, EscalationStrategyType.AUTO_ESCALATE);
        workflowService.approve(approvedExpense.getId(), "manager-priya", ApproverRole.MANAGER);
    }
}
