package com.lld.workflow.strategy;

import com.lld.workflow.model.WorkflowInstance;
import org.springframework.stereotype.Component;

/**
 * Flags the instance without changing routing at all — the current step stays {@code PENDING}
 * for its original approver. Genuinely different from {@link AutoEscalateStrategy}: it never
 * touches the step's decision, so a subsequent approval from the original approver still lands
 * normally, and racing it against a concurrent approval is NOT mutually exclusive by design (the
 * notification and the approval can both take effect) — unlike {@link AutoEscalateStrategy},
 * which contests the same step decision an approval would.
 */
@Component
public class NotifyOnlyStrategy implements EscalationStrategy {
    @Override
    public boolean escalate(WorkflowInstance instance) {
        return false;
    }
}
